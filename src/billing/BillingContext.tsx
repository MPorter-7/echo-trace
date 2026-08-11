import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'

export type BillingPlan = 'free' | 'recovery' | 'vault'

interface BillingRow {
  recovery_owned: boolean
  subscription_status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
}

interface BillingContextValue {
  plan: BillingPlan
  billing: BillingRow | null
  loading: boolean
  refresh: () => Promise<void>
  startCheckout: (plan: Exclude<BillingPlan, 'free'>) => Promise<string>
  openPortal: () => Promise<string>
}

const BillingContext = createContext<BillingContextValue | null>(null)

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [billing, setBilling] = useState<BillingRow | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!supabase || !user) { setBilling(null); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('billing_entitlements').select('recovery_owned,subscription_status,current_period_end,cancel_at_period_end,stripe_customer_id').maybeSingle()
    setBilling((data as BillingRow | null) ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => { void refresh() }, [refresh])

  const invoke = useCallback(async (name: string, body?: Record<string, unknown>) => {
    if (!supabase) throw new Error('Payments are not configured.')
    const { data, error } = await supabase.functions.invoke(name, { method: 'POST', body })
    if (error) throw new Error((data as { error?: string } | null)?.error ?? 'The billing request failed.')
    const url = (data as { url?: string } | null)?.url
    if (!url) throw new Error('The billing page could not be opened.')
    return url
  }, [])

  const startCheckout = useCallback((plan: 'recovery' | 'vault') => invoke('create-checkout', { plan }), [invoke])
  const openPortal = useCallback(() => invoke('create-billing-portal'), [invoke])
  const plan: BillingPlan = ['active', 'trialing'].includes(billing?.subscription_status ?? '') ? 'vault' : billing?.recovery_owned ? 'recovery' : 'free'
  const value = useMemo(() => ({ plan, billing, loading, refresh, startCheckout, openPortal }), [billing, loading, openPortal, plan, refresh, startCheckout])
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

export function useBilling() {
  const value = useContext(BillingContext)
  if (!value) throw new Error('useBilling must be used inside BillingProvider')
  return value
}
