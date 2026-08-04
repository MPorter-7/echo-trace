import { useState } from 'react'
import { Archive, Fingerprint, LayoutDashboard, LogOut, MailSearch, Menu, ScanSearch, SearchCheck, Settings, Waypoints, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { ConsentGate } from '../components/ConsentGate'

const links = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/reconstruct', label: 'Start Reconstruction', icon: ScanSearch },
  { to: '/dashboard/email-history', label: 'Email History Upload', icon: MailSearch },
  { to: '/dashboard/identifiers', label: 'My Identifiers', icon: Fingerprint },
  { to: '/dashboard/timeline', label: 'Timeline', icon: Waypoints },
  { to: '/dashboard/matches', label: 'Possible Matches', icon: SearchCheck },
  { to: '/dashboard/archive', label: 'Personal Archive', icon: Archive },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const logout = async () => {
    const result = await signOut()
    if (result.error) toast.error(result.error)
    else navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-mist text-ink">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:bg-white focus:p-3">Skip to content</a>
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-bone/10 bg-charcoal px-5 text-bone lg:hidden">
        <span className="text-xl font-semibold">EchoTrace</span>
        <button type="button" onClick={() => setOpen(!open)} className="p-2" aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? <X /> : <Menu />}</button>
      </header>
      <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-charcoal text-bone transition-transform lg:translate-x-0`}>
        <div className="border-b border-bone/10 px-7 py-7">
          <NavLink to="/" className="text-2xl font-semibold tracking-tight">EchoTrace</NavLink>
          <p className="mt-1 text-micro uppercase tracking-widest text-gold">Private archive</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Dashboard">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded px-4 py-3 text-body-s transition ${isActive ? 'bg-bone text-ink' : 'text-bone/65 hover:bg-bone/10 hover:text-bone'}`}>
              <Icon size={18} aria-hidden="true" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-bone/10 p-4">
          <p className="truncate px-4 pb-3 text-micro text-bone/45">{user?.email}</p>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded px-4 py-3 text-left text-body-s text-bone/65 hover:bg-bone/10 hover:text-bone"><LogOut size={18} />Sign out</button>
        </div>
      </aside>
      {open && <button type="button" aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={() => setOpen(false)} />}
      <main id="dashboard-content" className="min-h-screen pt-16 lg:ml-72 lg:pt-0">
        <ConsentGate>
          <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10 lg:px-12"><Outlet /></div>
        </ConsentGate>
      </main>
    </div>
  )
}
