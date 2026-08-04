import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { AuthShell } from '../../components/AuthShell'
import { Field, inputClass, primaryButtonClass } from '../../components/FormFields'
import { validateDisplayName } from '../../lib/validation'

export function SignupPage() {
  const { signUp, configured } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const nameValidation = validateDisplayName(form.name)
    if (!nameValidation.valid) return setError(nameValidation.error ?? 'Enter a valid display name.')
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.')
    if (form.password !== form.confirm) return setError('The passwords do not match.')
    setSaving(true)
    const result = await signUp(form.email.trim().toLowerCase(), form.password, nameValidation.normalized ?? '')
    setSaving(false)
    if (result.error) setError(result.error)
    else if (result.emailConfirmationRequired) setMessage('Check your email and use the verification link to activate your account.')
    else navigate('/dashboard', { replace: true })
  }

  return (
    <AuthShell eyebrow="Private recovery" title="Create account" description="Only reconstruct history that belongs to you.">
      {message ? (
        <div className="border border-emerald-200 bg-emerald-50 p-5 text-body-s text-emerald-900" role="status">
          <strong className="block text-body-m">Verification email sent</strong>
          <span className="mt-1 block">{message}</span>
          <Link to="/login" className="mt-4 inline-block font-medium underline">Return to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Field label="Display name" htmlFor="name" hint="120 characters maximum"><input id="name" required maxLength={120} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>
          <Field label="Email address" htmlFor="email" hint="After verification, this automatically becomes your first private reconstruction clue."><input id="email" type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} /></Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters"><input id="password" type="password" required autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={inputClass} /></Field>
          <Field label="Confirm password" htmlFor="confirm"><input id="confirm" type="password" required autoComplete="new-password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} className={inputClass} /></Field>
          <label className="flex gap-3 text-body-s leading-relaxed text-ink/65">
            <input type="checkbox" required className="mt-1 h-4 w-4 accent-ink" />
            <span>I will use EchoTrace only to reconstruct my own history and agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Notice</Link>.</span>
          </label>
          {error && <p className="border border-red-200 bg-red-50 p-3 text-body-s text-red-800" role="alert">{error}</p>}
          <button type="submit" disabled={saving || !configured} className={`${primaryButtonClass} w-full`}>{saving ? 'Creating account…' : 'Create private account'}</button>
        </form>
      )}
      <p className="mt-8 border-t border-ink/10 pt-6 text-body-s text-ink/60">Already registered? <Link to="/login" className="font-medium text-ink underline decoration-gold underline-offset-4">Sign in</Link></p>
    </AuthShell>
  )
}
