import { ArrowRight, Fingerprint, History, SearchCheck, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { PageHeader } from '../../components/DashboardUI'
import { reconstructionProgress } from '../../lib/reconstruction'
import { supabase } from '../../lib/supabase'
import type { TimelineEvent } from '../../types/echo'

interface Counts { identifiers: number; events: number; pending: number; matches: number; accepted: number; archiveFiles: number }

export function DashboardHome() {
  const { user } = useAuth()
  const [counts, setCounts] = useState<Counts>({ identifiers: 0, events: 0, pending: 0, matches: 0, accepted: 0, archiveFiles: 0 })
  const [recent, setRecent] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase
    const load = async () => {
      const [identifiers, events, pending, matches, accepted, archiveFiles, recentEvents] = await Promise.all([
        client.from('identifiers').select('*', { count: 'exact', head: true }),
        client.from('timeline_events').select('*', { count: 'exact', head: true }),
        client.from('possible_matches').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        client.from('possible_matches').select('*', { count: 'exact', head: true }),
        client.from('possible_matches').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        client.from('archive_files').select('*', { count: 'exact', head: true }),
        client.from('timeline_events').select('*').order('created_at', { ascending: false }).limit(5),
      ])
      setCounts({ identifiers: identifiers.count ?? 0, events: events.count ?? 0, pending: pending.count ?? 0, matches: matches.count ?? 0, accepted: accepted.count ?? 0, archiveFiles: archiveFiles.count ?? 0 })
      setRecent((recentEvents.data ?? []) as TimelineEvent[])
      setLoading(false)
    }
    void load()
  }, [user])

  const progress = reconstructionProgress({ identifiers: counts.identifiers, archiveFiles: counts.archiveFiles, matches: counts.matches }, counts.identifiers > 0)
  const cards = [
    { label: 'Identifiers', value: counts.identifiers, icon: Fingerprint, to: '/dashboard/identifiers' },
    { label: 'Timeline events', value: counts.events, icon: History, to: '/dashboard/timeline' },
    { label: 'Pending matches', value: counts.pending, icon: SearchCheck, to: '/dashboard/matches' },
    { label: 'Accepted matches', value: counts.accepted, icon: ShieldCheck, to: '/dashboard/matches' },
  ]

  return (
    <>
      <PageHeader eyebrow="Private workspace" title="Recovery overview" description="A calm, sourced view of the history you have chosen to reconstruct." action={<Link to="/dashboard/reconstruct" className="rounded-pill bg-ink px-6 py-3 text-body-s font-medium text-bone hover:bg-gold hover:text-ink">Start reconstruction</Link>} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Recovery statistics">
        {cards.map(({ label, value, icon: Icon, to }) => <Link key={label} to={to} className="border border-ink/10 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><Icon size={20} className="text-gold" /><ArrowRight size={16} className="text-ink/30" /></div><p className="mt-8 text-4xl font-semibold">{loading ? '—' : value}</p><p className="mt-1 text-body-s text-ink/55">{label}</p></Link>)}
      </section>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <section className="border border-ink/10 bg-charcoal p-7 text-bone">
          <p className="text-label uppercase text-gold">Recovery progress</p>
          <p className="mt-5 text-5xl font-semibold">{loading ? '—' : `${progress}%`}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-bone/10"><div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-5 text-body-s text-bone/60">Progress reflects records you add and review—not a claim that the internet contains a complete history.</p>
        </section>
        <section className="border border-ink/10 bg-white p-7">
          <div className="flex items-center justify-between"><div><p className="text-label uppercase text-gold">Recently added</p><h2 className="mt-2 text-2xl font-semibold">Your latest history</h2></div><Link to="/dashboard/timeline" className="text-body-s underline decoration-gold underline-offset-4">View all</Link></div>
          {recent.length ? <ul className="mt-6 divide-y divide-ink/10">{recent.map((event) => <li key={event.id} className="py-4"><p className="font-medium">{event.title}</p><p className="mt-1 text-body-s text-ink/50">{event.platform || 'Personal memory'} · {event.event_date || event.approximate_year || 'Date unknown'}</p></li>)}</ul> : <div className="mt-7 border border-dashed border-ink/15 p-8 text-center"><p className="text-body-s text-ink/55">No reconstructed history yet. Begin with your verified signup email and evidence you already own.</p><Link to="/dashboard/reconstruct" className="mt-4 inline-block text-body-s font-medium underline decoration-gold underline-offset-4">Start reconstruction</Link><span className="mx-2 text-ink/25">·</span><Link to="/dashboard/timeline" className="text-body-s text-ink/45 underline underline-offset-4">Add a memory (optional)</Link></div>}
        </section>
      </div>
    </>
  )
}
