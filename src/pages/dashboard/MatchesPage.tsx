import { ArrowUpRight, Check, CircleHelp, Pencil, Plus, Search, ShieldQuestion, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, Modal, PageHeader } from '../../components/DashboardUI'
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { calculateConfidence, canTransitionMatch, confidenceLevel, normalizeConfidenceSignals, updateConfidenceSignal, type ConfidenceSignalInput } from '../../lib/confidence'
import { guidedSearchConnectors, normalizePublicSourceUrl, validatePublicArchiveUrl } from '../../lib/sourceConnectors'
import { supabase } from '../../lib/supabase'
import { timelineDatesFromMatch } from '../../lib/timeline'
import type { Identifier, MatchStatus, PossibleMatch } from '../../types/echo'

const SIGNAL_OPTIONS: Array<{ key: keyof ConfidenceSignalInput; label: string; conflict?: boolean }> = [
  { key: 'exactUsername', label: 'Exact username match' },
  { key: 'similarUsername', label: 'Similar username' },
  { key: 'matchingDisplayName', label: 'Matching display name' },
  { key: 'matchingKnownUrl', label: 'Matching known URL' },
  { key: 'matchingPlatform', label: 'Matching platform' },
  { key: 'matchingDateRange', label: 'Matching date range' },
  { key: 'matchingBioKeyword', label: 'Matching public bio keyword' },
  { key: 'conflictingDisplayName', label: 'Conflicting display name', conflict: true },
  { key: 'conflictingDate', label: 'Conflicting date', conflict: true },
  { key: 'conflictingUserLocation', label: 'Conflicting location you supplied', conflict: true },
]

const emptyForm = {
  identifierId: '', platform: '', title: '', sourceUrl: '', description: '',
  earliestDate: '', latestDate: '', notes: '', signals: {} as ConfidenceSignalInput,
}

export function MatchesPage() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<PossibleMatch[]>([])
  const [identifiers, setIdentifiers] = useState<Identifier[]>([])
  const [selectedIdentifier, setSelectedIdentifier] = useState('')
  const [platformSearch, setPlatformSearch] = useState('')
  const [archiveUrl, setArchiveUrl] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<PossibleMatch | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!supabase) return
    const [matchResult, identifierResult] = await Promise.all([
      supabase.from('possible_matches').select('*').order('created_at', { ascending: false }),
      supabase.from('identifiers').select('*').order('created_at', { ascending: false }),
    ])
    if (matchResult.error) toast.error('Possible matches could not be loaded.')
    else setMatches((matchResult.data ?? []) as PossibleMatch[])
    setIdentifiers((identifierResult.data ?? []) as Identifier[])
    setSelectedIdentifier((current) => current || identifierResult.data?.[0]?.id || '')
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => matches.filter((match) => (
    (!statusFilter || match.status === statusFilter)
    && `${match.result_title} ${match.platform} ${match.source_url}`.toLowerCase().includes(search.toLowerCase())
  )), [matches, search, statusFilter])
  const selected = identifiers.find(({ id }) => id === selectedIdentifier)

  const openSave = () => {
    setEditing(null)
    setForm({ ...emptyForm, identifierId: selectedIdentifier })
    setModalOpen(true)
  }

  const openEdit = (match: PossibleMatch) => {
    const signals: ConfidenceSignalInput = {}
    const recorded = [...match.matching_signals, ...match.conflicting_signals]
    for (const option of SIGNAL_OPTIONS) if (recorded.includes(option.label)) signals[option.key] = true
    setEditing(match)
    setForm({
      identifierId: match.identifier_id ?? '', platform: match.platform, title: match.result_title,
      sourceUrl: match.source_url, description: match.public_description ?? '', earliestDate: match.earliest_date ?? '',
      latestDate: match.latest_date ?? '', notes: match.user_notes ?? '', signals: normalizeConfidenceSignals(signals),
    })
    setModalOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return
    const normalizedUrl = normalizePublicSourceUrl(form.sourceUrl)
    if (!normalizedUrl) return toast.error('Enter a complete public http:// or https:// source URL.')
    if (form.earliestDate && form.latestDate && form.latestDate < form.earliestDate) return toast.error('Latest known date cannot be before earliest known date.')
    const score = calculateConfidence(form.signals)
    const payload = {
      user_id: user.id,
      identifier_id: form.identifierId || null,
      platform: form.platform.trim(),
      result_title: form.title.trim(),
      source_url: normalizedUrl,
      normalized_source_url: normalizedUrl,
      public_description: form.description.trim() || null,
      discovered_at: editing?.discovered_at ?? new Date().toISOString(),
      retrieved_at: editing?.retrieved_at ?? new Date().toISOString(),
      earliest_date: form.earliestDate || null,
      latest_date: form.latestDate || null,
      confidence_score: score.score,
      confidence_explanation: score.explanation,
      matching_signals: score.matchingSignals,
      conflicting_signals: score.conflictingSignals,
      status: editing?.status ?? 'pending',
      user_notes: form.notes.trim() || null,
    }
    setSaving(true)
    const { error } = editing
      ? await supabase.from('possible_matches').update(payload).eq('id', editing.id)
      : await supabase.from('possible_matches').insert(payload)
    setSaving(false)
    if (error?.code === '23505') toast.error('That source URL is already saved as a possible match.')
    else if (error) toast.error('The possible match could not be saved.')
    else {
      toast.success(editing ? 'Possible match corrected.' : 'Possible match saved with a transparent score.')
      setModalOpen(false)
      void load()
    }
  }

  const setStatus = async (match: PossibleMatch, status: MatchStatus) => {
    if (!supabase || !canTransitionMatch(match.status, status)) return
    const { error } = await supabase.from('possible_matches').update({ status }).eq('id', match.id)
    if (error) toast.error('The match status could not be changed.')
    else {
      toast.success(`Match marked ${status}.`)
      setMatches((current) => current.map((item) => item.id === match.id ? { ...item, status } : item))
    }
  }

  const convertToTimeline = async (match: PossibleMatch) => {
    if (!supabase || !user || match.status !== 'accepted') return
    const dates = timelineDatesFromMatch(match)
    const { error } = await supabase.from('timeline_events').insert({
      user_id: user.id,
      title: match.result_title,
      description: match.public_description,
      ...dates,
      platform: match.platform,
      event_type: 'recovered_memory',
      source_url: match.source_url,
      confidence: confidenceLevel(match.confidence_score),
      tags: ['accepted-match'],
      notes: `Created from possible match ${match.id}. ${match.user_notes ?? ''}`.trim(),
    })
    if (error) toast.error('The timeline event could not be created.')
    else toast.success('Accepted match added to your timeline.')
  }

  const remove = async (match: PossibleMatch) => {
    if (!supabase || !window.confirm(`Permanently delete “${match.result_title}”?`)) return
    const { error } = await supabase.from('possible_matches').delete().eq('id', match.id)
    if (error) toast.error('The possible match could not be deleted.')
    else {
      toast.success('Possible match deleted.')
      setMatches((current) => current.filter(({ id }) => id !== match.id))
    }
  }

  const openArchive = () => {
    const url = validatePublicArchiveUrl(archiveUrl)
    if (!url) return toast.error('Enter a complete public http:// or https:// archive URL.')
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <PageHeader
        eyebrow="User-reviewed evidence"
        title="Possible matches"
        description="Save public sources, inspect the exact scoring signals, and accept, reject, or mark each result uncertain. Confidence is an estimate; you make the final decision."
        action={<button type="button" onClick={openSave} className={primaryButtonClass}><Plus size={17} className="mr-2" />Save a match</button>}
      />

      <section className="mb-8 border border-ink/10 bg-charcoal p-6 text-bone md:p-8">
        <p className="text-label uppercase text-gold">Guided public search</p>
        <h2 className="mt-2 text-2xl font-semibold">Search safely, then bring the source back</h2>
        <p className="mt-2 max-w-3xl text-body-s text-bone/60">EchoTrace does not scrape sites. These links open user-directed searches in a new tab. Respect site terms, robots.txt, privacy, and access controls.</p>
        {identifiers.length ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select aria-label="Choose your identifier" value={selectedIdentifier} onChange={(event) => setSelectedIdentifier(event.target.value)} className="border border-bone/20 bg-charcoal px-3 py-3 text-bone outline-none focus:border-gold xl:col-span-2">
              {identifiers.map((identifier) => <option key={identifier.id} value={identifier.id}>{identifier.type}: {identifier.value}</option>)}
            </select>
            <input value={platformSearch} onChange={(event) => setPlatformSearch(event.target.value)} placeholder="Platform (optional)" aria-label="Platform for guided search" className="border border-bone/20 bg-charcoal px-3 py-3 text-bone outline-none placeholder:text-bone/30 focus:border-gold" />
            {selected && guidedSearchConnectors
              .filter((connector) => connector.id !== 'wayback' || ['profile_url', 'website'].includes(selected.type))
              .map((connector) => <a key={connector.id} href={connector.buildUrl(selected, platformSearch)} target="_blank" rel="noreferrer" title={connector.description} className="flex items-center justify-center gap-2 rounded-pill border border-bone/30 px-4 py-3 text-body-s hover:bg-bone hover:text-ink">{connector.label} <ArrowUpRight size={15} /></a>)}
          </div>
        ) : <p className="mt-5 text-body-s text-bone/60">Add one of your identifiers before using guided search.</p>}
        <div className="mt-4 flex flex-col gap-3 border-t border-bone/10 pt-4 md:flex-row">
          <input type="url" value={archiveUrl} onChange={(event) => setArchiveUrl(event.target.value)} placeholder="User-specified public archive URL" aria-label="Public archive URL" className="min-w-0 flex-1 border border-bone/20 bg-charcoal px-3 py-3 text-bone outline-none placeholder:text-bone/30 focus:border-gold" />
          <button type="button" onClick={openArchive} className="rounded-pill border border-gold px-5 py-3 text-body-s text-gold hover:bg-gold hover:text-ink">Open archive safely</button>
        </div>
      </section>

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="flex items-center border border-ink/10 bg-white px-4"><Search size={17} className="text-ink/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search saved matches" className="w-full bg-transparent px-3 py-3 outline-none" /></label>
        <select aria-label="Filter match status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="border border-ink/10 bg-white px-3 py-3"><option value="">All statuses</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="uncertain">Uncertain</option></select>
      </div>

      {loading ? <div className="h-64 animate-pulse bg-white" /> : visible.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {visible.map((match) => (
            <article key={match.id} className="border border-ink/10 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`rounded-full px-3 py-1 text-micro uppercase ${match.confidence_score >= 80 ? 'bg-emerald-100 text-emerald-800' : match.confidence_score >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{match.confidence_score}% {confidenceLevel(match.confidence_score)}</span>
                  <span className="ml-2 rounded-full bg-mist px-3 py-1 text-micro uppercase">{match.status}</span>
                  <h2 className="mt-4 text-xl font-semibold">{match.result_title}</h2>
                  <p className="mt-1 text-body-s text-ink/45">{match.platform} · Retrieved {new Date(match.retrieved_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openEdit(match)} className="rounded p-2 hover:bg-mist" aria-label={`Correct ${match.result_title}`}><Pencil size={16} /></button>
                  <button type="button" onClick={() => void remove(match)} className="rounded p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${match.result_title}`}><Trash2 size={16} /></button>
                  <ShieldQuestion className="ml-1 text-gold" />
                </div>
              </div>
              {match.public_description && <p className="mt-4 text-body-s leading-relaxed text-ink/65">{match.public_description}</p>}
              <a href={match.source_url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1 truncate text-body-s text-blue-700 underline">Original public source <ArrowUpRight size={14} /></a>
              <div className="mt-5 border border-ink/10 bg-bone p-4">
                <p className="text-body-s font-medium">Why this score</p>
                <p className="mt-1 text-body-s text-ink/55">{match.confidence_explanation}</p>
                {match.matching_signals.length > 0 && <ul className="mt-3 space-y-1 text-body-s text-emerald-800">{match.matching_signals.map((signal) => <li key={signal}>+ {signal}</li>)}</ul>}
                {match.conflicting_signals.length > 0 && <ul className="mt-2 space-y-1 text-body-s text-red-700">{match.conflicting_signals.map((signal) => <li key={signal}>− {signal}</li>)}</ul>}
                <p className="mt-3 text-micro text-ink/45">Confidence is a deterministic estimate, not proof of identity.</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" disabled={match.status === 'accepted'} onClick={() => void setStatus(match, 'accepted')} className={secondaryButtonClass}><Check size={15} className="mr-1" />Accept</button>
                <button type="button" disabled={match.status === 'uncertain'} onClick={() => void setStatus(match, 'uncertain')} className={secondaryButtonClass}><CircleHelp size={15} className="mr-1" />Uncertain</button>
                <button type="button" disabled={match.status === 'rejected'} onClick={() => void setStatus(match, 'rejected')} className={`${secondaryButtonClass} text-red-700`}><X size={15} className="mr-1" />Reject</button>
                {match.status === 'accepted' && <button type="button" onClick={() => void convertToTimeline(match)} className={primaryButtonClass}>Add to timeline</button>}
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState title={matches.length ? 'No matches fit these filters' : 'No possible matches saved yet'} description={matches.length ? 'Change the search or status filter.' : 'Use Guided Public Search, review a public result yourself, then save its source here.'} action={!matches.length && <button type="button" onClick={openSave} className={primaryButtonClass}>Save your first match</button>} />}

      {modalOpen && (
        <Modal wide title={editing ? 'Correct possible match' : 'Save a possible match'} description="Record only a public source you believe may belong to your own history." onClose={() => setModalOpen(false)}>
          <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
            <Field label="Associated identifier" htmlFor="match-identifier"><select id="match-identifier" value={form.identifierId} onChange={(event) => setForm({ ...form, identifierId: event.target.value })} className={inputClass}><option value="">No identifier</option>{identifiers.map((identifier) => <option key={identifier.id} value={identifier.id}>{identifier.type}: {identifier.value}</option>)}</select></Field>
            <Field label="Platform or source" htmlFor="match-platform"><input id="match-platform" required value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} className={inputClass} /></Field>
            <div className="md:col-span-2"><Field label="Profile or result title" htmlFor="match-title"><input id="match-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} /></Field></div>
            <div className="md:col-span-2"><Field label="Original source URL" htmlFor="match-url"><input id="match-url" type="url" required value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="https://" className={inputClass} /></Field></div>
            <Field label="Earliest known date" htmlFor="match-earliest"><input id="match-earliest" type="date" value={form.earliestDate} onChange={(event) => setForm({ ...form, earliestDate: event.target.value })} className={inputClass} /></Field>
            <Field label="Latest known date" htmlFor="match-latest"><input id="match-latest" type="date" value={form.latestDate} onChange={(event) => setForm({ ...form, latestDate: event.target.value })} className={inputClass} /></Field>
            <div className="md:col-span-2"><Field label="Public description or snippet" htmlFor="match-description"><textarea id="match-description" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} /></Field></div>
            <fieldset className="border border-ink/10 p-5 md:col-span-2">
              <legend className="px-2 text-body-s font-medium">Transparent scoring signals</legend>
              <div className="grid gap-3 md:grid-cols-2">{SIGNAL_OPTIONS.map((signal) => <label key={signal.key} className={`flex items-center gap-3 border p-3 text-body-s ${signal.conflict ? 'border-red-100 bg-red-50/50' : 'border-emerald-100 bg-emerald-50/50'}`}><input type="checkbox" checked={Boolean(form.signals[signal.key])} onChange={(event) => setForm({ ...form, signals: updateConfidenceSignal(form.signals, signal.key, event.target.checked) })} className="h-4 w-4 accent-ink" />{signal.label}</label>)}</div>
              <p className="mt-4 text-body-s text-ink/55">Current score: <strong>{calculateConfidence(form.signals).score}% ({calculateConfidence(form.signals).level})</strong></p>
            </fieldset>
            <div className="md:col-span-2"><Field label="Private notes" htmlFor="match-notes"><textarea id="match-notes" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={inputClass} /></Field></div>
            <div className="flex justify-end gap-3 md:col-span-2"><button type="button" onClick={() => setModalOpen(false)} className={secondaryButtonClass}>Cancel</button><button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Saving…' : editing ? 'Save corrections' : 'Save possible match'}</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
