import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { AuthShell } from '../../components/AuthShell'
import { Field, inputClass, primaryButtonClass } from '../../components/FormFields'

export function ResetPasswordPage() {
  const { updatePassword, configured } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The passwords do not match.')
    setSaving(true)
    const result = await updatePassword(password)
    setSaving(false)
    if (result.error) setError(result.error)
    else navigate('/dashboard', { replace: true })
  }

  return (
    <AuthShell eyebrow="Secure reset" title="Choose a new password" description="This link is time-limited for your protection.">
      <form onSubmit={submit} className="space-y-5">
        <Field label="New password" htmlFor="password"><input id="password" type="password" required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></Field>
        <Field label="Confirm password" htmlFor="confirm"><input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={inputClass} /></Field>
        {error && <p className="text-body-s text-red-700" role="alert">{error}</p>}
        <button type="submit" disabled={saving || !configured} className={`${primaryButtonClass} w-full`}>{saving ? 'Updating…' : 'Update password'}</button>
      </form>
    </AuthShell>
  )
}
