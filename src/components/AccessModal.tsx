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
      className="fixed inset-0 z-[300] flex items-center justify-center bg-midnight/70 px-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-title"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-night-border bg-night-raised p-8 text-slate-100 shadow-2xl md:p-12">
        <button
          type="button"
          onClick={close}
          className="absolute right-5 top-5 text-2xl leading-none text-slate-400 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <p className="mb-3 text-label uppercase text-cyan-300">You’re on the list</p>
            <h2 id="access-title" className="mb-4 text-4xl font-semibold text-white">Welcome to EchoTrace.</h2>
            <p className="mb-8 text-body-m text-slate-400">
              {savedPermanently
                ? 'Your request is permanently registered for early access.'
                : 'Your request is saved on this device. Permanent registration will activate when the site is connected to Supabase.'}
            </p>
            <button onClick={close} className="rounded-pill bg-cyan-300 px-7 py-3 text-body-s font-semibold text-midnight hover:bg-cyan-200">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-label uppercase text-cyan-300">Email waitlist</p>
            <h2 id="access-title" className="mb-4 text-4xl font-semibold text-white">Get EchoTrace updates.</h2>
            <p className="mb-8 text-body-m text-slate-400">
              Join the waitlist for product updates and early access. You can also create your workspace right now.
            </p>
            <form onSubmit={submit} noValidate>
              <label htmlFor="access-email" className="mb-2 block text-body-s font-medium text-slate-200">Email address</label>
              <input
                id="access-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoFocus
                className="w-full rounded-lg border border-night-border bg-midnight/60 px-4 py-3.5 text-body-m text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
              />
              {error && <p className="mt-2 text-body-s text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="mt-5 w-full rounded-pill bg-cyan-300 px-7 py-3.5 text-body-s font-semibold text-midnight transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Join the waitlist'}
              </button>
              <p className="mt-4 text-center text-micro uppercase text-slate-500">No spam. No data selling. Ever.</p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
