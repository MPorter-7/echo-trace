import { CalendarDays, List, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, Modal, PageHeader } from '../../components/DashboardUI'
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { supabase } from '../../lib/supabase'
import { saveTimelineEventWithAttachment } from '../../lib/timeline'
import { validateTimelineEvent } from '../../lib/validation'
import type { ArchiveFile, ConfidenceLevel, DatePrecision, TimelineEvent } from '../../types/echo'

const EVENT_TYPES = [
  ['account_created', 'Account created'], ['post', 'Post or publication'], ['photo_media', 'Photo or media'],
  ['forum_activity', 'Forum activity'], ['website', 'Website'], ['message', 'Message or communication'],
  ['achievement', 'Achievement'], ['account_closed', 'Account closed'], ['platform_shutdown', 'Platform shutdown'],
  ['recovered_memory', 'Recovered memory'], ['other', 'Other'],
]
const emptyForm = { title: '', description: '', datePrecision: 'unknown' as DatePrecision, eventDate: '', approximateYear: '', approximateMonth: '', endDate: '', platform: '', username: '', eventType: 'recovered_memory', sourceUrl: '', confidence: 'medium' as ConfidenceLevel, tags: '', notes: '', archiveFileId: '' }

function eventDateLabel(event: TimelineEvent) {
  const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString()
  if (event.event_date && event.end_date && event.event_date !== event.end_date) return `${formatDate(event.event_date)} – ${formatDate(event.end_date)}`
  if (event.date_precision === 'unknown' && event.event_date) return `After ${formatDate(event.event_date)}`
  if (event.date_precision === 'unknown' && event.end_date) return `Through ${formatDate(event.end_date)}`
  if (event.date_precision === 'exact' && event.event_date) return new Date(`${event.event_date}T12:00:00`).toLocaleDateString()
  if (event.date_precision === 'month' && event.approximate_year && event.approximate_month) return new Date(event.approximate_year, event.approximate_month - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  if (event.date_precision === 'year' && event.approximate_year) return String(event.approximate_year)
  return 'Date unknown'
}

export function TimelinePage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [files, setFiles] = useState<ArchiveFile[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<TimelineEvent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'timeline' | 'list'>('timeline')
  const [filters, setFilters] = useState({ search: '', platform: '', eventType: '', confidence: '', year: '', sort: 'newest' })

  const load = async () => {
    if (!supabase) return
    const [eventResult, fileResult] = await Promise.all([
      supabase.from('timeline_events').select('*').order('created_at', { ascending: false }),
      supabase.from('archive_files').select('*').order('created_at', { ascending: false }),
    ])
    if (eventResult.error) toast.error('Timeline could not be loaded.')
    else setEvents((eventResult.data ?? []) as TimelineEvent[])
    setFiles((fileResult.data ?? []) as ArchiveFile[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => {
    const result = events.filter((event) => {
      const text = `${event.title} ${event.description ?? ''} ${event.platform ?? ''} ${event.tags.join(' ')}`.toLowerCase()
      const eventYear = event.event_date?.slice(0, 4) || event.approximate_year?.toString() || ''
      return text.includes(filters.search.toLowerCase()) && (!filters.platform || event.platform === filters.platform) && (!filters.eventType || event.event_type === filters.eventType) && (!filters.confidence || event.confidence === filters.confidence) && (!filters.year || eventYear === filters.year)
    })
    return result.sort((a, b) => {
      const aDate = a.event_date || (a.approximate_year ? `${a.approximate_year}-${String(a.approximate_month || 1).padStart(2, '0')}-01` : '0000-01-01')
      const bDate = b.event_date || (b.approximate_year ? `${b.approximate_year}-${String(b.approximate_month || 1).padStart(2, '0')}-01` : '0000-01-01')
      return filters.sort === 'oldest' ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate)
    })
  }, [events, filters])
  const platforms = Array.from(new Set(events.map((event) => event.platform).filter(Boolean))) as string[]

  const create = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const edit = (event: TimelineEvent) => { setEditing(event); setForm({ title: event.title, description: event.description ?? '', datePrecision: event.date_precision, eventDate: event.event_date ?? '', approximateYear: event.approximate_year?.toString() ?? '', approximateMonth: event.approximate_month?.toString() ?? '', endDate: event.end_date ?? '', platform: event.platform ?? '', username: event.username_used ?? '', eventType: event.event_type, sourceUrl: event.source_url ?? '', confidence: event.confidence, tags: event.tags.join(', '), notes: event.notes ?? '', archiveFileId: '' }); setModalOpen(true) }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return
    const client = supabase
    const validation = validateTimelineEvent(form)
    if (!validation.valid) return toast.error(validation.error)
    if (form.sourceUrl) { try { const url = new URL(form.sourceUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error() } catch { return toast.error('Enter a complete http:// or https:// source URL.') } }
    setSaving(true)
    const payload = {
      user_id: user.id, title: form.title.trim(), description: form.description.trim() || null,
      event_date: form.datePrecision === 'exact' ? form.eventDate : null, end_date: form.endDate || null,
      date_precision: form.datePrecision, approximate_year: ['month', 'year'].includes(form.datePrecision) ? Number(form.approximateYear) : null,
      approximate_month: form.datePrecision === 'month' ? Number(form.approximateMonth) : null,
      platform: form.platform.trim() || null, username_used: form.username.trim() || null, event_type: form.eventType,
      source_url: form.sourceUrl.trim() || null, confidence: form.confidence,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20), notes: form.notes.trim() || null,
    }
    const result = await saveTimelineEventWithAttachment(
      async () => {
        const saved = editing
          ? await client.from('timeline_events').update(payload).eq('id', editing.id).select('id').single()
          : await client.from('timeline_events').insert(payload).select('id').single()
        return { eventId: saved.data?.id ?? null, error: saved.error }
      },
      form.archiveFileId,
      async (eventId, archiveFileId) => {
        const { error } = await client.from('event_files').upsert({ user_id: user.id, event_id: eventId, archive_file_id: archiveFileId })
        return { error }
      },
    )
    setSaving(false)
    if (result.status === 'event-error') return toast.error('The timeline event could not be saved.')
    if (result.status === 'attachment-error') toast.error('The event was saved, but its archive file could not be attached. Edit the event to try again.')
    else toast.success(editing ? 'Timeline event updated.' : 'Memory added to your timeline.')
    setModalOpen(false)
    void load()
  }

  const remove = async (event: TimelineEvent) => {
    if (!supabase || !window.confirm(`Permanently delete “${event.title}”?`)) return
    const { error } = await supabase.from('timeline_events').delete().eq('id', event.id)
    if (error) toast.error('The event could not be deleted.')
    else { toast.success('Timeline event deleted.'); setEvents((current) => current.filter(({ id }) => id !== event.id)) }
  }

  const actions = (event: TimelineEvent) => <div className="flex gap-1"><button type="button" onClick={() => edit(event)} className="rounded p-2 hover:bg-mist" aria-label={`Edit ${event.title}`}><Pencil size={16} /></button><button type="button" onClick={() => void remove(event)} className="rounded p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${event.title}`}><Trash2 size={16} /></button></div>

  return (
    <>
      <PageHeader eyebrow="Optional manual record" title="Timeline" description="Confirmed evidence can build this record. Add something manually only when you happen to remember it—you do not need to reconstruct your history from memory." action={<button type="button" onClick={create} className={primaryButtonClass}><Plus size={17} className="mr-2" />Add memory</button>} />
      <section className="mb-6 grid gap-3 border border-ink/10 bg-white p-4 md:grid-cols-2 xl:grid-cols-6" aria-label="Timeline filters">
        <label className="relative xl:col-span-2"><span className="sr-only">Search timeline</span><Search size={16} className="absolute left-3 top-3.5 text-ink/35" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search timeline" className="w-full border border-ink/15 py-3 pl-10 pr-3 outline-none focus:border-gold" /></label>
        <select aria-label="Filter by platform" value={filters.platform} onChange={(event) => setFilters({ ...filters, platform: event.target.value })} className="border border-ink/15 px-3 py-2 outline-none focus:border-gold"><option value="">All platforms</option>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select>
        <select aria-label="Filter by event type" value={filters.eventType} onChange={(event) => setFilters({ ...filters, eventType: event.target.value })} className="border border-ink/15 px-3 py-2 outline-none focus:border-gold"><option value="">All types</option>{EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Filter by confidence" value={filters.confidence} onChange={(event) => setFilters({ ...filters, confidence: event.target.value })} className="border border-ink/15 px-3 py-2 outline-none focus:border-gold"><option value="">All confidence</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <input aria-label="Filter by year" type="number" min="1900" max={new Date().getFullYear()} value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} placeholder="Year" className="border border-ink/15 px-3 py-2 outline-none focus:border-gold" />
        <select aria-label="Sort timeline" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })} className="border border-ink/15 px-3 py-2 outline-none focus:border-gold"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      </section>
      <div className="mb-4 flex justify-end gap-2"><button type="button" onClick={() => setView('timeline')} aria-pressed={view === 'timeline'} className={`rounded p-2 ${view === 'timeline' ? 'bg-ink text-bone' : 'bg-white'}`} aria-label="Timeline view"><CalendarDays size={18} /></button><button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'} className={`rounded p-2 ${view === 'list' ? 'bg-ink text-bone' : 'bg-white'}`} aria-label="List view"><List size={18} /></button></div>
      {loading ? <div className="h-64 animate-pulse bg-white" /> : !visible.length ? <EmptyState title={events.length ? 'No events match these filters' : 'No confirmed history yet'} description={events.length ? 'Clear or change the filters above.' : 'Start reconstruction with your verified email and evidence. Manual memories are optional.'} action={!events.length && <div className="flex flex-wrap justify-center gap-3"><Link to="/dashboard/reconstruct" className={primaryButtonClass}>Start reconstruction</Link><button type="button" onClick={create} className={secondaryButtonClass}>Add a memory instead</button></div>} /> : view === 'timeline' ? (
        <div className="relative space-y-5 before:absolute before:bottom-0 before:left-[7px] before:top-0 before:w-px before:bg-gold/60 md:before:left-[119px]">{visible.map((event) => <article key={event.id} className="relative grid gap-3 pl-8 md:grid-cols-[100px_1fr] md:pl-0"><div className="text-body-s font-medium text-ink/55 md:text-right">{eventDateLabel(event)}</div><span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-mist bg-gold md:left-[112px]" /><div className="border border-ink/10 bg-white p-5 md:ml-8"><div className="flex items-start justify-between gap-4"><div><span className={`rounded-full px-2.5 py-1 text-micro uppercase ${event.confidence === 'high' ? 'bg-emerald-100 text-emerald-800' : event.confidence === 'medium' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{event.confidence}</span><h2 className="mt-3 text-xl font-semibold">{event.title}</h2><p className="mt-1 text-body-s text-ink/45">{event.platform || 'Personal memory'} · {EVENT_TYPES.find(([value]) => value === event.event_type)?.[1]}</p></div>{actions(event)}</div>{event.description && <p className="mt-4 text-body-s leading-relaxed text-ink/65">{event.description}</p>}{event.source_url && <a href={event.source_url} target="_blank" rel="noreferrer" className="mt-4 block truncate text-body-s text-blue-700 underline">Original source</a>}</div></article>)}</div>
      ) : <div className="overflow-x-auto border border-ink/10 bg-white"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-ink/10 bg-bone text-label uppercase text-ink/45"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Event</th><th className="px-5 py-4">Platform</th><th className="px-5 py-4">Confidence</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-ink/10">{visible.map((event) => <tr key={event.id}><td className="px-5 py-4 text-body-s">{eventDateLabel(event)}</td><td className="px-5 py-4 font-medium">{event.title}</td><td className="px-5 py-4 text-body-s text-ink/55">{event.platform || '—'}</td><td className="px-5 py-4 text-body-s capitalize">{event.confidence}</td><td className="px-5 py-4">{actions(event)}</td></tr>)}</tbody></table></div>}
      {modalOpen && <Modal wide title={editing ? 'Edit timeline event' : 'Add timeline event'} description="Approximate dates are welcome. Keep the original source whenever one exists." onClose={() => setModalOpen(false)}><form onSubmit={submit} className="grid gap-5 md:grid-cols-2"><div className="md:col-span-2"><Field label="Title" htmlFor="event-title"><input id="event-title" required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} /></Field></div><Field label="Event type" htmlFor="event-type"><select id="event-type" value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value })} className={inputClass}>{EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Date precision" htmlFor="date-precision"><select id="date-precision" value={form.datePrecision} onChange={(event) => setForm({ ...form, datePrecision: event.target.value as DatePrecision })} className={inputClass}><option value="exact">Exact date</option><option value="month">Month and year</option><option value="year">Year only</option><option value="unknown">Unknown date</option></select></Field>{form.datePrecision === 'exact' && <Field label="Event date" htmlFor="event-date"><input id="event-date" type="date" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} className={inputClass} /></Field>}{['month', 'year'].includes(form.datePrecision) && <Field label="Approximate year" htmlFor="approx-year"><input id="approx-year" type="number" min="1900" max={new Date().getFullYear()} value={form.approximateYear} onChange={(event) => setForm({ ...form, approximateYear: event.target.value })} className={inputClass} /></Field>}{form.datePrecision === 'month' && <Field label="Approximate month" htmlFor="approx-month"><select id="approx-month" value={form.approximateMonth} onChange={(event) => setForm({ ...form, approximateMonth: event.target.value })} className={inputClass}><option value="">Choose month</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2000, index).toLocaleString(undefined, { month: 'long' })}</option>)}</select></Field>}<Field label="End date (optional)" htmlFor="end-date"><input id="end-date" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className={inputClass} /></Field><Field label="Platform or website" htmlFor="platform"><input id="platform" value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} className={inputClass} /></Field><Field label="Username used" htmlFor="username"><input id="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className={inputClass} /></Field><Field label="Confidence" htmlFor="confidence"><select id="confidence" value={form.confidence} onChange={(event) => setForm({ ...form, confidence: event.target.value as ConfidenceLevel })} className={inputClass}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field><Field label="Original source URL" htmlFor="source-url"><input id="source-url" type="url" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="https://" className={inputClass} /></Field><Field label="Tags" htmlFor="tags" hint="Comma-separated"><input id="tags" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className={inputClass} /></Field><Field label="Attach archive file" htmlFor="archive-file"><select id="archive-file" value={form.archiveFileId} onChange={(event) => setForm({ ...form, archiveFileId: event.target.value })} className={inputClass}><option value="">No attachment</option>{files.map((file) => <option key={file.id} value={file.id}>{file.original_name}</option>)}</select></Field><div className="md:col-span-2"><Field label="Description" htmlFor="description"><textarea id="description" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} /></Field></div><div className="md:col-span-2"><Field label="Private notes" htmlFor="notes"><textarea id="notes" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={inputClass} /></Field></div><div className="flex justify-end gap-3 md:col-span-2"><button type="button" onClick={() => setModalOpen(false)} className={secondaryButtonClass}>Cancel</button><button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Saving…' : 'Save event'}</button></div></form></Modal>}
    </>
  )
}
