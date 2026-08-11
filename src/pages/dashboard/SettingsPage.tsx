import { CreditCard, Download, KeyRound, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { useBilling } from '../../billing/BillingContext'
import { ConfirmButton, PageHeader } from '../../components/DashboardUI'
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { resetApplicationData } from '../../lib/applicationData'
import { downloadText, rowsToCsv } from '../../lib/export'
import { supabase } from '../../lib/supabase'
import { validateDisplayName } from '../../lib/validation'

const EXPORT_TABLES = ['profiles', 'identifiers', 'timeline_events', 'possible_matches', 'email_imports', 'email_findings', 'archive_files', 'event_files', 'user_consents', 'activity_log'] as const

export function SettingsPage() {
  const { user, updatePassword, signOut } = useAuth()
  const { plan, billing, openPortal, startCheckout } = useBilling()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!supabase) return
    void supabase.from('profiles').select('display_name').maybeSingle().then(({ data }) => setDisplayName(data?.display_name ?? ''))
  }, [])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return
    const validation = validateDisplayName(displayName, false)
    if (!validation.valid) return toast.error(validation.error)
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: validation.normalized || null })
    setSaving(false)
    if (error) toast.error('Your profile could not be updated.')
    else toast.success('Profile updated.')
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8) return toast.error('Use at least 8 characters.')
    const result = await updatePassword(password)
    if (result.error) toast.error(result.error)
    else { setPassword(''); toast.success('Password updated.') }
  }

  const collectExport = async () => {
    if (!supabase) throw new Error('Supabase unavailable')
    const client = supabase
    const entries = await Promise.all(EXPORT_TABLES.map(async (table) => {
      const result = await client.from(table).select('*')
      if (result.error) throw new Error(`Export failed for ${table}`)
      return [table, result.data ?? []] as const
    }))
    return Object.fromEntries(entries) as Record<string, Array<Record<string, unknown>>>
  }

  const exportJson = async () => {
    if (plan === 'free') return toast.error('Exports require Recovery or Vault.')
    setWorking(true)
    try {
      const data = await collectExport()
      downloadText(`echotrace-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exported_at: new Date().toISOString(), account_email: user?.email, ...data }, null, 2), 'application/json')
      toast.success('JSON export downloaded.')
    } catch { toast.error('Your export could not be created.') }
    setWorking(false)
  }

  const exportCsv = async () => {
    if (plan === 'free') return toast.error('Exports require Recovery or Vault.')
    setWorking(true)
    try {
      const data = await collectExport()
      const sections = Object.entries(data).map(([table, rows]) => `# ${table}\n${rowsToCsv(rows)}`).join('\n\n')
      downloadText(`echotrace-export-${new Date().toISOString().slice(0, 10)}.csv`, sections, 'text/csv;charset=utf-8')
      toast.success('CSV export downloaded.')
    } catch { toast.error('Your export could not be created.') }
    setWorking(false)
  }

  const deleteApplicationData = async () => {
    if (!supabase || !user) return
    const client = supabase
    setWorking(true)
    const result = await resetApplicationData({
      listArchivePaths: async () => {
        const { data, error } = await client.from('archive_files').select('storage_path')
        return { paths: (data ?? []).map((file) => file.storage_path as string), error }
      },
      removeArchiveFiles: async (paths) => {
        const { error } = await client.storage.from('private-archives').remove(paths)
        return { error }
      },
      deleteDatabaseRecords: async () => {
        const { error } = await client.rpc('delete_my_application_data')
        return { error }
      },
    })
    setWorking(false)
    if (!result.ok) toast.error('Your data could not be fully deleted. No partial success is being claimed.')
    else { toast.success('All EchoTrace application data was permanently deleted.'); window.location.reload() }
  }

  const deleteAccount = async () => {
    if (!supabase) return
    setWorking(true)
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
    setWorking(false)
    if (error) toast.error('Your account was not deleted. Archive cleanup or account removal failed; please try again.')
    else { await signOut(); navigate('/', { replace: true }) }
  }

  const billingAction = async () => {
    setWorking(true)
    try {
      const url = billing?.stripe_customer_id ? await openPortal() : await startCheckout('recovery')
      window.location.assign(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Billing settings could not be opened.')
      setWorking(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Control center" title="Settings" description="Manage your verified account, exports, privacy choices, and permanent deletion controls." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="border border-ink/10 bg-white p-7"><p className="text-label uppercase text-gold">Profile</p><h2 className="mt-2 text-2xl font-semibold">Account identity</h2><div className="mt-5 border border-emerald-200 bg-emerald-50 p-4"><p className="text-micro uppercase text-emerald-700">Verified account email</p><p className="mt-1 font-medium text-emerald-950">{user?.email}</p><p className="mt-1 text-micro text-emerald-800">This label applies only to your authenticated account email—not historical emails you add.</p></div><form onSubmit={saveProfile} className="mt-5 space-y-5"><Field label="Display name" htmlFor="display-name" hint="120 characters maximum"><input id="display-name" maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} /></Field><button type="submit" disabled={saving} className={primaryButtonClass}><Save size={16} className="mr-2" />{saving ? 'Saving…' : 'Save profile'}</button></form></section>
        <section className="border border-ink/10 bg-white p-7"><p className="text-label uppercase text-gold">Security</p><h2 className="mt-2 text-2xl font-semibold">Change password</h2><form onSubmit={changePassword} className="mt-5 space-y-5"><Field label="New password" htmlFor="new-password" hint="At least 8 characters"><input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></Field><button type="submit" className={primaryButtonClass}><KeyRound size={16} className="mr-2" />Update password</button></form></section>
        <section className="border border-ink/10 bg-white p-7 xl:col-span-2"><p className="text-label uppercase text-gold">Billing</p><h2 className="mt-2 text-2xl font-semibold">{plan === 'vault' ? 'Vault plan' : plan === 'recovery' ? 'Recovery unlocked' : 'Free plan'}</h2><p className="mt-2 text-body-s text-ink/55">{plan === 'vault' ? `Your cumulative Vault access is active${billing?.cancel_at_period_end && billing.current_period_end ? ` until ${new Date(billing.current_period_end).toLocaleDateString()}` : ''}.` : plan === 'recovery' ? 'Your one-time Recovery purchase remains unlocked permanently.' : 'Upgrade when you are ready for complete recovery features.'}</p><button type="button" onClick={() => void billingAction()} disabled={working} className={`${primaryButtonClass} mt-5`}><CreditCard size={16} className="mr-2" />{billing?.stripe_customer_id ? 'Manage billing' : 'Unlock Recovery'}</button></section>
        <section className="border border-ink/10 bg-white p-7 xl:col-span-2"><p className="text-label uppercase text-gold">Portability</p><h2 className="mt-2 text-2xl font-semibold">Export your information</h2><p className="mt-2 max-w-2xl text-body-s text-ink/55">Download the private database records EchoTrace stores for your account. Original archive files are downloaded individually from Personal Archive. {plan === 'free' && 'Exports unlock with Recovery or Vault.'}</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void exportJson()} disabled={working} className={primaryButtonClass}><Download size={16} className="mr-2" />Export JSON</button><button type="button" onClick={() => void exportCsv()} disabled={working} className={secondaryButtonClass}><Download size={16} className="mr-2" />Export CSV</button></div></section>
        <section className="border border-red-200 bg-red-50 p-7 xl:col-span-2"><div className="flex items-start gap-4"><ShieldAlert className="mt-1 shrink-0 text-red-700" /><div><p className="text-label uppercase text-red-700">Danger zone</p><h2 className="mt-2 text-2xl font-semibold text-red-950">Permanent deletion</h2><p className="mt-2 max-w-3xl text-body-s text-red-900/70">Export first if you want a copy. These actions cannot be undone. “Delete all history” keeps your login but removes application records and private archive files. “Delete account” also removes the Supabase Auth user through a secure server function.</p><div className="mt-6 flex flex-wrap gap-3"><ConfirmButton label="Delete all history" confirmLabel="Confirm: permanently delete history" onConfirm={deleteApplicationData} className="inline-flex items-center rounded-pill border border-red-300 bg-white px-5 py-3 text-body-s font-medium text-red-800 hover:bg-red-100" /><ConfirmButton label="Delete account" confirmLabel="Confirm: permanently delete account" onConfirm={deleteAccount} className="inline-flex items-center rounded-pill bg-red-700 px-5 py-3 text-body-s font-medium text-white hover:bg-red-800" /></div></div><Trash2 className="hidden text-red-300 md:block" /></div></section>
      </div>
    </>
  )
}
