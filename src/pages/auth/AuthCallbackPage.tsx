import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    const client = supabase
    const run = async () => {
      const code = new URL(window.location.href).searchParams.get('code')
      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code)
        if (exchangeError) return setError('This verification link is invalid or expired.')
      }
      const pendingPlan = window.localStorage.getItem('echotrace_pending_plan')
      navigate(pendingPlan === 'recovery' || pendingPlan === 'vault' ? `/billing/complete?plan=${pendingPlan}` : '/dashboard', { replace: true })
    }
    void run()
  }, [navigate])

  return (
    <main className="grid min-h-screen place-items-center bg-bone px-5">
      <div className="text-center">
        {error ? <><h1 className="text-3xl font-semibold">Verification failed</h1><p className="mt-3 text-ink/60">{error}</p><Link to="/login" className="mt-5 inline-block underline">Return to sign in</Link></> : <><div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /><p>Verifying your secure link…</p></>}
      </div>
    </main>
  )
}
