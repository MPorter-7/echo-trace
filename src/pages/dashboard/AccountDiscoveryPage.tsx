import { ArrowUpRight, CalendarDays, Check, Mail, Search, ShieldCheck, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { PageHeader } from '../../components/DashboardUI'
import { inputClass, primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { supabase } from '../../lib/supabase'

interface DiscoveryIdentifier {
  type: 'email' | 'username' | 'display_name'
  value: string
  label: string
}

const platforms = ['Social media', 'Gaming', 'Shopping', 'Forums & communities', 'Dating', 'Streaming', 'Work & school', 'Cloud & storage', 'Other']

function searchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

export function AccountDiscoveryPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [platform, setPlatform] = useState('')
  const [fromYear, setFromYear] = useState('')
  const [toYear, setToYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [started, setStarted] = useState(false)

  const identifiers = useMemo<DiscoveryIdentifier[]>(() => [
    email.trim() ? { type: 'email', value: email.trim(), label: 'Account discovery email' } : null,
    username.trim() ? { type: 'username', value: username.trim(), label: 'Account discovery username' } : null,
    displayName.trim() ? { type: 'display_name', value: displayName.trim(), label: 'Account discovery display name' } : null,
  ].filter(Boolean) as DiscoveryIdentifier[], [email, username, displayName])

  const queries = useMemo(() => {
    const yearRange = fromYear || toYear ? ` ${fromYear || ''}${fromYear && toYear ? '-' : ''}${toYear || ''}` : ''
    const platformText = platform && platform !== 'Other' ? ` ${platform}` : ''
    const values = identifiers.map(({ value }) => value)
    const result: Array<{ label: string; query: string }> = []
    if (email.trim()) result.push({ label: 'Search this email', query: `"${email.trim()}"${platformText}${yearRange}` })
    if (username.trim()) result.push({ label: 'Search this username', query: `"${username.trim()}"${platformText}${yearRange}` })
    if (displayName.trim()) result.push({ label: 'Search this display name', query: `"${displayName.trim()}"${platformText}${yearRange}` })
    if (values.length > 1) result.push({ label: 'Search these clues together', query: values.map((value) => `"${value}"`).join(' ') + platformText + yearRange })
    return result
  }, [email, username, displayName, platform, fromYear, toYear, identifiers])

  const startDiscovery = async () => {
    if (!supabase || !user) return
    if (!identifiers.length) return toast.error('Add at least one thing you remember: an email, username, or display name.')
    if (fromYear && toYear && toYear < fromYear) return toast.error('The ending year cannot be earlier than the starting year.')

    setSaving(true)
    let saved = 0
    let failed = false
    for (const identifier of identifiers) {
      const { error } = await supabase.from('identifiers').insert({
        user_id: user.id,
        type: identifier.type,
        value: identifier.value,
        normalized_value: identifier.value.toLowerCase(),
        label: identifier.label,
        notes: [platform ? `Platform category: ${platform}.` : '', fromYear || toYear ? `Approximate years: ${fromYear || '?'}–${toYear || '?'}.` : ''].filter(Boolean).join(' ') || null,
        verification_status: identifier.type === 'email' ? 'unverified_historical' : 'user_supplied',
        verification_method: 'Supplied by user through Account Discovery; not independently verified',
      })
      if (!error || error.code === '23505') saved += 1
      else failed = true
    }
    setSaving(false)
    setStarted(true)
    if (failed) toast.error('Some discovery clues could not be saved. The search links are still available below.')
    else toast.success(`${saved} discovery clue${saved === 1 ? '' : 's'} saved privately.`)
  }

  return (
    <>
      <PageHeader
        eyebrow="Account discovery"
        title="Find your old accounts"
        description="You do not need an email export or a technical file. Start with whatever you remember, and EchoTrace will turn those clues into guided searches you can review yourself."
      />

      <section className="border border-ink/10 bg-charcoal p-7 text-bone lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="flex items-center gap-2 text-label uppercase text-gold"><Search size={15} />Start with memory</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">You do not have to remember everything.</h2>
            <p className="mt-4 max-w-2xl text-body-s leading-relaxed text-bone/65">Give EchoTrace one or more clues you remember. Nothing is treated as proof of ownership. You review every public result before saving it to your history.</p>
          </div>
          <div className="border border-emerald-400/25 bg-emerald-400/10 p-5 text-body-s text-emerald-100">
            <p className="flex items-center gap-2 font-medium"><ShieldCheck size={18} />Privacy-first discovery</p>
            <p className="mt-3 leading-relaxed text-emerald-100/70">EchoTrace does not scrape sites or secretly search private databases. It creates user-directed public searches from the clues you provide.</p>
          </div>
        </div>
      </section>

      <section className="mt-5 border border-ink/10 bg-white p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <label className="block"><span className="flex items-center gap-2 text-body-s font-medium"><Mail size={17} />Email you may have used</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="oldemail@example.com" className={`${inputClass} mt-2`} /></label>
          <label className="block"><span className="flex items-center gap-2 text-body-s font-medium"><UserRound size={17} />Old username</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="oldusername" className={`${inputClass} mt-2`} /></label>
          <label className="block"><span className="flex items-center gap-2 text-body-s font-medium"><UserRound size={17} />Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name or nickname" className={`${inputClass} mt-2`} /></label>
        </div>

        <div className="mt-7 grid gap-6 md:grid-cols-3">
          <label className="block"><span className="text-body-s font-medium">What kind of account?</span><select value={platform} onChange={(event) => setPlatform(event.target.value)} className={`${inputClass} mt-2`}><option value="">Any platform</option>{platforms.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="block"><span className="flex items-center gap-2 text-body-s font-medium"><CalendarDays size={17} />Around what year?</span><input value={fromYear} onChange={(event) => setFromYear(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="2012" className={`${inputClass} mt-2`} /></label>
          <label className="block"><span className="text-body-s font-medium">Through</span><input value={toYear} onChange={(event) => setToYear(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="2018" className={`${inputClass} mt-2`} /></label>
        </div>

        <div className="mt-7 flex flex-wrap gap-3 border-t border-ink/10 pt-6">
          <button type="button" onClick={() => void startDiscovery()} disabled={saving} className={primaryButtonClass}>{saving ? 'Saving clues…' : 'Start account discovery'}</button>
          <button type="button" onClick={() => { setEmail(''); setUsername(''); setDisplayName(''); setPlatform(''); setFromYear(''); setToYear(''); setStarted(false) }} className={secondaryButtonClass}>Start over</button>
        </div>
      </section>

      {started && <section className="mt-5 border border-ink/10 bg-white p-6 lg:p-8">
        <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check size={21} /></div><div><p className="text-label uppercase text-gold">Next step</p><h2 className="mt-1 text-2xl font-semibold">Review possible account leads</h2><p className="mt-2 max-w-3xl text-body-s leading-relaxed text-ink/55">Open a guided search, inspect the public source yourself, and save only results you recognize. A search result is never treated as proof that an account belongs to you.</p></div></div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {queries.map(({ label, query }) => <a key={`${label}-${query}`} href={searchUrl(query)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 border border-ink/10 p-5 hover:border-gold"><span><span className="block font-medium">{label}</span><span className="mt-1 block truncate text-body-s text-ink/45">{query}</span></span><ArrowUpRight size={18} className="shrink-0" /></a>)}
        </div>
        <div className="mt-6 flex flex-wrap gap-3"><a href="/dashboard/matches" className={primaryButtonClass}>Review saved matches</a><a href="/dashboard/identifiers" className={secondaryButtonClass}>Manage my clues</a></div>
      </section>}

      <section className="mt-5 border border-ink/10 bg-bone p-6">
        <p className="text-label uppercase text-gold">Already have an email archive?</p>
        <h2 className="mt-2 text-xl font-semibold">You can still import it later.</h2>
        <p className="mt-2 max-w-3xl text-body-s text-ink/55">Email exports are an advanced recovery option. You do not need to know what an MBOX file is to use EchoTrace.</p>
        <a href="/dashboard/email-history" className="mt-4 inline-flex items-center gap-2 text-body-s font-medium underline decoration-gold underline-offset-4">Import an email archive <ArrowUpRight size={15} /></a>
      </section>
    </>
  )
}
