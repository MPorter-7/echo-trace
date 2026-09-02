import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Stripe from 'npm:stripe@22.5.0'
import { adminClient, assertRequest, authenticatedUser, corsHeaders, HttpError, json } from '../_shared/billing.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')

function checkoutErrorMessage(error: unknown) {
  if (error instanceof HttpError) return error.message
  if (!(error instanceof Error)) return 'Checkout could not be started.'

  // Stripe's raw message can contain account-specific object IDs. Return only
  // a short, actionable diagnostic that is safe to show to the signed-in user.
  const message = error.message.toLowerCase()
  if (message.includes('invalid api key') || message.includes('api key provided')) {
    return 'Stripe rejected the saved secret key. In Supabase, replace STRIPE_SECRET_KEY with your Stripe Test-mode key (sk_test_…).'
  }
  if (message.includes('no such price') || message.includes('price') && message.includes('does not exist')) {
    return 'Stripe cannot find this plan price. Make sure the Stripe secret key and this plan’s Price ID are both from Test mode.'
  }
  if (message.includes('test mode') || message.includes('live mode')) {
    return 'Stripe Test mode and Live mode are mixed. Use a Stripe Test-mode secret key with Test-mode Price IDs.'
  }
  if (message.includes('not activated') || message.includes('capabilities')) {
    return 'Stripe cannot accept payments for this account yet. Finish the required Stripe account activation steps.'
  }
  return 'Stripe could not start checkout. Check the Stripe account setup and try again.'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  try {
    assertRequest(request)
    const user = await authenticatedUser(request)
    const { plan } = await request.json() as { plan?: string }
    if (plan !== 'recovery' && plan !== 'vault') throw new HttpError(400, 'Choose a valid plan.')

    const priceId = Deno.env.get(plan === 'recovery' ? 'STRIPE_RECOVERY_PRICE_ID' : 'STRIPE_VAULT_PRICE_ID')
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://echo-trace.com'
    if (!priceId || !Deno.env.get('STRIPE_SECRET_KEY')) throw new HttpError(500, 'Billing is not configured.')

    const admin = adminClient()
    const { data: billing } = await admin.from('billing_entitlements').select('stripe_customer_id,recovery_owned,subscription_status').eq('user_id', user.id).maybeSingle()
    if (plan === 'recovery' && billing?.recovery_owned) throw new HttpError(409, 'Recovery is already unlocked.')
    if (plan === 'vault' && ['active', 'trialing'].includes(billing?.subscription_status ?? '')) throw new HttpError(409, 'Vault is already active.')

    let customerId = billing?.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })
      customerId = customer.id
      const { error } = await admin.from('billing_entitlements').upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: 'user_id' })
      if (error) throw new HttpError(500, 'Billing profile could not be created.')
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: plan === 'vault' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/billing/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#pricing`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, plan },
      ...(plan === 'vault' ? { subscription_data: { metadata: { supabase_user_id: user.id, plan } } } : {}),
    })
    if (!session.url) throw new HttpError(500, 'Checkout could not be created.')
    return json(request, 200, { url: session.url })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const stripeError = error as { type?: unknown; code?: unknown; requestId?: unknown }
    console.error('create-checkout failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: typeof stripeError.type === 'string' ? stripeError.type : undefined,
      code: typeof stripeError.code === 'string' ? stripeError.code : undefined,
      requestId: typeof stripeError.requestId === 'string' ? stripeError.requestId : undefined,
    })
    return json(request, status, { error: checkoutErrorMessage(error) })
  }
})
