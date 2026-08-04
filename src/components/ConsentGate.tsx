import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { primaryButtonClass } from './FormFields'
import { supabase } from '../lib/supabase'

export const CONSENT_VERSION = '2026-08-mvp-1'

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [setupError, setSetupError] = useState(false)

  useEffect(() => {
    if (!user || !supabase) return
    void supabase.from('user_consents').select('id').eq('user_id', user.id).eq('consent_version', CONSENT_VERSION).maybeSingle()
      .then(({ data, error }) => {
        setAccepted(Boolean(data))
        setSetupError(Boolean(error))
        setLoading(false)
      })
  }, [user])

  const accept = async () => {
    if (!user || !supabase) return
    setSaving(true)
    const { error } = await supabase.from('user_consents').insert({
      user_id: user.id,
      consent_version: CONSENT_VERSION,
    })
    setSaving(false)
    if (error) toast.error('Consent could not be saved. Apply the EchoTrace migration first.')
    else {
      setAccepted(true)
      navigate('/dashboard/reconstruct', { replace: true })
    }
  }

  if (loading) return <div className="grid min-h-[50vh] place-items-center text-body-s text-ink/55">Checking privacy consent…</div>
  if (setupError) return (
    <div className="mx-auto mt-16 max-w-xl border border-amber-300 bg-amber-50 p-7 text-amber-950">
      <h1 className="text-2xl font-semibold">Database setup required</h1>
      <p className="mt-3 text-body-s leading-relaxed">Your account is secure, but the private EchoTrace tables have not been created in this Supabase project. Apply the idempotent migration in <code>supabase/migrations/202608030001_echotrace_mvp.sql</code>, then refresh.</p>
    </div>
  )
  if (!accepted) return (
    <div className="mx-auto mt-12 max-w-2xl border border-ink/10 bg-white p-7 shadow-sm md:p-10">
      <p className="text-label uppercase text-gold">Before you begin</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Your history, under your control.</h1>
      <ul className="mt-7 space-y-4 text-body-m text-ink/70">
        <li>EchoTrace is only for reconstructing your own digital history.</li>
        <li>Public-source results can be incomplete or wrong; you make every final decision.</li>
        <li>Every saved match keeps its original source and retrieval date.</li>
        <li>You can correct, export, reject, or permanently delete your records.</li>
        <li>EchoTrace does not authorize surveillance, harassment, people-search, or background checks.</li>
      </ul>
      <button type="button" onClick={accept} disabled={saving} className={`${primaryButtonClass} mt-8`}>{saving ? 'Recording consent…' : 'I understand and agree'}</button>
      <p className="mt-4 text-micro text-ink/45">Consent version {CONSENT_VERSION}</p>
    </div>
  )
  return children
}
