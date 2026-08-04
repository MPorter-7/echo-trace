import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthContext'

export function getAuthRedirect(authenticated: boolean, path: string) {
  if (authenticated && ['/login', '/signup', '/forgot-password'].includes(path)) return '/dashboard'
  if (!authenticated && path.startsWith('/dashboard')) return '/login'
  return null
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-bone" role="status" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        <p className="text-body-s text-ink/60">Opening your private archive…</p>
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
