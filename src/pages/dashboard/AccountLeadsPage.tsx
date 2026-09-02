import { ArrowUpRight, Check, CircleHelp, ExternalLink, FileText, Search, X } from 'lucide-react'
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

interface Evidence {
  id: string
  lead_id: string
  source_url: string | null
  notes: string | null
  archive_file_id: string | null
  captured_at: string
}

interface ArchiveFileOption {
  id: string
  original_name: string
  mime_type: string
}

const statusCopy: Record<LeadStatus, { label: string; className: string }> = {
  possible: { label: 'Possible', className: 'bg-amber-100 text-amber-900' },
  likely: { label: 'Likely', className: 'bg-emerald-100 text-emerald-800' },
  not_mine: { label: 'Not mine', className: 'bg-slate-100 text-slate-700' },
}

const screenshotTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const maxEvidenceFileBytes = 10 * 1024 * 1024

function googleSearch(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160)
}

export function AccountLeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [archiveFiles, setArchiveFiles] = useState<ArchiveFileOption[]>([])
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [evidenceLead, setEvidenceLead] = useState<Lead | null>(null)
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceNotes, setEvidenceNotes] = useState('')
  const [evidenceFileId, setEvidenceFileId] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)

  const load = async () => {
    if (!supabase || !user) return
    const [leadResult, evidenceResult, archiveResult] = await Promise.all([
      supabase.from('account_discovery_leads').select('*').order('confidence_score', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('account_discovery_evidence').select('*').order('captured_at', { ascending: false }),
      supabase.from('archive_files').select('id, original_name, mime_type').order('created_at', { ascending: false }),
    ])
    if (leadResult.error) toast.error('Account leads could not be loaded.')
    else setLeads((leadResult.data ?? []) as Lead[])
    if (!evidenceResult.error) setEvidence((evidenceResult.data ?? []) as Evidence[])
    if (!archiveResult.error) setArchiveFiles((archiveResult.data ?? []) as ArchiveFileOption[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [user])

  const visible = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (filter === 'all' || lead.status === filter) &&
          `${lead.platform} ${lead.category} ${lead.identifier_value}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [leads, filter, search],
  )

  const setStatus = async (lead: Lead, status: LeadStatus) => {
    if (!supabase) return
    setSavingId(lead.id)
    const { error } = await supabase.from('account_discovery_leads').update({ status }).eq('id', lead.id)
    setSavingId(null)
    if (error) toast.error('The lead status could not be updated.')
    else {
      setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, status } : item)))
      toast.success(status === 'likely' ? 'Marked as likely.' : status === 'not_mine' ? 'Marked as not mine.' : 'Marked as possible.')
    }
  }

  const resetEvidenceDialog = () => {
    setEvidenceLead(null)
    setEvidenceUrl('')
    setEvidenceNotes('')
    setEvidenceFileId('')
    setScreenshotFile(null)
  }

  const saveEvidence = async () => {
    if (!supabase || !user || !evidenceLead) return

    const url = evidenceUrl.trim()
    if (url) {
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
      } catch {
        return toast.error('Enter a complete http:// or https:// source URL.')
      }
    }

    if (screenshotFile) {
      if (!screenshotTypes.includes(screenshotFile.type)) {
        return toast.error('Screenshots must be JPG, PNG, WebP, or GIF images.')
      }
      if (screenshotFile.size < 1 || screenshotFile.size > maxEvidenceFileBytes) {
        return toast.error('Screenshots must be smaller than 10 MB.')
      }
    }

    if (!url && !evidenceNotes.trim() && !evidenceFileId && !screenshotFile) {
      return toast.error('Add a source URL, note, screenshot, or private archive file.')
    }

    const hasScreenshot = Boolean(screenshotFile)
    setSavingId(evidenceLead.id)

    let uploadedArchiveFileId: string | null = evidenceFileId || null
    let uploadedStoragePath: string | null = null

    if (screenshotFile) {
      const storagePath = `${user.id}/account-leads/${evidenceLead.id}/${crypto.randomUUID()}-${safeFileName(screenshotFile.name)}`
      const upload = await supabase.storage.from('private-archives').upload(storagePath, screenshotFile, {
        cacheControl: '3600',
        contentType: screenshotFile.type,
        upsert: false,
      })

      if (upload.error) {
        setSavingId(null)
        return toast.error('The screenshot could not be uploaded.')
      }

      uploadedStoragePath = storagePath

      const archiveInsert = await supabase
        .from('archive_files')
        .insert({
          user_id: user.id,
          storage_path: storagePath,
          original_name: screenshotFile.name.slice(0, 180),
          mime_type: screenshotFile.type,
          size_bytes: screenshotFile.size,
          description: `Account discovery screenshot evidence for ${evidenceLead.platform}.`,
        })
        .select('id')
        .single()

      if (archiveInsert.error || !archiveInsert.data) {
        await supabase.storage.from('private-archives').remove([storagePath])
        setSavingId(null)
        return toast.error('The screenshot record could not be saved.')
      }

      uploadedArchiveFileId = archiveInsert.data.id
    }

    const { data, error } = await supabase
      .from('account_discovery_evidence')
      .insert({
        user_id: user.id,
        lead_id: evidenceLead.id,
        source_url: url || null,
        notes: evidenceNotes.trim() || null,
        archive_file_id: uploadedArchiveFileId,
      })
      .select('*')
      .single()

    if (error) {
      if (uploadedStoragePath) {
        await supabase.storage.from('private-archives').remove([uploadedStoragePath])
        if (uploadedArchiveFileId && !evidenceFileId) {
          await supabase.from('archive_files').delete().eq('id', uploadedArchiveFileId)
        }
      }
      setSavingId(null)
      return toast.error('Evidence could not be saved.')
    }

    if (data) setEvidence((current) => [data as Evidence, ...current])

    if (url && !evidenceLead.source_url) {
      const updated = await supabase.from('account_discovery_leads').update({ source_url: url }).eq('id', evidenceLead.id)
      if (!updated.error) {
        setLeads((current) => current.map((item) => (item.id === evidenceLead.id ? { ...item, source_url: url } : item)))
      }
    }

    setSavingId(null)
    resetEvidenceDialog()
    toast.success(hasScreenshot ? 'Evidence and screenshot saved to this account lead.' : 'Evidence saved to this account lead.')
  }

  const deleteEvidence = async (item: Evidence) => {
    if (!supabase) return
    const { error } = await supabase.from('account_discovery_evidence').delete().eq('id', item.id)
    if (error) toast.error('Evidence could not be deleted.')
    else {
      setEvidence((current) => current.filter(({ id }) => id !== item.id))
      toast.success('Evidence deleted.')
    }
  }

  const saveAsMatch = async (lead: Lead) => {
    if (!supabase || !user) return
    setSavingId(lead.id)
    const source = lead.source_url ?? googleSearch(lead.search_query)
    const { error } = await supabase.from('possible_matches').insert({
      user_id: user.id,
      platform: lead.platform,
      result_title: `${lead.platform} account lead`,
      source_url: source,
      normalized_source_url: source,
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

  const createTimelineEvent = async (lead: Lead) => {
    if (!supabase || !user) return
    const source = lead.source_url ?? evidence.find((item) => item.lead_id === lead.id)?.source_url ?? null
    setSavingId(lead.id)
    const { error } = await supabase.from('timeline_events').insert({
      user_id: user.id,
      title: `${lead.platform} account`,
      description: `Account lead marked likely by the user. EchoTrace did not independently verify ownership. Identifier: ${lead.identifier_value}.`,
      event_date: null,
      end_date: null,
      date_precision: 'unknown',
      approximate_year: null,
      approximate_month: null,
      platform: lead.platform,
      username_used: lead.identifier_type === 'username' ? lead.identifier_value : null,
      event_type: 'account_created',
      source_url: source,
      confidence: 'medium',
      tags: ['account-discovery', 'user-confirmed-lead'],
      notes: lead.notes,
    })
    setSavingId(null)
    if (error) toast.error('The timeline event could not be created.')
    else toast.success('Account added to your timeline.')
  }

  const openEvidence = (lead: Lead) => {
    setEvidenceLead(lead)
    setEvidenceUrl(lead.source_url ?? '')
    setEvidenceNotes('')
    setEvidenceFileId('')
    setScreenshotFile(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Account discovery"
        title="Account leads"
        description="These are search leads generated from information you supplied. They are not claims that an account belongs to you. Open the search, review the public source yourself, then decide what to keep."
      />

      <section className="mb-7 border border-ink/10 bg-charcoal p-6 text-bone lg:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-label uppercase text-gold">Your review queue</p>
            <h2 className="mt-2 text-2xl font-semibold">Start with the strongest clues.</h2>
            <p className="mt-2 max-w-2xl text-body-s leading-relaxed text-bone/60">
              EchoTrace never silently confirms an account. You make the final call after seeing the public source.
            </p>
          </div>
          <a
            href="/dashboard/discover"
            className="inline-flex items-center gap-2 rounded-pill border border-gold px-5 py-3 text-body-s text-gold hover:bg-gold hover:text-ink"
          >
            Add more clues <ArrowUpRight size={15} />
          </a>
        </div>
      </section>

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="flex items-center border border-ink/10 bg-white px-4">
          <Search size={17} className="text-ink/35" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leads"
            aria-label="Search account leads"
            className="w-full bg-transparent px-3 py-3 outline-none"
          />
        </label>
        <select
          aria-label="Filter account leads"
          value={filter}
          onChange={(event) => setFilter(event.target.value as LeadStatus | 'all')}
          className={`${inputClass} bg-white`}
        >
          <option value="all">All leads</option>
          <option value="likely">Likely</option>
          <option value="possible">Possible</option>
          <option value="not_mine">Not mine</option>
        </select>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse bg-white" />
      ) : visible.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {visible.map((lead) => {
            const status = statusCopy[lead.status]
            const leadEvidence = evidence.filter((item) => item.lead_id === lead.id)
            const searchHref = lead.source_url ?? googleSearch(lead.search_query)

            return (
              <article key={lead.id} className="border border-ink/10 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-micro uppercase ${status.className}`}>{status.label}</span>
                      <span className="rounded-full bg-mist px-3 py-1 text-micro uppercase">{lead.confidence_score}% signal</span>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold">{lead.platform}</h2>
                    <p className="mt-1 text-body-s text-ink/45">
                      From {lead.identifier_type.replace('_', ' ')} · {lead.identifier_value}
                    </p>
                  </div>
                  <ExternalLink size={18} className="text-gold" />
                </div>

                <p className="mt-5 text-body-s leading-relaxed text-ink/65">{lead.confidence_reason}</p>

                <div className="mt-5 border border-ink/10 bg-bone p-4">
                  <p className="text-body-s font-medium">Review the public source</p>
                  <p className="mt-1 text-body-s text-ink/55">
                    Open the guided search, inspect the result yourself, then capture the original source or a private screenshot as evidence.
                  </p>
                  <a
                    href={searchHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-body-s font-medium underline decoration-gold underline-offset-4"
                  >
                    Open guided search <ArrowUpRight size={15} />
                  </a>
                </div>

                <div className="mt-5 border border-gold/30 bg-gold/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-body-s font-semibold">Found something that looks like yours?</p>
                      <p className="mt-1 text-body-s text-ink/55">Capture the source, what you recognized, or a private screenshot.</p>
                    </div>
                    <button
                      type="button"
                      disabled={savingId === lead.id}
                      onClick={() => openEvidence(lead)}
                      className={`${primaryButtonClass} shrink-0`}
                    >
                      <FileText size={15} className="mr-1" />
                      Capture evidence
                    </button>
                  </div>
                </div>

                {leadEvidence.length > 0 && (
                  <div className="mt-5 border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-body-s font-medium text-emerald-900">Evidence attached · {leadEvidence.length}</p>
                    <ul className="mt-2 space-y-2">
                      {leadEvidence.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-3 text-body-s text-emerald-900/75">
                          <span className="min-w-0">
                            {item.source_url ? (
                              <a href={item.source_url} target="_blank" rel="noreferrer" className="block truncate underline">
                                {item.source_url}
                              </a>
                            ) : null}
                            {item.notes ? <span className="block">{item.notes}</span> : null}
                            {item.archive_file_id ? (
                              <span className="flex items-center gap-1">
                                <FileText size={13} />
                                Private evidence file attached
                              </span>
                            ) : null}
                          </span>
                          <button type="button" onClick={() => void deleteEvidence(item)} className="shrink-0 text-red-700 underline">
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" disabled={savingId === lead.id} onClick={() => void setStatus(lead, 'likely')} className={secondaryButtonClass}>
                    <Check size={15} className="mr-1" />Likely mine
                  </button>
                  <button type="button" disabled={savingId === lead.id} onClick={() => void setStatus(lead, 'possible')} className={secondaryButtonClass}>
                    <CircleHelp size={15} className="mr-1" />Keep possible
                  </button>
                  <button type="button" disabled={savingId === lead.id} onClick={() => void setStatus(lead, 'not_mine')} className={secondaryButtonClass}>
                    <X size={15} className="mr-1" />Not mine
                  </button>
                  <button type="button" disabled={savingId === lead.id} onClick={() => openEvidence(lead)} className={secondaryButtonClass}>
                    Add evidence
                  </button>
                  <button type="button" disabled={savingId === lead.id} onClick={() => void saveAsMatch(lead)} className={primaryButtonClass}>
                    Save for review
                  </button>
                  {lead.status === 'likely' && (
                    <button type="button" disabled={savingId === lead.id} onClick={() => void createTimelineEvent(lead)} className={primaryButtonClass}>
                      Add to timeline
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="border border-dashed border-ink/15 bg-white p-10 text-center">
          <p className="text-xl font-semibold">No account leads yet.</p>
          <p className="mt-2 text-body-s text-ink/55">
            Start with an old email, username, or display name. EchoTrace will create guided search leads for you.
          </p>
          <a
            href="/dashboard/discover"
            className="mt-5 inline-flex items-center gap-2 rounded-pill bg-ink px-5 py-3 text-body-s text-bone hover:bg-gold hover:text-ink"
          >
            Start account discovery <ArrowUpRight size={15} />
          </a>
        </div>
      )}

      {evidenceLead && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto border border-ink/10 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label uppercase text-gold">Evidence capture</p>
                <h2 className="mt-1 text-2xl font-semibold">Support this account lead</h2>
                <p className="mt-2 text-body-s text-ink/55">
                  Save the original source, what you recognized, or a private screenshot. Evidence is tied to this lead and stays owner-only.
                </p>
              </div>
              <button type="button" onClick={resetEvidenceDialog} className="rounded p-2 hover:bg-mist" aria-label="Close evidence dialog">
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-body-s font-medium">Original source URL</span>
                <input
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder="https://example.com/your-profile"
                  className={`${inputClass} mt-2`}
                />
              </label>

              <label className="block">
                <span className="text-body-s font-medium">What did you recognize?</span>
                <textarea
                  value={evidenceNotes}
                  onChange={(event) => setEvidenceNotes(event.target.value)}
                  rows={4}
                  placeholder="Example: same username and profile photo I remember from 2014."
                  className={`${inputClass} mt-2`}
                />
              </label>

              <div className="border border-gold/30 bg-gold/5 p-4">
                <p className="text-body-s font-semibold">
                  Upload a screenshot <span className="font-normal text-ink/50">(optional)</span>
                </p>
                <p className="mt-1 text-body-s text-ink/55">
                  Save a screenshot of the public result you reviewed. JPG, PNG, WebP, or GIF up to 10 MB.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => setScreenshotFile(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-body-s"
                />
                {screenshotFile && (
                  <div className="mt-2 flex items-center justify-between gap-3 text-body-s text-ink/60">
                    <span className="truncate">{screenshotFile.name}</span>
                    <button type="button" onClick={() => setScreenshotFile(null)} className="shrink-0 underline">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <details className="border border-ink/10 bg-bone p-4">
                <summary className="cursor-pointer text-body-s font-medium">Advanced: attach an existing private archive file</summary>
                <label className="mt-4 block">
                  <span className="text-body-s text-ink/60">Existing archive file</span>
                  <select
                    value={evidenceFileId}
                    onChange={(event) => setEvidenceFileId(event.target.value)}
                    className={`${inputClass} mt-2`}
                  >
                    <option value="">None</option>
                    {archiveFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.original_name} · {file.mime_type}
                      </option>
                    ))}
                  </select>
                </label>
              </details>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={resetEvidenceDialog} className={secondaryButtonClass}>
                Cancel
              </button>
              <button type="button" disabled={savingId === evidenceLead.id} onClick={() => void saveEvidence()} className={primaryButtonClass}>
                {savingId === evidenceLead.id ? 'Saving…' : 'Save evidence'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
