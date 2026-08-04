import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, Modal, PageHeader } from '../../components/DashboardUI'
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { supabase } from '../../lib/supabase'
import { validateIdentifier } from '../../lib/validation'
import type { Identifier, IdentifierType } from '../../types/echo'

const TYPES: Array<{ value: IdentifierType; label: string }> = [
  { value: 'username', label: 'Username' }, { value: 'email', label: 'Historical email' },
  { value: 'profile_url', label: 'Profile URL' }, { value: 'website', label: 'Personal website' },
  { value: 'display_name', label: 'Display name' }, { value: 'custom', label: 'Custom identifier' },
]

const emptyForm = { type: 'username' as IdentifierType, value: '', label: '', notes: '' }

export function IdentifiersPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Identifier[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<Identifier | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('identifiers').select('*').order('created_at', { ascending: false })
    if (error) toast.error('Identifiers could not be loaded.')
    else setItems((data ?? []) as Identifier[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => items.filter((item) => `${item.value} ${item.label ?? ''} ${item.type}`.toLowerCase().includes(search.toLowerCase())), [items, search])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (item: Identifier) => { setEditing(item); setForm({ type: item.type, value: item.value, label: item.label ?? '', notes: item.notes ?? '' }); setModalOpen(true) }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return
    const validation = validateIdentifier(form.type, form.value)
    if (!validation.valid) return toast.error(validation.error)
    setSaving(true)
    const payload = {
      user_id: user.id,
      type: form.type,
      value: validation.normalized ?? form.value.trim(),
      normalized_value: (validation.normalized ?? form.value.trim()).toLowerCase(),
      label: form.label.trim() || null,
      notes: form.notes.trim() || null,
      verification_status: editing?.verification_status ?? (form.type === 'email' ? 'unverified_historical' : 'user_supplied'),
      verification_method: editing?.verification_method ?? (form.type === 'email' ? 'Supplied by user; not currently verified' : 'Supplied by user'),
    }
    const { error } = editing
      ? await supabase.from('identifiers').update(payload).eq('id', editing.id)
      : await supabase.from('identifiers').insert(payload)
    setSaving(false)
    if (error?.code === '23505') toast.error('That identifier is already in your archive.')
    else if (error) toast.error('The identifier could not be saved.')
    else { toast.success(editing ? 'Identifier updated.' : 'Identifier added.'); setModalOpen(false); void load() }
  }

  const remove = async (item: Identifier) => {
    if (!supabase || !window.confirm(`Permanently delete “${item.value}”?`)) return
    const { error } = await supabase.from('identifiers').delete().eq('id', item.id)
    if (error) toast.error('The identifier could not be deleted.')
    else { toast.success('Identifier deleted.'); setItems((current) => current.filter(({ id }) => id !== item.id)) }
  }

  return (
    <>
      <PageHeader eyebrow="Identity clues" title="My identifiers" description="Your verified signup email is added automatically as the first reconstruction clue. Add older emails, usernames, and public URLs only when they belong to you." action={<button type="button" onClick={openCreate} className={primaryButtonClass}><Plus size={17} className="mr-2" />Add identifier</button>} />
      <div className="mb-5 flex items-center border border-ink/10 bg-white px-4"><Search size={17} className="text-ink/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search identifiers" aria-label="Search identifiers" className="w-full bg-transparent px-3 py-3 outline-none" /></div>
      {loading ? <div className="h-48 animate-pulse bg-white" /> : visible.length ? (
        <div className="overflow-x-auto border border-ink/10 bg-white"><table className="w-full min-w-[720px] text-left"><thead className="border-b border-ink/10 bg-bone text-label uppercase text-ink/45"><tr><th className="px-5 py-4">Type</th><th className="px-5 py-4">Value</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Added</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-ink/10">{visible.map((item) => <tr key={item.id}><td className="px-5 py-4 text-body-s capitalize">{item.type.replace('_', ' ')}</td><td className="max-w-sm px-5 py-4"><p className="truncate font-medium">{item.value}</p>{item.label && <p className="text-body-s text-ink/45">{item.label}</p>}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-micro uppercase ${item.verification_status === 'verified_account' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{item.verification_status.replaceAll('_', ' ')}</span></td><td className="px-5 py-4 text-body-s text-ink/45">{new Date(item.created_at).toLocaleDateString()}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(item)} className="rounded p-2 hover:bg-mist" aria-label={`Edit ${item.value}`}><Pencil size={17} /></button><button type="button" onClick={() => void remove(item)} className="rounded p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${item.value}`}><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div>
      ) : <EmptyState title={search ? 'No identifiers match' : 'Your verified email is being prepared'} description={search ? 'Try a different search term.' : 'Refresh once after email verification. Then add an older email or username only if you have one.'} action={!search && <button type="button" onClick={openCreate} className={primaryButtonClass}>Add another identifier</button>} />}
      {modalOpen && <Modal title={editing ? 'Edit identifier' : 'Add identifier'} description="Only add identifiers that belong to you." onClose={() => setModalOpen(false)}><form onSubmit={submit} className="space-y-5"><Field label="Identifier type" htmlFor="identifier-type"><select id="identifier-type" disabled={editing?.verification_status === 'verified_account'} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as IdentifierType })} className={inputClass}>{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field><Field label="Value" htmlFor="identifier-value" hint={editing?.verification_status === 'verified_account' ? 'Verified by your Supabase Auth account and cannot be changed here.' : form.type === 'email' ? 'Saved as an unverified historical email.' : undefined}><input id="identifier-value" required disabled={editing?.verification_status === 'verified_account'} value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} className={inputClass} /></Field><Field label="Label (optional)" htmlFor="identifier-label"><input id="identifier-label" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Example: college account" className={inputClass} /></Field><Field label="Notes (optional)" htmlFor="identifier-notes"><textarea id="identifier-notes" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={inputClass} /></Field><div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className={secondaryButtonClass}>Cancel</button><button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Saving…' : 'Save identifier'}</button></div></form></Modal>}
    </>
  )
}
