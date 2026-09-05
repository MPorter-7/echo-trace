import { Check, ChevronDown, CircleHelp, FileArchive, History, KeyRound, LockKeyhole, ShieldCheck, ShieldOff, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, PageHeader } from '../../components/DashboardUI'
import { primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { canTransitionMatch, confidenceLevel } from '../../lib/confidence'
import { analyzeLoginExportFile, validateLoginExportFile, type LoginExportAnalysis, type LoginExportFindingDraft } from '../../lib/loginExport'
import { supabase } from '../../lib/supabase'
import type { LoginExportFinding, LoginExportImport, MatchStatus } from '../../types/echo'

interface AnalysisSource {
  name: string
  sizeBytes: number
}

export function LoginExportPage() {
  const { user } = useAuth()
  const [imports, setImports] = useState<LoginExportImport[]>([])
  const [findings, setFindings] = useState<LoginExportFinding[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [ownsExport, setOwnsExport] = useState(false)
  const [analysis, setAnalysis] = useState<LoginExportAnalysis | null>(null)
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource | null>(null)
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creatingTimelineId, setCreatingTimelineId] = useState<string | null>(null)

  const load = async () => {
    if (!supabase) return
    const [importResult, findingResult] = await Promise.all([
      supabase.from('login_exports').select('*').order('created_at', { ascending: false }),
      supabase.from('login_export_findings').select('*').order('confidence_score', { ascending: false }),
    ])
    if (importResult.error || findingResult.error) toast.error('Saved-logins findings could not be loaded.')
    setImports((importResult.data ?? []) as LoginExportImport[])
    setFindings((findingResult.data ?? []) as LoginExportFinding[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const importNames = useMemo(() => new Map(imports.map((item) => [item.id, item.original_name])), [imports])
  const recommendedFindings = useMemo(() => analysis?.findings.filter(({ recommended }) => recommended) ?? [], [analysis])
  const possibleFindings = useMemo(() => analysis?.findings.filter(({ recommended }) => !recommended) ?? [], [analysis])

  const analyze = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) return toast.error('Choose an exported .csv file first.')
    if (!ownsExport) return toast.error('Confirm this is your own saved-logins export and that you understand passwords are never saved.')
    const validation = validateLoginExportFile(file)
    if (!validation.valid) return toast.error(validation.error)

    setAnalyzing(true)
    setAnalysis(null)
    setAnalysisSource(null)
    setSelectedDomains(new Set())
    setProgress(0)
    try {
      const result = await analyzeLoginExportFile(file, setProgress)
      setAnalysis(result)
      setAnalysisSource({ name: file.name, sizeBytes: file.size })
      const recommended = result.findings.filter((finding) => finding.recommended)
      setSelectedDomains(new Set(recommended.map(({ domain }) => domain)))
      if (recommended.length) toast.success(`Found ${recommended.length} saved account${recommended.length === 1 ? '' : 's'} and selected ${recommended.length === 1 ? 'it' : 'them'} for review.`)
      else if (result.findings.length) toast.info(`Found ${result.findings.length} lower-confidence signal${result.findings.length === 1 ? '' : 's'}. Nothing was selected automatically.`)
      else toast.info('No saved logins were recognized in this file. Nothing was uploaded or saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The export could not be analyzed.')
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
      const allSelected = recommendedFindings.length > 0 && recommendedFindings.every(({ domain }) => current.has(domain))
      for (const { domain } of recommendedFindings) {
        if (allSelected) next.delete(domain)
        else next.add(domain)
      }
      return next
    })
  }

  const findingCard = (finding: LoginExportFindingDraft) => (
    <label key={finding.domain} className={`cursor-pointer border bg-white p-6 transition ${selectedDomains.has(finding.domain) ? 'border-gold ring-1 ring-gold' : 'border-ink/10'}`}>
      <div className="flex items-start gap-4">
        <input type="checkbox" checked={selectedDomains.has(finding.domain)} onChange={() => toggleFinding(finding.domain)} className="mt-1 h-4 w-4 accent-ink" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold">{finding.serviceName}</h3>
            <span className="rounded-full bg-mist px-3 py-1 text-micro uppercase">{finding.confidenceScore}% {confidenceLevel(finding.confidenceScore)}</span>
            {finding.recommended && <span className="rounded-full bg-emerald-50 px-3 py-1 text-micro uppercase text-emerald-800">saved login</span>}
          </div>
          <p className="mt-1 text-body-s text-ink/45">{finding.domain} · {finding.rowCount} saved entr{finding.rowCount === 1 ? 'y' : 'ies'}</p>
        </div>
      </div>
      {finding.usernames.length > 0 && (
        <div className="mt-4 border-l-2 border-gold pl-4">
          <p className="text-micro uppercase text-ink/40">Username{finding.usernameCount === 1 ? '' : 's'} in this export</p>
          {finding.usernames.map((username) => <p key={username} className="mt-1 truncate text-body-s text-ink/60">{username}</p>)}
          {finding.usernameCount > finding.usernames.length && <p className="mt-1 text-micro text-ink/40">+{finding.usernameCount - finding.usernames.length} more</p>}
        </div>
      )}
      <p className="mt-4 text-body-s leading-relaxed text-ink/65">{finding.confidenceExplanation}</p>
    </label>
  )

  const saveSelected = async () => {
    if (!supabase || !user || !analysisSource || !analysis) return
    const selected = analysis.findings.filter((finding) => selectedDomains.has(finding.domain))
    if (!selected.length) return toast.error('Select at least one finding after reviewing it.')
    setSaving(true)
    const importResult = await supabase.from('login_exports').insert({
      user_id: user.id,
      original_name: analysisSource.name,
      size_bytes: analysisSource.sizeBytes,
      source_kind: 'csv',
      rows_scanned: analysis.rowsScanned,
      candidate_rows: analysis.candidateRows,
      findings_count: selected.length,
      processed_locally: true,
    }).select('id').single()

    if (importResult.error || !importResult.data) {
      setSaving(false)
      return toast.error('The import summary could not be saved.')
    }

    const findingResult = await supabase.from('login_export_findings').insert(selected.map((finding) => ({
      user_id: user.id,
      import_id: importResult.data.id,
      service_name: finding.serviceName,
      domain: finding.domain,
      usernames: finding.usernames,
      row_count: finding.rowCount,
      confidence_score: finding.confidenceScore,
      confidence_explanation: finding.confidenceExplanation,
      status: 'pending',
    })))

    if (findingResult.error) {
      await supabase.from('login_exports').delete().eq('id', importResult.data.id)
      setSaving(false)
      return toast.error('No findings were saved because the private import could not be completed.')
    }

    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'login_export_analyzed',
      entity_type: 'login_export',
      entity_id: importResult.data.id,
      details: { rows_scanned: analysis.rowsScanned, findings_saved: selected.length, raw_export_uploaded: false },
    })
    setSaving(false)
    setFile(null)
    setOwnsExport(false)
    setAnalysis(null)
    setAnalysisSource(null)
    setSelectedDomains(new Set())
    setProgress(0)
    const input = document.querySelector<HTMLInputElement>('#login-export-upload')
    if (input) input.value = ''
    toast.success('Selected findings saved privately for your review. Passwords were never read or stored.')
    void load()
  }

  const setStatus = async (finding: LoginExportFinding, status: MatchStatus) => {
    if (!supabase || !canTransitionMatch(finding.status, status)) return
    const { error } = await supabase.from('login_export_findings').update({ status }).eq('id', finding.id)
    if (error) toast.error('The finding status could not be changed.')
    else {
      setFindings((current) => current.map((item) => item.id === finding.id ? { ...item, status } : item))
      toast.success(`Finding marked ${status}.`)
    }
  }

  const addToTimeline = async (finding: LoginExportFinding) => {
    if (!supabase || !user || finding.status !== 'accepted' || finding.timeline_event_id || creatingTimelineId === finding.id) return
    setCreatingTimelineId(finding.id)
    const eventResult = await supabase.from('timeline_events').insert({
      user_id: user.id,
      title: `${finding.service_name} account`,
      description: `Accepted saved-login finding based on ${finding.row_count} saved entr${finding.row_count === 1 ? 'y' : 'ies'} for ${finding.domain}.${finding.usernames.length ? ` Username(s): ${finding.usernames.join(', ')}.` : ''}`,
      event_date: null,
      end_date: null,
      date_precision: 'unknown',
      platform: finding.service_name,
      username_used: finding.usernames[0] ?? null,
      event_type: 'account_created',
      confidence: confidenceLevel(finding.confidence_score),
      tags: ['login-export-upload', 'accepted-finding'],
      notes: `Created from saved-logins finding ${finding.id}. The saved password was never read or stored.`,
    }).select('id').single()
    if (eventResult.error || !eventResult.data) {
      setCreatingTimelineId(null)
      return toast.error('The timeline event could not be created.')
    }
    const linkResult = await supabase.from('login_export_findings').update({ timeline_event_id: eventResult.data.id }).eq('id', finding.id)
    if (linkResult.error) {
      await supabase.from('timeline_events').delete().eq('id', eventResult.data.id)
      setCreatingTimelineId(null)
      return toast.error('The timeline event could not be linked, so no partial record was kept.')
    }
    setFindings((current) => current.map((item) => item.id === finding.id ? { ...item, timeline_event_id: eventResult.data.id } : item))
    setCreatingTimelineId(null)
    toast.success('Accepted finding added to your timeline.')
  }

  const removeImport = async (item: LoginExportImport) => {
    if (!supabase || !window.confirm(`Delete the saved findings from “${item.original_name}”? Timeline events you already created will remain.`)) return
    const { error } = await supabase.from('login_exports').delete().eq('id', item.id)
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
        title="Import saved logins"
        description="Export your saved logins from a browser or password manager, then upload the .csv file below. A saved sign-in is direct evidence you created that account — stronger than guessing from email."
      />

      <section className="border border-ink/10 bg-charcoal p-7 text-bone lg:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="flex items-center gap-2 text-label uppercase text-gold"><KeyRound size={15} />Start here</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Import your saved logins</h2>
            <p className="mt-4 max-w-2xl text-body-s leading-relaxed text-bone/65">Chrome, Firefox, Edge, Safari, Bitwarden, 1Password, and LastPass can all export your saved logins as a `.csv` file. Upload it here to find every site you have an account with.</p>
          </div>
          <div className="border border-emerald-400/25 bg-emerald-400/10 p-5 text-body-s text-emerald-100">
            <p className="flex items-center gap-2 font-medium"><LockKeyhole size={18} />Passwords are never read</p>
            <p className="mt-3 leading-relaxed text-emerald-100/70">This file is analyzed on this device only. EchoTrace only reads the site and username columns from your export. The password column is never opened, stored, logged, or sent anywhere — not even temporarily.</p>
          </div>
        </div>
        {analyzing && <div className="mt-7" aria-live="polite"><div className="flex justify-between text-micro uppercase text-bone/50"><span>Analyzing on this device</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-bone/10"><div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div></div>}
      </section>

      <section className="mt-5 border border-ink/10 bg-white">
        <div className="grid gap-7 p-6 lg:grid-cols-[0.75fr_1.25fr] lg:p-8">
          <div>
            <p className="text-label uppercase text-gold">Works with your export</p>
            <p className="mt-3 text-body-s leading-relaxed text-ink/55">In Chrome or Edge, go to Settings → Passwords → Export passwords. In Firefox, go to about:logins → ⋯ menu → Export Logins. Bitwarden, 1Password, and LastPass each offer a CSV export from their vault settings. The file stays on this device; only findings you select are saved.</p>
            <div className="mt-5 flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-body-s text-red-900">
              <ShieldOff size={18} className="mt-0.5 shrink-0" />
              <p>Delete the exported CSV file from your downloads once you are done. It contains your real passwords in plain text — EchoTrace never uploads it, but the file itself is sensitive until you remove it from your device.</p>
            </div>
          </div>
          <form onSubmit={analyze} className="border border-ink/10 bg-bone p-6">
            <label htmlFor="login-export-upload" className="text-body-s font-medium">Choose your exported `.csv` file</label>
            <input id="login-export-upload" type="file" required accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setAnalysis(null); setAnalysisSource(null); setSelectedDomains(new Set()); setProgress(0) }} className="mt-3 block w-full border border-ink/15 bg-white px-3 py-3 text-body-s text-ink file:mr-4 file:border-0 file:bg-ink file:px-3 file:py-2 file:text-bone" />
            <label className="mt-5 flex items-start gap-3 border border-ink/10 bg-white p-4 text-body-s text-ink/65">
              <input type="checkbox" checked={ownsExport} onChange={(event) => setOwnsExport(event.target.checked)} className="mt-1 h-4 w-4 accent-gold" />
              <span>This is my own saved-logins export, and I understand EchoTrace never reads or stores the password column.</span>
            </label>
            <button type="submit" disabled={analyzing || !file || !ownsExport} className={`${secondaryButtonClass} mt-5`}><KeyRound size={17} className="mr-2" />Analyze file</button>
          </form>
        </div>
      </section>

      {analysis && (
        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div><p className="text-label uppercase text-gold">Private analysis complete</p><h2 className="mt-2 text-2xl font-semibold">Accounts found in your export</h2><p className="mt-2 text-body-s text-ink/55">Checked {analysis.rowsScanned.toLocaleString()} saved rows; {analysis.candidateRows.toLocaleString()} were website logins with a usable site address.</p></div>
            {recommendedFindings.length > 0 && <button type="button" onClick={toggleRecommendedFindings} className={secondaryButtonClass}>{recommendedFindings.every(({ domain }) => selectedDomains.has(domain)) ? 'Clear selected' : 'Select all saved logins'}</button>}
          </div>
          {analysis.duplicatesMerged > 0 && <div className="mt-5 flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-body-s text-emerald-900"><ShieldCheck size={19} className="mt-0.5 shrink-0" /><p>Automatic cleanup merged {analysis.duplicatesMerged.toLocaleString()} duplicate subdomain{analysis.duplicatesMerged === 1 ? '' : 's'} into the same account.</p></div>}
          {recommendedFindings.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{recommendedFindings.map(findingCard)}</div> : <div className="mt-5"><EmptyState title="No saved logins recognized" description="Nothing is selected or saved. Lower-confidence signals remain available below if you want to inspect them." /></div>}
          {possibleFindings.length > 0 && <details className="group mt-5 border border-ink/10 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-body-s font-medium"><span>Show {possibleFindings.length.toLocaleString()} lower-confidence signal{possibleFindings.length === 1 ? '' : 's'} — not selected</span><ChevronDown size={18} className="transition group-open:rotate-180" /></summary><div className="grid gap-4 border-t border-ink/10 bg-bone p-5 lg:grid-cols-2">{possibleFindings.map(findingCard)}</div></details>}
          {analysis.findings.length > 0 && <div className="mt-6 flex flex-col items-start justify-between gap-4 border border-ink/10 bg-white p-5 md:flex-row md:items-center"><p className="text-body-s text-ink/55">{selectedDomains.size} of {analysis.findings.length} accounts selected.</p><button type="button" onClick={() => void saveSelected()} disabled={saving || selectedDomains.size === 0} className={primaryButtonClass}><ShieldCheck size={17} className="mr-2" />{saving ? 'Saving privately…' : 'Save selected for review'}</button></div>}
        </section>
      )}

      <section className="mt-10">
        <div><p className="text-label uppercase text-gold">Saved summaries</p><h2 className="mt-2 text-2xl font-semibold">Your saved-logins findings</h2><p className="mt-2 text-body-s text-ink/55">Accept, reject, or mark each finding uncertain. Nothing is added to your timeline until you accept it and choose that action.</p></div>
        {loading ? <div className="mt-5 h-64 animate-pulse bg-white" /> : findings.length ? <div className="mt-5 grid gap-5 xl:grid-cols-2">{findings.map((finding) => (
          <article key={finding.id} className="border border-ink/10 bg-white p-6">
            <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-mist px-3 py-1 text-micro uppercase">{finding.confidence_score}% {confidenceLevel(finding.confidence_score)}</span><span className="rounded-full bg-mist px-3 py-1 text-micro uppercase">{finding.status}</span></div><h3 className="mt-4 text-xl font-semibold">{finding.service_name}</h3><p className="mt-1 text-body-s text-ink/45">{finding.domain} · {finding.row_count} saved entr{finding.row_count === 1 ? 'y' : 'ies'}</p></div><KeyRound className="shrink-0 text-gold" /></div>
            {finding.usernames.length > 0 && <p className="mt-4 text-body-s text-ink/60">Username(s): {finding.usernames.join(', ')}</p>}
            <p className="mt-4 text-body-s leading-relaxed text-ink/60">{finding.confidence_explanation}</p>
            <div className="mt-4 border border-ink/10 bg-bone p-4 text-body-s text-ink/55"><p className="truncate">Import: {importNames.get(finding.import_id) ?? 'Deleted import'}</p><p className="mt-1 text-micro">Stored summary only; no password was ever read or stored.</p></div>
            <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={finding.status === 'accepted'} onClick={() => void setStatus(finding, 'accepted')} className={secondaryButtonClass}><Check size={15} className="mr-1" />Accept</button><button type="button" disabled={finding.status === 'uncertain'} onClick={() => void setStatus(finding, 'uncertain')} className={secondaryButtonClass}><CircleHelp size={15} className="mr-1" />Uncertain</button><button type="button" disabled={finding.status === 'rejected'} onClick={() => void setStatus(finding, 'rejected')} className={`${secondaryButtonClass} text-red-700`}><X size={15} className="mr-1" />Reject</button>{finding.status === 'accepted' && !finding.timeline_event_id && <button type="button" disabled={creatingTimelineId === finding.id} onClick={() => void addToTimeline(finding)} className={primaryButtonClass}><History size={15} className="mr-1" />Add to timeline</button>}{finding.timeline_event_id && <span className="inline-flex items-center rounded-pill bg-emerald-50 px-4 py-2 text-body-s text-emerald-800"><Check size={15} className="mr-1" />Added to timeline</span>}</div>
          </article>
        ))}</div> : <div className="mt-5"><EmptyState title="No saved-logins findings saved" description="Import a saved-logins .csv export, then choose which accounts EchoTrace may save." /></div>}
      </section>

      {imports.length > 0 && <section className="mt-10 border border-ink/10 bg-white p-6"><p className="text-label uppercase text-gold">Import records</p><div className="mt-4 divide-y divide-ink/10">{imports.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><FileArchive className="shrink-0 text-gold" /><div className="min-w-0"><p className="truncate font-medium">{item.original_name}</p><p className="text-body-s text-ink/45">{item.rows_scanned.toLocaleString()} scanned · {item.findings_count} saved · {new Date(item.created_at).toLocaleDateString()}</p></div></div><button type="button" onClick={() => void removeImport(item)} className="inline-flex items-center text-body-s text-red-700 hover:underline"><Trash2 size={15} className="mr-1" />Delete saved summary</button></div>)}</div></section>}
    </>
  )
}
