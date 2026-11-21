import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useBilling } from '../billing/BillingContext'
import { PlanButton } from '../billing/PlanButton'
import { primaryButtonClass } from '../components/FormFields'
import { supabase } from '../lib/supabase'

export function BillingCompletePage() {
  const [params] = useSearchParams()
  const { plan, refresh } = useBilling()
  const [message, setMessage] = useState('Confirming your secure payment…')
  const requestedPlan = params.get('plan')
  // A plan chosen before sign-up still has to go through the purchase-terms
  // consent step; create-checkout rejects requests without consentedAt.
  const pendingPlan = !params.get('session_id') && (requestedPlan === 'recovery' || requestedPlan === 'vault') ? requestedPlan : null

  useEffect(() => {
    const requested = params.get('plan')
    const sessionId = params.get('session_id')
    if (!sessionId && (requested === 'recovery' || requested === 'vault')) {
      window.localStorage.removeItem('echotrace_pending_plan')
      setMessage(requested === 'vault' ? 'Continue to your Vault plan' : 'Continue to your Recovery purchase')
      return
    }
    if (!sessionId) { setMessage('No payment was found.'); return }

    const confirm = async () => {
      if (!supabase) return
      const { error } = await supabase.functions.invoke('confirm-checkout', { method: 'POST', body: { session_id: sessionId } })
      if (error) return
      await refresh()
    }
    void confirm()
    let attempts = 0
    const poll = async () => {
      attempts += 1
      await refresh()
      if (attempts >= 10) setMessage('Payment was received. Your access may take another moment to update.')
    }
    void poll()
    const timer = window.setInterval(() => { if (attempts >= 10) window.clearInterval(timer); else void poll() }, 1500)
    return () => window.clearInterval(timer)
  }, [params, refresh])

  useEffect(() => {
    if (plan !== 'free' && params.get('session_id')) setMessage(`${plan === 'vault' ? 'Vault' : 'Recovery'} is now active.`)
  }, [params, plan])

  return <main className="grid min-h-screen place-items-center bg-bone px-5"><div className="max-w-lg border border-ink/10 bg-white p-8 text-center"><p className="text-label uppercase text-gold">Secure billing</p><h1 className="mt-3 text-3xl font-semibold">{message}</h1><p className="mt-4 text-body-s text-ink/60">Access is granted only after EchoTrace verifies Stripe’s signed payment confirmation.</p>{pendingPlan && <PlanButton plan={pendingPlan} className={`${primaryButtonClass} mt-7`}>Review terms and continue</PlanButton>}<Link to="/dashboard" className="mt-7 inline-flex rounded-pill bg-ink px-6 py-3 text-body-s font-semibold text-bone">Go to dashboard</Link></div></main>
}
