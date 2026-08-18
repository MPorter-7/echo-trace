import { ArrowUpRight, Check, ChevronDown, CircleHelp, FileArchive, FileSearch, History, LockKeyhole, Mail, ShieldCheck, Trash2, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, PageHeader } from '../../components/DashboardUI'
import { primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { canTransitionMatch, confidenceLevel } from '../../lib/confidence'
import { analyzeMboxFile, formatEmailEvidenceKind, shouldAutoSelectFinding, validateMboxFile, type EmailEvidenceKind, type EmailHistoryAnalysis, type EmailHistoryFindingDraft } from '../../lib/mbox'
import { supabase } from '../../lib/supabase'
import type { EmailFinding, EmailImport, MatchStatus } from '../../types/echo'

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable'
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

interface AnalysisSource {
  name: string
  sizeBytes: number
  kind: 'mbox'
}

export function EmailHistoryPage() {
  const { user } = useAuth()
  const [imports, setImports] = useState<EmailImport[]>([])
  const [findings, setFindings] = useState<EmailFinding[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [ownsMailbox, setOwnsMailbox] = useState(false)
  const [analysis, setAnalysis] = useState<EmailHistoryAnalysis | null>(null)
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource | null>(null)
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('Checking account evidence')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!supabase) return
    const [importResult, findingResult] = await Promise.all([
      supabase.from('email_imports').select('*').order('created_at', { ascending: false }),
      supabase.from('email_findings').select('*').order('confidence_score', { ascending: false }),
    ])
    if (importResult.error || findingResult.error) toast.error('Saved email-history findings could not be loaded.')
    setImports((importResult.data ?? []) as EmailImport[])
    setFindings((findingResult.data ?? []) as EmailFinding[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const importNames = useMemo(() => new Map(imports.map((item) => [item.id, item.original_name])), [imports])
  const recommendedFindings = useMemo(() => analysis?.findings.filter(({ recommended }) => recommended) ?? [], [analysis])
  const autoSelectedFindings = useMemo(() => recommendedFindings.filter(shouldAutoSelectFinding), [recommendedFindings])
  const possibleFindings = useMemo(() => analysis?.findings.filter(({ recommended }) => !recommended) ?? [], [analysis])

  const analyze = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) return toast.error('Choose an exported .mbox file first.')
    if (!ownsMailbox) return toast.error('Confirm that this is your mailbox and part of your own digital history.')
    const validation = validateMboxFile(file)
    if (!validation.valid) return toast.error(validation.error)

    setAnalyzing(true)
    setAnalysis(null)
    setAnalysisSource(null)
    setSelectedDomains(new Set())
    setProgress(0)
    setProgressLabel('Analyzing on this device')
    try {
      const result = await analyzeMboxFile(file, setProgress)
      setAnalysis(result)
      setAnalysisSource({ name: file.name, sizeBytes: file.size, kind: 'mbox' })
      const recommended = result.findings.filter((finding) => finding.recommended)
      const autoSelected = recommended.filter(shouldAutoSelectFinding)
      const possible = result.findings.length - recommended.length
      setSelectedDomains(new Set(autoSelected.map(({ senderDomain }) => senderDomain)))
      if (autoSelected.length) toast.success(`Selected ${autoSelected.length} strong account${autoSelected.length === 1 ? '' : 's'} above 80% confidence after automatic cleanup.`)
      else if (recommended.length) toast.info(`Found ${recommended.length} borderline account signal${recommended.length === 1 ? '' : 's'}, but none exceeded 80% confidence. Nothing was selected.`)
      else if (possible > 0) toast.info(`No corroborated accounts were found. ${possible} lower-confidence signal${possible === 1 ? ' was' : 's were'} held back.`)
      else if (result.findingsFiltered > 0) toast.info('Automatic cleanup removed every weak or spam-like result. Nothing was saved.')
      else toast.info('No account evidence was recognized in this file. Nothing was uploaded or saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The mailbox could not be analyzed.')
    }
    setAnalyzing(false)
  }

  const toggleFinding = (domain: string) => {
    setSelectedDomains((current) => {
      const next = new Set(current)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  const toggleRecommendedFindings = () => {
    setSelectedDomains((current) => {
      const next = new Set(current)
      const allSelected = recommendedFindings.length > 0 && recommendedFindings.every(({ senderDomain }) => current.has(senderDomain))
      for (const { senderDomain } of recommendedFindings) {
        if (allSelected) next.delete(senderDomain)
        else next.add(senderDomain)
      }
      return next
    })
  }

  const findingCard = (finding: EmailHistoryFindingDraft) => (
    <label key={finding.senderDomain} className={`cursor-pointer border bg-white p-6 transition ${selectedDomains.has(finding.senderDomain) ? 'border-gold ring-1 ring-gold' : 'border-ink/10'}`}>
      <div className="flex items-start gap-4"><input type="checkbox" checked={selectedDomains.has(finding.senderDomain)} onChange={() => toggleFinding(finding.senderDomain)} className="mt-1 h-4 w-4 accent-ink" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-semibold">{finding.serviceName}</h3><span className="rounded-full bg-mist px-3 py-1 text-micro uppercase">{finding.confidenceScore}% {confidenceLevel(finding.confidenceScore)}</span>{finding.recommended && <span className="rounded-full bg-emerald-50 px-3 py-1 text-micro uppercase text-emerald-800">corroborated</span>}</div><p className="mt-1 text-body-s text-ink/45">{finding.senderDomain} · {finding.messageCount} relevant message{finding.messageCount === 1 ? '' : 's'}</p></div></div>
      <div className="mt-4 flex flex-wrap gap-2">{finding.evidenceTypes.map((kind) => <span key={kind} className="rounded-full bg-emerald-50 px-3 py-1 text-micro text-emerald-800">{formatEmailEvidenceKind(kind)} ({finding.evidenceCounts[kind]})</span>)}</div>
      <p className="mt-4 text-body-s text-ink/55">{formatDate(finding.firstSeen)}{finding.lastSeen && finding.lastSeen !== finding.firstSeen ? ` – ${formatDate(finding.lastSeen)}` : ''}</p>
      {finding.sampleSubjects.length > 0 && <div className="mt-4 border-l-2 border-gold pl-4"><p className="text-micro uppercase text-ink/40">Local-only examples</p>{finding.sampleSubjects.map((subject) => <p key={subject} className="mt-1 truncate text-body-s text-ink/60">{subject}</p>)}</div>}
    </label>
  )

  const saveSelected = async () => {
    if (!supabase || !user || !analysisSource || !analysis) return
    const selected = analysis.findings.filter((finding) => selectedDomains.has(finding.senderDomain))
    if (!selected.length) return toast.error('Select at least one finding after reviewing it.')
    setSaving(true)
    const importResult = await supabase.from('email_imports').insert({
      user_id: user.id,
      original_name: analysisSource.name,
      size_bytes: analysisSource.sizeBytes,
      source_kind: analysisSource.kind,
      messages_scanned: analysis.messagesScanned,
      candidate_messages: analysis.candidateMessages,
      findings_count: selected.length,
      processed_locally: true,
    }).select('id').single()

    if (importResult.error || !importResult.data) {
      setSaving(false)
      return toast.error('The import summary could not be saved.')
    }

    const findingResult = await supabase.from('email_findings').insert(selected.map((finding) => ({
      user_id: user.id,
      import_id: importResult.data.id,
      service_name: finding.serviceName,
      sender_domain: finding.senderDomain,
      evidence_types: finding.evidenceTypes,
      evidence_counts: finding.evidenceCounts,
      first_seen: finding.firstSeen,
      last_seen: finding.lastSeen,
      message_count: finding.messageCount,
      confidence_score: finding.confidenceScore,
      confidence_explanation: finding.confidenceExplanation,
      status: 'pending',
    })))

    if (findingResult.error) {
      await supabase.from('email_imports').delete().eq('id', importResult.data.id)
      setSaving(false)
      return toast.error('No findings were saved because the private import could not be completed.')
    }

    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'email_history_analyzed',
      entity_type: 'email_import',
      entity_id: importResult.data.id,
      details: { messages_scanned: analysis.messagesScanned, findings_saved: selected.length, raw_mailbox_uploaded: false, source: analysisSource.kind },
    })
    setSaving(false)
    setFile(null)
    setOwnsMailbox(false)
    setAnalysis(null)
    setAnalysisSource(null)
    setSelectedDomains(new Set())
    setProgress(0)
    const input = document.querySelector<HTMLInputElement>('#mbox-upload')
    if (input) input.value = ''
    toast.success('Selected findings saved privately for your review. Raw email content was not stored.')
    void load()
  }

  const setStatus = async (finding: EmailFinding, status: MatchStatus) => {
    if (!supabase || !canTransitionMatch(finding.status, status)) return
    const { error } = await supabase.from('email_findings').update({ status }).eq('id', finding.id)
    if (error) toast.error('The finding status could not be changed.')
    else {
      setFindings((current) => current.map((item) => item.id === finding.id ? { ...item, status } : item))
      toast.success(`Finding marked ${status}.`)
    }
  }

  const addToTimeline = async (finding: EmailFinding) => {
    if (!supabase || !user || finding.status !== 'accepted' || finding.timeline_event_id) return
    const eventResult = await supabase.from('timeline_events').insert({
      user_id: user.id,
      title: `${finding.service_name} email evidence`,
      description: `Accepted email-history finding based on ${finding.message_count} message${finding.message_count === 1 ? '' : 's'} from ${finding.sender_domain}. Evidence: ${finding.evidence_types.map((kind) => formatEmailEvidenceKind(kind as EmailEvidenceKind)).join(', ')}.`,
      event_date: finding.first_seen,
      end_date: finding.last_seen && finding.last_seen !== finding.first_seen ? finding.last_seen : null,
      date_precision: finding.first_seen ? 'exact' : 'unknown',
      platform: finding.service_name,
      event_type: 'recovered_memory',
      confidence: confidenceLevel(finding.confidence_score),
      tags: ['email-history-upload', 'accepted-finding'],
      notes: `Created from email-history finding ${finding.id}. Raw email content was not stored.`,
    }).select('id').single()
    if (eventResult.error || !eventResult.data) return toast.error('The timeline event could not be created.')
    const linkResult = await supabase.from('email_findings').update({ timeline_event_id: eventResult.data.id }).eq('id', finding.id)
    if (linkResult.error) {
      await supabase.from('timeline_events').delete().eq('id', eventResult.data.id)
      return toast.error('The timeline event could not be linked, so no partial record was kept.')
    }
    setFindings((current) => current.map((item) => item.id === finding.id ? { ...item, timeline_event_id: eventResult.data.id } : item))
    toast.success('Accepted finding added to your timeline.')
  }

  const removeImport = async (item: EmailImport) => {
    if (!supabase || !window.confirm(`Delete the saved findings from “${item.original_name}”? Timeline events you already created will remain.`)) return
    const { error } = await supabase.from('email_imports').delete().eq('id', item.id)
    if (error) toast.error('The import summary could not be deleted.')
    else {
      setImports((current) => current.filter(({ id }) => id !== item.id))
      setFindings((current) => current.filter(({ import_id }) => import_id !== item.id))
      toast.success('The import summary and its saved findings were deleted.')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Private evidence recovery"
        title="Find my accounts"
        description="Import an email export to recover account evidence privately. EchoTrace analyzes it on this device, removes spam-like results, and saves only findings you approve."
      />

      <section className="border border-ink/10 bg-charcoal p-7 text-bone lg:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="flex items-center gap-2 text-label uppercase text-gold"><Zap size={15} />Start here</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Import your email history</h2>
            <p className="mt-4 max-w-2xl text-body-s leading-relaxed text-bone/65">Export your mailbox from your provider, then upload the `.mbox` file below. EchoTrace finds signups, password resets, security notices, and other account evidence without connecting to your email account.</p>
          </div>
          <div className="border border-emerald-400/25 bg-emerald-400/10 p-5 text-body-s text-emerald-100">
            <p className="flex items-center gap-2 font-medium"><LockKeyhole size={18} />Private by design</p>
            <p className="mt-3 leading-relaxed text-emerald-100/70">Your raw mailbox stays on this device. EchoTrace does not connect to, copy, or store your email messages, addresses, or subjects. Only the account summaries you approve are saved.</p>
          </div>
        </div>
        {analyzing && <div className="mt-7" aria-live="polite"><div className="flex justify-between text-micro uppercase text-bone/50"><span>{progressLabel}</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-bone/10"><div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div></div>}
      </section>

      <section className="mt-5 border border-ink/10 bg-white">
        <div className="grid gap-7 p-6 lg:grid-cols-[0.75fr_1.25fr] lg:p-8">
          <div>
            <p className="text-label uppercase text-gold">Works with your provider</p>
            <p className="mt-3 text-body-s leading-relaxed text-ink/55">Upload a `.mbox` export from Gmail via Google Takeout, Yahoo, Proton Mail, Apple Mail, Thunderbird, or another compatible provider. Outlook `.pst` files must be converted to `.mbox` first. The file stays on this device; only findings you select are saved.</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-body-s"><a href="https://support.google.com/accounts/answer/3024190" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-ink underline decoration-gold underline-offset-4">Google export help <ArrowUpRight size={15} /></a><a href="https://proton.me/support/proton-mail-export-tool" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-ink underline decoration-gold underline-offset-4">Proton export help <ArrowUpRight size={15} /></a></div>
          </div>
          <form onSubmit={analyze} className="border border-ink/10 bg-bone p-6">
            <label htmlFor="mbox-upload" className="text-body-s font-medium">Choose your exported `.mbox` file</label>
            <input id="mbox-upload" type="file" required accept=".mbox,application/mbox" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setAnalysis(null); setAnalysisSource(null); setSelectedDomains(new Set()); setProgress(0) }} className="mt-3 block w-full border border-ink/15 bg-white px-3 py-3 text-body-s text-ink file:mr-4 file:border-0 file:bg-ink file:px-3 file:py-2 file:text-bone" />
            <label className="mt-5 flex items-start gap-3 border border-ink/10 bg-white p-4 text-body-s text-ink/65">
              <input type="checkbox" checked={ownsMailbox} onChange={(event) => setOwnsMailbox(event.target.checked)} className="mt-1 h-4 w-4 accent-gold" />
              <span>This is my mailbox and I am reconstructing only my own history.</span>
            </label>
            <button type="submit" disabled={analyzing || !file || !ownsMailbox} className={`${secondaryButtonClass} mt-5`}><FileSearch size={17} className="mr-2" />Analyze file</button>
          </form>
        </div>
      </section>

      {analysis && (
        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div><p className="text-label uppercase text-gold">Private analysis complete</p><h2 className="mt-2 text-2xl font-semibold">Corroborated accounts</h2><p className="mt-2 text-body-s text-ink/55">Checked {analysis.messagesScanned.toLocaleString()} likely messages; {analysis.candidateMessages.toLocaleString()} contained recognizable account evidence. Only independently corroborated accounts above 80% confidence are selected automatically.</p></div>
            {recommendedFindings.length > 0 && <button type="button" onClick={toggleRecommendedFindings} className={secondaryButtonClass}>{recommendedFindings.every(({ senderDomain }) => selectedDomains.has(senderDomain)) ? 'Clear corroborated' : 'Select all corroborated'}</button>}
          </div>
          <div className="mt-5 flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-body-s text-emerald-900"><ShieldCheck size={19} className="mt-0.5 shrink-0" /><p>Automatic cleanup merged {analysis.duplicatesMerged.toLocaleString()} duplicate sender{analysis.duplicatesMerged === 1 ? '' : 's'}, removed {analysis.findingsFiltered.toLocaleString()} weak or spam-like result{analysis.findingsFiltered === 1 ? '' : 's'}, and held back {possibleFindings.length.toLocaleString()} lower-confidence signal{possibleFindings.length === 1 ? '' : 's'}. {autoSelectedFindings.length.toLocaleString()} corroborated account{autoSelectedFindings.length === 1 ? ' is' : 's are'} above 80% and selected; exact-80% results remain unselected for review.</p></div>
          {recommendedFindings.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{recommendedFindings.map(findingCard)}</div> : <div className="mt-5"><EmptyState title="No corroborated accounts after cleanup" description="Nothing is selected or saved. Lower-confidence signals remain available below if you want to inspect them." /></div>}
          {possibleFindings.length > 0 && <details className="group mt-5 border border-ink/10 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-body-s font-medium"><span>Show {possibleFindings.length.toLocaleString()} possible account signal{possibleFindings.length === 1 ? '' : 's'} — not selected</span><ChevronDown size={18} className="transition group-open:rotate-180" /></summary><div className="grid gap-4 border-t border-ink/10 bg-bone p-5 lg:grid-cols-2">{possibleFindings.map(findingCard)}</div></details>}
          {analysis.findings.length > 0 && <div className="mt-6 flex flex-col items-start justify-between gap-4 border border-ink/10 bg-white p-5 md:flex-row md:items-center"><p className="text-body-s text-ink/55">{selectedDomains.size} of {analysis.findings.length} account signals selected. Exact-80% and lower-confidence signals stay unselected unless you choose them. Subject examples never leave this page.</p><button type="button" onClick={() => void saveSelected()} disabled={saving || selectedDomains.size === 0} className={primaryButtonClass}><ShieldCheck size={17} className="mr-2" />{saving ? 'Saving privately…' : 'Save selected for review'}</button></div>}
        </section>
      )}

      <section className="mt-10">
        <div><p className="text-label uppercase text-gold">Saved summaries</p><h2 className="mt-2 text-2xl font-semibold">Your email-history findings</h2><p className="mt-2 text-body-s text-ink/55">Accept, reject, or mark each finding uncertain. Nothing is added to your timeline until you accept it and choose that action.</p></div>
        {loading ? <div className="mt-5 h-64 animate-pulse bg-white" /> : findings.length ? <div className="mt-5 grid gap-5 xl:grid-cols-2">{findings.map((finding) => (
          <article key={finding.id} className="border border-ink/10 bg-white p-6">
            <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-mist px-3 py-1 text-micro uppercase">{finding.confidence_score}% {confidenceLevel(finding.confidence_score)}</span><span className="rounded-full bg-mist px-3 py-1 text-micro uppercase">{finding.status}</span></div><h3 className="mt-4 text-xl font-semibold">{finding.service_name}</h3><p className="mt-1 text-body-s text-ink/45">{finding.sender_domain} · {finding.message_count} message{finding.message_count === 1 ? '' : 's'}</p></div><Mail className="shrink-0 text-gold" /></div>
            <p className="mt-4 text-body-s leading-relaxed text-ink/60">{finding.confidence_explanation}</p>
            <div className="mt-4 flex flex-wrap gap-2">{finding.evidence_types.map((kind) => <span key={kind} className="rounded-full bg-emerald-50 px-3 py-1 text-micro text-emerald-800">{formatEmailEvidenceKind(kind as EmailEvidenceKind)} ({finding.evidence_counts[kind] ?? 0})</span>)}</div>
            <div className="mt-4 border border-ink/10 bg-bone p-4 text-body-s text-ink/55"><p>{formatDate(finding.first_seen)}{finding.last_seen && finding.last_seen !== finding.first_seen ? ` – ${formatDate(finding.last_seen)}` : ''}</p><p className="mt-1 truncate">Import: {importNames.get(finding.import_id) ?? 'Deleted import'}</p><p className="mt-1 text-micro">Stored summary only; no email body or subject is stored.</p></div>
            <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={finding.status === 'accepted'} onClick={() => void setStatus(finding, 'accepted')} className={secondaryButtonClass}><Check size={15} className="mr-1" />Accept</button><button type="button" disabled={finding.status === 'uncertain'} onClick={() => void setStatus(finding, 'uncertain')} className={secondaryButtonClass}><CircleHelp size={15} className="mr-1" />Uncertain</button><button type="button" disabled={finding.status === 'rejected'} onClick={() => void setStatus(finding, 'rejected')} className={`${secondaryButtonClass} text-red-700`}><X size={15} className="mr-1" />Reject</button>{finding.status === 'accepted' && !finding.timeline_event_id && <button type="button" onClick={() => void addToTimeline(finding)} className={primaryButtonClass}><History size={15} className="mr-1" />Add to timeline</button>}{finding.timeline_event_id && <span className="inline-flex items-center rounded-pill bg-emerald-50 px-4 py-2 text-body-s text-emerald-800"><Check size={15} className="mr-1" />Added to timeline</span>}</div>
          </article>
        ))}</div> : <div className="mt-5"><EmptyState title="No email-history findings saved" description="Import an .mbox email export, then choose which account summaries EchoTrace may save." /></div>}
      </section>

      {imports.length > 0 && <section className="mt-10 border border-ink/10 bg-white p-6"><p className="text-label uppercase text-gold">Import records</p><div className="mt-4 divide-y divide-ink/10">{imports.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><FileArchive className="shrink-0 text-gold" /><div className="min-w-0"><p className="truncate font-medium">{item.original_name}</p><p className="text-body-s text-ink/45">{item.messages_scanned.toLocaleString()} scanned · {item.findings_count} saved · {new Date(item.created_at).toLocaleDateString()}</p></div></div><button type="button" onClick={() => void removeImport(item)} className="inline-flex items-center text-body-s text-red-700 hover:underline"><Trash2 size={15} className="mr-1" />Delete saved summary</button></div>)}</div></section>}
    </>
  )
}
