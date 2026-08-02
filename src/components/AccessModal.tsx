import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

interface AccessModalProps {
  open: boolean
  onClose: () => void
}

const STORAGE_KEY = 'echotrace_waitlist'

export function AccessModal({ open, onClose }: AccessModalProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedPermanently, setSavedPermanently] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setError('Enter a valid email address.')
      return
    }

    setSaving(true)
    let permanent = false

    if (supabase) {
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({ email: normalized, source: 'website' })

      // A duplicate email is already safely registered.
      if (!insertError || insertError.code === '23505') {
        permanent = true
      }
    }

    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[]
    if (!existing.includes(normalized)) localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, normalized]))

    setSaving(false)
    setSavedPermanently(permanent)
    setError('')
    setSubmitted(true)
  }

  const close = () => {
    setEmail('')
    setError('')
    setSubmitted(false)
    setSaving(false)
    setSavedPermanently(false)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-ink/45 px-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-title"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div className="relative w-full max-w-lg border border-ink/15 bg-bone p-8 shadow-2xl md:p-12">
        <button
          type="button"
          onClick={close}
          className="absolute right-5 top-5 text-2xl leading-none text-ink/60 hover:text-ink"
          aria-label="Close"
        >
          ×
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <p className="mb-3 text-label uppercase text-gold">You’re on the list</p>
            <h2 id="access-title" className="mb-4 text-4xl font-semibold text-ink">Welcome to EchoTrace.</h2>
            <p className="mb-8 text-body-m text-ink/65">
              {savedPermanently
                ? 'Your request is permanently registered for early access.'
                : 'Your request is saved on this device. Permanent registration will activate when the site is connected to Supabase.'}
            </p>
            <button onClick={close} className="rounded-pill bg-ink px-7 py-3 text-body-s font-medium text-bone">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-label uppercase text-gold">Early access</p>
            <h2 id="access-title" className="mb-4 text-4xl font-semibold text-ink">Reclaim your digital history.</h2>
            <p className="mb-8 text-body-m text-ink/65">
              Join the EchoTrace waitlist for product updates and private beta access.
            </p>
            <form onSubmit={submit} noValidate>
              <label htmlFor="access-email" className="mb-2 block text-body-s font-medium text-ink">Email address</label>
              <input
                id="access-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoFocus
                className="w-full border border-ink/25 bg-white px-4 py-3.5 text-body-m text-ink outline-none transition focus:border-gold"
              />
              {error && <p className="mt-2 text-body-s text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="mt-5 w-full rounded-pill bg-ink px-7 py-3.5 text-body-s font-medium text-bone transition hover:bg-gold hover:text-ink disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Request Access'}
              </button>
              <p className="mt-4 text-center text-micro uppercase text-ink/45">No spam. No data selling. Ever.</p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
