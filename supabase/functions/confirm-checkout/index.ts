import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Stripe from 'npm:stripe@22.5.0'
import { adminClient, assertRequest, authenticatedUser, corsHeaders, HttpError, json } from '../_shared/billing.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  try {
    assertRequest(request)
    const user = await authenticatedUser(request)
    const { session_id: sessionId } = await request.json() as { session_id?: string }
    if (!sessionId?.startsWith('cs_')) throw new HttpError(400, 'A valid checkout session is required.')

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const plan = session.metadata?.plan
    if (session.client_reference_id !== user.id || session.metadata?.supabase_user_id !== user.id) throw new HttpError(403, 'This payment does not belong to your account.')
    if (session.payment_status !== 'paid') throw new HttpError(409, 'Stripe has not confirmed this payment yet.')
    if (plan !== 'recovery' && plan !== 'vault') throw new HttpError(400, 'This checkout is missing its EchoTrace plan.')

    const update = plan === 'recovery'
      ? { recovery_owned: true, recovery_purchased_at: new Date().toISOString(), stripe_customer_id: String(session.customer) }
      : { stripe_customer_id: String(session.customer), stripe_subscription_id: String(session.subscription), subscription_status: 'active' }
    const { error } = await adminClient().from('billing_entitlements').upsert({ user_id: user.id, ...update }, { onConflict: 'user_id' })
    if (error) throw new HttpError(500, 'Your access could not be updated.')
    return json(request, 200, { plan })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    console.error('confirm-checkout failed', error instanceof Error ? error.message : 'Unknown error')
    return json(request, status, { error: error instanceof HttpError ? error.message : 'Payment could not be confirmed.' })
  }
})
