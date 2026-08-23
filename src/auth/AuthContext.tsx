import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

interface AuthResult {
  error: string | null
  emailConfirmationRequired?: boolean
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  configured: boolean
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<AuthResult>
  sendPasswordReset: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login')) return 'The email or password is incorrect.'
  if (normalized.includes('email not confirmed')) return 'Verify your email before signing in.'
  if (normalized.includes('already registered')) return 'An account already exists for this email.'
  if (normalized.includes('password')) return 'Use a password with at least 8 characters.'
  if (normalized.includes('rate limit')) return 'Too many attempts. Wait a moment and try again.'
  return 'We could not complete that request. Check your connection and try again.'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    // Resolve the initial session from storage before allowing protected
    // routes to redirect. INITIAL_SESSION is emitted asynchronously by
    // Supabase and must not race the initial getSession() result.
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return
      // Only a real SIGNED_OUT event should clear an established session.
      // Other auth events can legitimately provide a null session during
      // initialization and should not make protected navigation log out.
      if (event === 'SIGNED_OUT') setSession(null)
      else if (nextSession) setSession(nextSession)
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { display_name: displayName.trim() },
      },
    })
    return error
      ? { error: friendlyAuthError(error.message) }
      : { error: null, emailConfirmationRequired: !data.session }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? friendlyAuthError(error.message) : null }
  }, [])

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: null }
    const { error } = await supabase.auth.signOut()
    return { error: error ? friendlyAuthError(error.message) : null }
  }, [])

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error ? friendlyAuthError(error.message) : null }
  }, [])

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? friendlyAuthError(error.message) : null }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    configured: Boolean(supabase),
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
  }), [loading, sendPasswordReset, session, signIn, signOut, signUp, updatePassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
