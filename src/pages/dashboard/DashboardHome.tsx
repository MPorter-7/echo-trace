import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { useBilling } from '../../billing/BillingContext'
import { PlanButton } from '../../billing/PlanButton'
import { PageHeader } from '../../components/DashboardUI'
import { RecoveryOptions } from '../../components/RecoveryOptions'
import { reconstructionProgress } from '../../lib/reconstruction'
import { supabase } from '../../lib/supabase'
import type { TimelineEvent } from '../../types/echo'

interface Counts { identifiers: number; events: number; pending: number; matches: number; accepted: number; archiveFiles: number; emailImports: number; emailFindings: number }

export function DashboardHome() {
  const { user } = useAuth()
  const { plan, loading: billingLoading } = useBilling()
  const [counts, setCounts] = useState<Counts>({ identifiers: 0, events: 0, pending: 0, matches: 0, accepted: 0, archiveFiles: 0, emailImports: 0, emailFindings: 0 })
  const [recent, setRecent] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase
    const load = async () => {
      const [identifiers, events, pending, matches, accepted, archiveFiles, emailImports, emailFindings, recentEvents] = await Promise.all([
        client.from('identifiers').select('*', { count: 'exact', head: true }),
        client.from('timeline_events').select('*', { count: 'exact', head: true }),
        client.from('possible_matches').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        client.from('possible_matches').select('*', { count: 'exact', head: true }),
        client.from('possible_matches').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        client.from('archive_files').select('*', { count: 'exact', head: true }),
        client.from('email_imports').select('*', { count: 'exact', head: true }),
        client.from('email_findings').select('*', { count: 'exact', head: true }),
        client.from('timeline_events').select('*').order('created_at', { ascending: false }).limit(5),
      ])
      setCounts({ identifiers: identifiers.count ?? 0, events: events.count ?? 0, pending: pending.count ?? 0, matches: matches.count ?? 0, accepted: accepted.count ?? 0, archiveFiles: archiveFiles.count ?? 0, emailImports: emailImports.count ?? 0, emailFindings: emailFindings.count ?? 0 })
      setRecent((recentEvents.data ?? []) as TimelineEvent[])
      setLoading(false)
    }
    void load()
  }, [user])

  const progress = reconstructionProgress({ identifiers: counts.identifiers, archiveFiles: counts.archiveFiles, matches: counts.matches, emailImports: counts.emailImports, emailFindings: counts.emailFindings }, counts.identifiers > 0)
  return (
    <>
      <PageHeader eyebrow="Your private workspace" title="Recover your history your way" description="Email is one option, not a requirement. Begin with an export, an old username, a file, a public source, or a memory." />
      <RecoveryOptions />
      {plan !== 'vault' && !billingLoading && <section className="mt-8 border border-gold/40 bg-[#fffaf0] p-7" aria-label="Upgrade your EchoTrace plan">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-label uppercase text-gold">Unlock more of your history</p>
            <h2 className="mt-2 text-3xl font-semibold">{plan === 'recovery' ? 'Keep your recovery protected in Vault.' : 'Ready for a complete recovery?'}</h2>
            <p className="mt-3 text-body-s text-ink/65">{plan === 'recovery' ? 'Vault includes your Recovery access plus expanded private storage for $7.99 per month.' : 'Choose Recovery for full access once, or Vault for full access with expanded private storage.'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {plan === 'free' && <PlanButton plan="recovery" className="rounded-pill border border-ink bg-white px-5 py-3 text-body-s font-medium text-ink hover:bg-ink hover:text-bone">Unlock Recovery — $19.99</PlanButton>}
            <PlanButton plan="vault" className="rounded-pill bg-ink px-5 py-3 text-body-s font-medium text-bone hover:bg-gold hover:text-ink">Get Vault — $7.99/month</PlanButton>
          </div>
        </div>
      </section>}
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.5fr]">
        <section className="border border-ink/10 bg-charcoal p-7 text-bone">
          <p className="text-label uppercase text-gold">Recovery progress</p>
          <p className="mt-5 text-5xl font-semibold">{loading ? '—' : `${progress}%`}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-bone/10"><div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-5 text-body-s text-bone/60">This is based only on the items you add and review. It does not claim to find your entire history.</p>
        </section>
        <section className="border border-ink/10 bg-white p-7">
          <div className="flex items-center justify-between"><div><p className="text-label uppercase text-gold">Recently added</p><h2 className="mt-2 text-2xl font-semibold">Your latest history</h2></div><Link to="/dashboard/timeline" className="text-body-s underline decoration-gold underline-offset-4">View all</Link></div>
          {recent.length ? <ul className="mt-6 divide-y divide-ink/10">{recent.map((event) => <li key={event.id} className="py-4"><p className="font-medium">{event.title}</p><p className="mt-1 text-body-s text-ink/50">{event.platform || 'Personal memory'} · {event.event_date || event.approximate_year || 'Date unknown'}</p></li>)}</ul> : <div className="mt-7 border border-dashed border-ink/15 p-8 text-center"><p className="text-body-s text-ink/55">Nothing has been saved yet. Start by finding your accounts.</p><Link to="/dashboard/email-history" className="mt-4 inline-block text-body-s font-medium underline decoration-gold underline-offset-4">Find my accounts</Link></div>}
        </section>
      </div>
    </>
  )
}
