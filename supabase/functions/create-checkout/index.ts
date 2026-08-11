import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Stripe from 'npm:stripe@22.5.0'
import { adminClient, assertRequest, authenticatedUser, corsHeaders, HttpError, json } from '../_shared/billing.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  try {
    assertRequest(request)
    const user = await authenticatedUser(request)
    const { plan } = await request.json() as { plan?: string }
    if (plan !== 'recovery' && plan !== 'vault') throw new HttpError(400, 'Choose a valid plan.')

    const priceId = Deno.env.get(plan === 'recovery' ? 'STRIPE_RECOVERY_PRICE_ID' : 'STRIPE_VAULT_PRICE_ID')
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://echo-trace-eight.vercel.app'
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
    console.error('create-checkout failed', error instanceof Error ? error.message : 'Unknown error')
    return json(request, status, { error: error instanceof HttpError ? error.message : 'Checkout could not be started.' })
  }
})
