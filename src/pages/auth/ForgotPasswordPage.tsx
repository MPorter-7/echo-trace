import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { AuthShell } from '../../components/AuthShell'
import { Field, inputClass, primaryButtonClass } from '../../components/FormFields'

export function ForgotPasswordPage() {
  const { sendPasswordReset, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    const result = await sendPasswordReset(email.trim().toLowerCase())
    setSaving(false)
    if (result.error) setError(result.error)
    else setSent(true)
  }

  return (
    <AuthShell eyebrow="Account recovery" title="Reset password" description="We will email you a secure password-reset link.">
      {sent ? <p className="border border-emerald-200 bg-emerald-50 p-5 text-body-s text-emerald-900">If an account exists for that email, a reset link is on its way.</p> : (
        <form onSubmit={submit} className="space-y-5">
          <Field label="Email address" htmlFor="email"><input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field>
          {error && <p className="text-body-s text-red-700" role="alert">{error}</p>}
          <button type="submit" disabled={saving || !configured} className={`${primaryButtonClass} w-full`}>{saving ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-block text-body-s underline decoration-gold underline-offset-4">Back to sign in</Link>
    </AuthShell>
  )
}
