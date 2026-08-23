import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthContext'
import { BillingProvider } from './billing/BillingContext'
import { Home } from './pages/Home'
import { ProtectedRoute, PublicOnlyRoute } from './auth/RouteGuards'

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then((module) => ({ default: module.SignupPage })))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage').then((module) => ({ default: module.AuthCallbackPage })))
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout').then((module) => ({ default: module.DashboardLayout })))
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome').then((module) => ({ default: module.DashboardHome })))
const AccountDiscoveryPage = lazy(() => import('./pages/dashboard/AccountDiscoveryPage').then((module) => ({ default: module.AccountDiscoveryPage })))
const ReconstructionPage = lazy(() => import('./pages/dashboard/ReconstructionPage').then((module) => ({ default: module.ReconstructionPage })))
const EmailHistoryPage = lazy(() => import('./pages/dashboard/EmailHistoryPage').then((module) => ({ default: module.EmailHistoryPage })))
const IdentifiersPage = lazy(() => import('./pages/dashboard/IdentifiersPage').then((module) => ({ default: module.IdentifiersPage })))
const TimelinePage = lazy(() => import('./pages/dashboard/TimelinePage').then((module) => ({ default: module.TimelinePage })))
const MatchesPage = lazy(() => import('./pages/dashboard/MatchesPage').then((module) => ({ default: module.MatchesPage })))
const ArchivePage = lazy(() => import('./pages/dashboard/ArchivePage').then((module) => ({ default: module.ArchivePage })))
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const PrivacyPage = lazy(() => import('./pages/LegalPages').then((module) => ({ default: module.PrivacyPage })))
const TermsPage = lazy(() => import('./pages/LegalPages').then((module) => ({ default: module.TermsPage })))
const BillingCompletePage = lazy(() => import('./pages/BillingCompletePage').then((module) => ({ default: module.BillingCompletePage })))

function RouteLoading() {
  return <div className="grid min-h-screen place-items-center bg-bone text-body-s text-ink/55" role="status">Loading EchoTrace…</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BillingProvider>
        <Suspense fallback={<RouteLoading />}><Routes>
          <Route path="/" element={<Home />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/billing/complete" element={<BillingCompletePage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="discover" element={<AccountDiscoveryPage />} />
              <Route path="reconstruct" element={<ReconstructionPage />} />
              <Route path="email-history" element={<EmailHistoryPage />} />
              <Route path="identifiers" element={<IdentifiersPage />} />
              <Route path="timeline" element={<TimelinePage />} />
              <Route path="matches" element={<MatchesPage />} />
              <Route path="archive" element={<ArchivePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></Suspense>
        <Toaster richColors position="top-right" closeButton />
        </BillingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
