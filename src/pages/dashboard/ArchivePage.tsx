import { Download, Eye, File, Link2, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, Modal, PageHeader } from '../../components/DashboardUI'
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { formatBytes, safeStorageName, validateArchiveFile } from '../../lib/files'
import { supabase } from '../../lib/supabase'
import type { ArchiveFile, TimelineEvent } from '../../types/echo'

export function ArchivePage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<ArchiveFile[]>([])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [linking, setLinking] = useState<ArchiveFile | null>(null)
  const [selectedEvent, setSelectedEvent] = useState('')
  const [file, setFile] = useState<globalThis.File | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!supabase) return
    const [fileResult, eventResult] = await Promise.all([
      supabase.from('archive_files').select('*').order('created_at', { ascending: false }),
      supabase.from('timeline_events').select('*').order('created_at', { ascending: false }),
    ])
    if (fileResult.error) toast.error('Your private archive could not be loaded.')
    else setFiles((fileResult.data ?? []) as ArchiveFile[])
    setEvents((eventResult.data ?? []) as TimelineEvent[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !file) return toast.error('Choose a file.')
    const validation = validateArchiveFile(file)
    if (!validation.valid) return toast.error(validation.error)
    setUploading(true)
    const storagePath = `${user.id}/${safeStorageName(file.name)}`
    const upload = await supabase.storage.from('private-archives').upload(storagePath, file, { contentType: file.type, upsert: false })
    if (upload.error) { setUploading(false); return toast.error('Upload failed. Check the file and try again.') }
    const metadata = await supabase.from('archive_files').insert({ user_id: user.id, storage_path: storagePath, original_name: file.name, mime_type: file.type, size_bytes: file.size, description: description.trim() || null })
    if (metadata.error) { await supabase.storage.from('private-archives').remove([storagePath]); setUploading(false); return toast.error('File metadata could not be secured.') }
    setUploading(false); setUploadOpen(false); setFile(null); setDescription(''); toast.success('File added to your private archive.'); void load()
  }

  const download = async (item: ArchiveFile) => {
    if (!supabase) return
    const { data, error } = await supabase.storage.from('private-archives').createSignedUrl(item.storage_path, 60, { download: item.original_name })
    if (error || !data) toast.error('A private download link could not be created.')
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const preview = async (item: ArchiveFile) => {
    if (!supabase) return
    const { data, error } = await supabase.storage.from('private-archives').createSignedUrl(item.storage_path, 60)
    if (error || !data) toast.error('A private preview link could not be created.')
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const remove = async (item: ArchiveFile) => {
    if (!supabase || !window.confirm(`Permanently delete “${item.original_name}”? This cannot be undone.`)) return
    const storage = await supabase.storage.from('private-archives').remove([item.storage_path])
    if (storage.error) return toast.error('The private file could not be deleted.')
    const { error } = await supabase.from('archive_files').delete().eq('id', item.id)
    if (error) toast.error('The file record could not be deleted.')
    else { toast.success('Private file permanently deleted.'); setFiles((current) => current.filter(({ id }) => id !== item.id)) }
  }

  const link = async () => {
    if (!supabase || !user || !linking || !selectedEvent) return
    const { error } = await supabase.from('event_files').upsert({ user_id: user.id, event_id: selectedEvent, archive_file_id: linking.id })
    if (error) toast.error('The file could not be linked to that event.')
    else { toast.success('File linked to timeline event.'); setLinking(null); setSelectedEvent('') }
  }

  return (
    <>
      <PageHeader eyebrow="Private supporting evidence" title="Personal archive" description="Upload screenshots and files to a private bucket isolated by your user ID. Files are limited to 10 MB and are never public." action={<button type="button" onClick={() => setUploadOpen(true)} className={primaryButtonClass}><Upload size={17} className="mr-2" />Upload file</button>} />
      <div className="mb-6 border border-ink/10 bg-white p-4 text-body-s text-ink/60">Allowed: JPG, PNG, WebP, GIF, PDF, TXT, JSON, and CSV · Maximum 10 MB · Private signed downloads expire after 60 seconds</div>
      {loading ? <div className="h-64 animate-pulse bg-white" /> : files.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{files.map((item) => <article key={item.id} className="border border-ink/10 bg-white p-6"><div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded bg-mist"><File size={22} className="text-gold" /></div><span className="text-micro uppercase text-ink/40">{item.mime_type.split('/').pop()}</span></div><h2 className="mt-5 truncate font-semibold" title={item.original_name}>{item.original_name}</h2><p className="mt-1 text-body-s text-ink/45">{formatBytes(item.size_bytes)} · {new Date(item.created_at).toLocaleDateString()}</p>{item.description && <p className="mt-3 line-clamp-2 text-body-s text-ink/60">{item.description}</p>}<div className="mt-5 flex flex-wrap gap-2">{(item.mime_type.startsWith('image/') || item.mime_type === 'application/pdf' || item.mime_type.startsWith('text/')) && <button type="button" onClick={() => void preview(item)} className={secondaryButtonClass}><Eye size={15} className="mr-1" />Preview</button>}<button type="button" onClick={() => void download(item)} className={secondaryButtonClass}><Download size={15} className="mr-1" />Download</button><button type="button" onClick={() => setLinking(item)} className={secondaryButtonClass}><Link2 size={15} className="mr-1" />Link</button><button type="button" onClick={() => void remove(item)} className="rounded p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${item.original_name}`}><Trash2 size={17} /></button></div></article>)}</div> : <EmptyState title="Your private archive is empty" description="Add a screenshot, image, PDF, text note, JSON export, or CSV export that supports your timeline." action={<button type="button" onClick={() => setUploadOpen(true)} className={primaryButtonClass}><Plus size={16} className="mr-2" />Upload first file</button>} />}
      {uploadOpen && <Modal title="Upload private file" description="The file will be stored in a private, owner-isolated Supabase bucket." onClose={() => setUploadOpen(false)}><form onSubmit={submit} className="space-y-5"><Field label="Choose file" htmlFor="archive-upload"><input id="archive-upload" type="file" required accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/json,text/csv,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={`${inputClass} file:mr-4 file:border-0 file:bg-mist file:px-3 file:py-2`} /></Field><Field label="Description (optional)" htmlFor="file-description"><textarea id="file-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} /></Field><div className="flex justify-end gap-3"><button type="button" onClick={() => setUploadOpen(false)} className={secondaryButtonClass}>Cancel</button><button type="submit" disabled={uploading} className={primaryButtonClass}>{uploading ? 'Encrypting and uploading…' : 'Upload privately'}</button></div></form></Modal>}
      {linking && <Modal title="Link file to timeline" description={`Choose an event for “${linking.original_name}”.`} onClose={() => setLinking(null)}><Field label="Timeline event" htmlFor="link-event"><select id="link-event" value={selectedEvent} onChange={(event) => setSelectedEvent(event.target.value)} className={inputClass}><option value="">Choose an event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></Field><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setLinking(null)} className={secondaryButtonClass}>Cancel</button><button type="button" onClick={() => void link()} disabled={!selectedEvent} className={primaryButtonClass}>Link file</button></div></Modal>}
    </>
  )
}
