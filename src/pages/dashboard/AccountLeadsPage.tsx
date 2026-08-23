import { ArrowUpRight, Check, CircleHelp, ExternalLink, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { PageHeader } from '../../components/DashboardUI'
import { inputClass, primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { supabase } from '../../lib/supabase'

type LeadStatus = 'possible' | 'likely' | 'not_mine'
interface Lead {
  id: string
  platform: string
  category: string
  identifier_value: string
  identifier_type: 'email' | 'username' | 'display_name'
  search_query: string
  status: LeadStatus
  confidence_score: number
  confidence_reason: string
  source_url: string | null
  notes: string | null
  created_at: string
}

const statusCopy: Record<LeadStatus, { label: string; className: string }> = {
  possible: { label: 'Possible', className: 'bg-amber-100 text-amber-900' },
  likely: { label: 'Likely', className: 'bg-emerald-100 text-emerald-800' },
  not_mine: { label: 'Not mine', className: 'bg-slate-100 text-slate-700' },
}

export function AccountLeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = async () => {
    if (!supabase || !user) return
    const { data, error } = await supabase.from('account_discovery_leads').select('*').order('confidence_score', { ascending: false }).order('created_at', { ascending: false })
    if (error) toast.error('Account leads could not be loaded.')
    else setLeads((data ?? []) as Lead[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [user])

  const visible = useMemo(() => leads.filter((lead) => (
    (filter === 'all' || lead.status === filter)
    && `${lead.platform} ${lead.category} ${lead.identifier_value}`.toLowerCase().includes(search.toLowerCase())
  )), [leads, filter, search])

  const setStatus = async (lead: Lead, status: LeadStatus) => {
    if (!supabase) return
    setSavingId(lead.id)
    const { error } = await supabase.from('account_discovery_leads').update({ status }).eq('id', lead.id)
    setSavingId(null)
    if (error) toast.error('The lead status could not be updated.')
    else {
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status } : item))
      toast.success(status === 'likely' ? 'Marked as likely.' : status === 'not_mine' ? 'Marked as not mine.' : 'Marked as possible.')
    }
  }

  const saveAsMatch = async (lead: Lead) => {
    if (!supabase || !user) return
    setSavingId(lead.id)
    const { error } = await supabase.from('possible_matches').insert({
      user_id: user.id,
      platform: lead.platform,
      result_title: `${lead.platform} account lead`,
      source_url: lead.source_url ?? `https://www.google.com/search?q=${encodeURIComponent(lead.search_query)}`,
      normalized_source_url: lead.source_url ?? `https://www.google.com/search?q=${encodeURIComponent(lead.search_query)}`,
      public_description: `Guided account-discovery search for ${lead.identifier_type}: ${lead.identifier_value}. This is a user-reviewed lead and is not proof of ownership.`,
      discovered_at: new Date().toISOString(),
      retrieved_at: new Date().toISOString(),
      confidence_score: lead.confidence_score,
      confidence_explanation: lead.confidence_reason,
      matching_signals: [`${lead.identifier_type.replace('_', ' ')} supplied by user`],
      conflicting_signals: [],
      status: 'uncertain',
      user_notes: lead.notes,
    })
    setSavingId(null)
    if (error?.code === '23505') toast.error('That search lead is already saved as a possible match.')
    else if (error) toast.error('The lead could not be saved as a possible match.')
    else toast.success('Saved to Possible Matches for review.')
  }

  return (
    <>
      <PageHeader eyebrow="Account discovery" title="Account leads" description="These are search leads generated from information you supplied. They are not claims that an account belongs to you. Open the search, review the public result yourself, then decide what to keep." />

      <section className="mb-7 border border-ink/10 bg-charcoal p-6 text-bone lg:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-label uppercase text-gold">Your review queue</p>
            <h2 className="mt-2 text-2xl font-semibold">Start with the strongest clues.</h2>
            <p className="mt-2 max-w-2xl text-body-s leading-relaxed text-bone/60">EchoTrace never silently confirms an account. You make the final call after seeing the public source.</p>
          </div>
          <a href="/dashboard/discover" className="inline-flex items-center gap-2 rounded-pill border border-gold px-5 py-3 text-body-s text-gold hover:bg-gold hover:text-ink">Add more clues <ArrowUpRight size={15} /></a>
        </div>
      </section>

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="flex items-center border border-ink/10 bg-white px-4"><Search size={17} className="text-ink/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leads" aria-label="Search account leads" className="w-full bg-transparent px-3 py-3 outline-none" /></label>
        <select aria-label="Filter account leads" value={filter} onChange={(event) => setFilter(event.target.value as LeadStatus | 'all')} className={`${inputClass} bg-white`}><option value="all">All leads</option><option value="likely">Likely</option><option value="possible">Possible</option><option value="not_mine">Not mine</option></select>
      </div>

      {loading ? <div className="h-64 animate-pulse bg-white" /> : visible.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {visible.map((lead) => {
            const status = statusCopy[lead.status]
            const searchHref = lead.source_url ?? `https://www.google.com/search?q=${encodeURIComponent(lead.search_query)}`
            return <article key={lead.id} className="border border-ink/10 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-micro uppercase ${status.className}`}>{status.label}</span><span className="rounded-full bg-mist px-3 py-1 text-micro uppercase">{lead.confidence_score}% signal</span></div>
                  <h2 className="mt-4 text-xl font-semibold">{lead.platform}</h2>
                  <p className="mt-1 text-body-s text-ink/45">From {lead.identifier_type.replace('_', ' ')} · {lead.identifier_value}</p>
                </div>
                <ExternalLink size={18} className="text-gold" />
              </div>
              <p className="mt-5 text-body-s leading-relaxed text-ink/65">{lead.confidence_reason}</p>
              <div className="mt-5 border border-ink/10 bg-bone p-4"><p className="text-body-s font-medium">What to do</p><p className="mt-1 text-body-s text-ink/55">Open the public search and look for a result you recognize. Only then mark this lead likely.</p><a href={searchHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-body-s font-medium underline decoration-gold underline-offset-4">Open guided search <ArrowUpRight size={15} /></a></div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" disabled={savingId === lead.id} onClick={() => void setStatus(lead, 'likely')} className={secondaryButtonClass}><Check size={15} className="mr-1" />Likely mine</button>
                <button type="button" disabled={savingId === lead.id} onClick={() => void setStatus(lead, 'possible')} className={secondaryButtonClass}><CircleHelp size={15} className="mr-1" />Keep possible</button>
                <button type="button" disabled={savingId === lead.id} onClick={() => void setStatus(lead, 'not_mine')} className={secondaryButtonClass}><X size={15} className="mr-1" />Not mine</button>
                <button type="button" disabled={savingId === lead.id} onClick={() => void saveAsMatch(lead)} className={primaryButtonClass}>Save for review</button>
              </div>
            </article>
          })}
        </div>
      ) : (
        <div className="border border-dashed border-ink/15 bg-white p-10 text-center"><p className="text-xl font-semibold">No account leads yet.</p><p className="mt-2 text-body-s text-ink/55">Start with an old email, username, or display name. EchoTrace will create guided search leads for you.</p><a href="/dashboard/discover" className="mt-5 inline-flex items-center gap-2 rounded-pill bg-ink px-5 py-3 text-body-s text-bone hover:bg-gold hover:text-ink">Start account discovery <ArrowUpRight size={15} /></a></div>
      )}
    </>
  )
}
