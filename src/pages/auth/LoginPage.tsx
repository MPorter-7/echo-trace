import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AuthShell } from '../../components/AuthShell'
import { Field, inputClass, primaryButtonClass } from '../../components/FormFields'
import { useAuth } from '../../auth/AuthContext'

export function LoginPage() {
  const { signIn, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const result = await signIn(email.trim().toLowerCase(), password)
    setSaving(false)
    if (result.error) setError(result.error)
    else {
      const state = location.state as { from?: string } | null
      navigate(state?.from ?? '/dashboard', { replace: true })
    }
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in" description="Continue reconstructing your private digital history.">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email address" htmlFor="email">
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
        </Field>
        {error && <p className="border border-red-200 bg-red-50 p-3 text-body-s text-red-800" role="alert">{error}</p>}
        <div className="flex items-center justify-between gap-4">
          <Link to="/forgot-password" className="text-body-s text-ink/60 underline decoration-gold underline-offset-4">Forgot password?</Link>
          <button type="submit" disabled={saving || !configured} className={primaryButtonClass}>{saving ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </form>
      <p className="mt-8 border-t border-ink/10 pt-6 text-body-s text-ink/60">New to EchoTrace? <Link to="/signup" className="font-medium text-ink underline decoration-gold underline-offset-4">Create an account</Link></p>
    </AuthShell>
  )
}
