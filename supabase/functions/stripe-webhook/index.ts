import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Stripe from 'npm:stripe@22.5.0'
import { adminClient } from '../_shared/billing.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')
const cryptoProvider = Stripe.createSubtleCryptoProvider()

function subscriptionStatus(status: Stripe.Subscription.Status) {
  return status === 'canceled' ? 'canceled' : status
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const signature = request.headers.get('Stripe-Signature')
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!signature || !secret) return new Response('Webhook not configured', { status: 500 })

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret, undefined, cryptoProvider)
  } catch (error) {
    console.error('stripe-webhook signature failed', error instanceof Error ? error.message : 'Unknown error')
    return new Response('Invalid signature', { status: 400 })
  }

  const admin = adminClient()
  const { data: claimed, error: claimError } = await admin.from('stripe_webhook_events').insert({ event_id: event.id, event_type: event.type }).select('event_id').maybeSingle()
  if (claimError?.code === '23505') return Response.json({ received: true, duplicate: true })
  if (claimError || !claimed) return new Response('Event could not be claimed', { status: 500 })

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      if (!userId) throw new Error('Checkout is missing user metadata.')
      const update = session.metadata?.plan === 'recovery'
        ? { recovery_owned: true, recovery_purchased_at: new Date().toISOString(), stripe_customer_id: String(session.customer) }
        : { stripe_customer_id: String(session.customer), stripe_subscription_id: String(session.subscription), subscription_status: 'active' }
      const { error } = await admin.from('billing_entitlements').upsert({ user_id: userId, ...update }, { onConflict: 'user_id' })
      if (error) throw error
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id
      if (!userId) throw new Error('Subscription is missing user metadata.')
      const itemEnd = subscription.items.data.reduce<number | null>((latest, item) => latest === null || item.current_period_end > latest ? item.current_period_end : latest, null)
      const { error } = await admin.from('billing_entitlements').upsert({
        user_id: userId,
        stripe_customer_id: String(subscription.customer),
        stripe_subscription_id: subscription.id,
        subscription_status: subscriptionStatus(subscription.status),
        current_period_end: itemEnd ? new Date(itemEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
      }, { onConflict: 'user_id' })
      if (error) throw error
    }
    return Response.json({ received: true })
  } catch (error) {
    await admin.from('stripe_webhook_events').delete().eq('event_id', event.id)
    console.error('stripe-webhook processing failed', error instanceof Error ? error.message : 'Unknown error')
    return new Response('Webhook processing failed', { status: 500 })
  }
})
