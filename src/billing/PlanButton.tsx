import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { useBilling, type BillingPlan } from './BillingContext'

export function PlanButton({ plan, children, className }: { plan: BillingPlan; children: React.ReactNode; className: string }) {
  const { user } = useAuth()
  const { startCheckout } = useBilling()
  const navigate = useNavigate()
  const [working, setWorking] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [consent, setConsent] = useState(false)

  const choose = async () => {
    if (plan === 'free') { navigate(user ? '/dashboard' : '/signup'); return }
    if (!user) {
      window.localStorage.setItem('echotrace_pending_plan', plan)
      navigate(`/signup?plan=${plan}`)
      return
    }
    setConsent(false)
    setConfirmOpen(true)
  }

  const confirmCheckout = async () => {
    if (!consent) return
    setWorking(true)
    try {
      const consentedAt = new Date().toISOString()
      window.localStorage.setItem('echotrace_billing_consent_at', consentedAt)
      window.location.assign(await startCheckout(plan as 'recovery' | 'vault', consentedAt))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout could not be started.')
      setWorking(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => void choose()} disabled={working} className={className}>
        {working ? 'Opening secure checkout…' : children}
      </button>
      {confirmOpen && plan !== 'free' && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-5" role="dialog" aria-modal="true" aria-labelledby="checkout-consent-title">
          <div className="w-full max-w-lg border border-night-border bg-night-raised p-7 text-white shadow-2xl">
            <p className="text-label uppercase tracking-[0.16em] text-cyan-300">Before secure checkout</p>
            <h2 id="checkout-consent-title" className="mt-3 text-2xl font-semibold">
              {plan === 'vault' ? 'Vault is a recurring subscription' : 'Confirm your Recovery purchase'}
            </h2>
            <p className="mt-4 text-body-s leading-relaxed text-slate-300">
              {plan === 'vault'
                ? 'Vault costs $7.99 per month and renews automatically each month until you cancel. Cancellation stops future renewals; access normally continues through the period already paid.'
                : 'Recovery costs $19.99 as a one-time purchase.'}
            </p>
            <label className="mt-6 flex items-start gap-3 text-body-s leading-relaxed text-slate-300">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                I agree to the <Link to="/terms" target="_blank" className="text-cyan-300 underline underline-offset-4">Terms of Use</Link> and <Link to="/refunds" target="_blank" className="text-cyan-300 underline underline-offset-4">Refund &amp; Cancellation Policy</Link>, and I understand the purchase terms shown above.
              </span>
            </label>
            <div className="mt-7 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={working} className="rounded-pill border border-night-border px-5 py-3 text-body-s font-semibold text-slate-300 hover:border-slate-500">
                Go back
              </button>
              <button type="button" onClick={() => void confirmCheckout()} disabled={!consent || working} className="rounded-pill bg-cyan-300 px-5 py-3 text-body-s font-semibold text-midnight disabled:cursor-not-allowed disabled:opacity-50">
                {working ? 'Opening checkout…' : 'Continue to secure checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
