import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Stripe from 'npm:stripe@22.5.0'
import { adminClient, assertRequest, authenticatedUser, corsHeaders, HttpError, json } from '../_shared/billing.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  try {
    assertRequest(request)
    const user = await authenticatedUser(request)
    const { data } = await adminClient().from('billing_entitlements').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
    if (!data?.stripe_customer_id) throw new HttpError(404, 'No billing account was found.')
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://echo-trace-eight.vercel.app'
    const portal = await stripe.billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${siteUrl}/dashboard/settings` })
    return json(request, 200, { url: portal.url })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    console.error('create-billing-portal failed', error instanceof Error ? error.message : 'Unknown error')
    return json(request, status, { error: error instanceof HttpError ? error.message : 'Billing settings could not be opened.' })
  }
})
