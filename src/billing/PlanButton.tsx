import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { useBilling, type BillingPlan } from './BillingContext'

export function PlanButton({ plan, children, className }: { plan: BillingPlan; children: React.ReactNode; className: string }) {
  const { user } = useAuth()
  const { startCheckout } = useBilling()
  const navigate = useNavigate()
  const [working, setWorking] = useState(false)

  const choose = async () => {
    if (plan === 'free') { navigate(user ? '/dashboard' : '/signup'); return }
    if (!user) {
      window.localStorage.setItem('echotrace_pending_plan', plan)
      navigate(`/signup?plan=${plan}`)
      return
    }
    setWorking(true)
    try { window.location.assign(await startCheckout(plan)) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Checkout could not be started.'); setWorking(false) }
  }

  return <button type="button" onClick={() => void choose()} disabled={working} className={className}>{working ? 'Opening secure checkout…' : children}</button>
}
