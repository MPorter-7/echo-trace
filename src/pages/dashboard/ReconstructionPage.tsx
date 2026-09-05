import { ArrowRight, Check, Fingerprint, MailCheck, SearchCheck, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthContext'
import { PageHeader } from '../../components/DashboardUI'
import { RecoveryOptions } from '../../components/RecoveryOptions'
import { primaryButtonClass, secondaryButtonClass } from '../../components/FormFields'
import { findStartingEmail, hasVerifiedAccountEmail, reconstructionProgress, type ReconstructionCounts } from '../../lib/reconstruction'
import { supabase } from '../../lib/supabase'
import type { Identifier } from '../../types/echo'

const emptyCounts: ReconstructionCounts = { identifiers: 0, archiveFiles: 0, matches: 0, emailImports: 0, emailFindings: 0, loginExportImports: 0, loginExportFindings: 0 }

export function ReconstructionPage() {
  const { user } = useAuth()
  const [identifiers, setIdentifiers] = useState<Identifier[]>([])
  const [counts, setCounts] = useState<ReconstructionCounts>(emptyCounts)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase

    const load = async () => {
      const [identifierResult, archiveResult, matchResult, emailImportResult, emailFindingResult, loginExportImportResult, loginExportFindingResult] = await Promise.all([
        client.from('identifiers').select('*').order('created_at', { ascending: true }),
        client.from('archive_files').select('*', { count: 'exact', head: true }),
        client.from('possible_matches').select('*', { count: 'exact', head: true }),
        client.from('email_imports').select('*', { count: 'exact', head: true }),
        client.from('email_findings').select('*', { count: 'exact', head: true }),
        client.from('login_exports').select('*', { count: 'exact', head: true }),
        client.from('login_export_findings').select('*', { count: 'exact', head: true }),
      ])

      let nextIdentifiers = (identifierResult.data ?? []) as Identifier[]
      const accountEmail = user.email?.trim().toLowerCase()

      if (!identifierResult.error && accountEmail && !hasVerifiedAccountEmail(nextIdentifiers, accountEmail)) {
        const { error } = await client.from('identifiers').upsert({
          user_id: user.id,
          type: 'email',
          value: accountEmail,
          normalized_value: accountEmail,
          label: 'Verified account email',
          verification_status: 'verified_account',
          verification_method: 'Verified by Supabase Auth',
        }, { onConflict: 'user_id,type,normalized_value', ignoreDuplicates: true })

        if (!error) {
          const refreshed = await client.from('identifiers').select('*').order('created_at', { ascending: true })
          nextIdentifiers = (refreshed.data ?? nextIdentifiers) as Identifier[]
        }
      }

      if (identifierResult.error || archiveResult.error || matchResult.error || emailImportResult.error || emailFindingResult.error || loginExportImportResult.error || loginExportFindingResult.error) {
        toast.error('Your reconstruction status could not be loaded.')
      }

      setIdentifiers(nextIdentifiers)
      setCounts({
        identifiers: nextIdentifiers.length,
        archiveFiles: archiveResult.count ?? 0,
        matches: matchResult.count ?? 0,
        emailImports: emailImportResult.count ?? 0,
        emailFindings: emailFindingResult.count ?? 0,
        loginExportImports: loginExportImportResult.count ?? 0,
        loginExportFindings: loginExportFindingResult.count ?? 0,
      })
      setLoading(false)
    }

    void load()
  }, [user])

  const startingEmail = findStartingEmail(identifiers, user?.email)
  const progress = reconstructionProgress(counts, Boolean(startingEmail))
  const steps = [
    {
      title: 'Verified starting clue',
      description: startingEmail ? 'Your signup email is ready. You do not need to enter it again.' : 'Verify an account email to create the first clue.',
      complete: Boolean(startingEmail),
      icon: MailCheck,
      action: null,
    },
    {
      title: 'Add older identifiers',
      description: 'Previous email addresses and usernames help connect older accounts to the same history.',
      complete: counts.identifiers > 1,
      icon: Fingerprint,
      action: { to: '/dashboard/identifiers', label: 'Add an old email or username' },
    },
    {
      title: 'Import your email history or saved logins',
      description: 'Export your own mailbox or your browser/password-manager saved logins, then let EchoTrace check them locally for account evidence.',
      complete: counts.archiveFiles > 0 || counts.emailImports > 0 || counts.loginExportImports > 0,
      icon: Zap,
      action: { to: '/dashboard/email-history', label: 'Find my accounts' },
    },
    {
      title: 'Review possible matches',
      description: 'Keep the original source, inspect the score, and accept or reject every possible account yourself.',
      complete: counts.matches > 0 || counts.emailFindings > 0 || counts.loginExportFindings > 0,
      icon: SearchCheck,
      action: { to: counts.emailFindings > 0 || counts.loginExportFindings > 0 ? (counts.loginExportFindings > 0 ? '/dashboard/login-export' : '/dashboard/email-history') : '/dashboard/matches', label: 'Open evidence review' },
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Evidence-first recovery"
        title="Start reconstruction"
        description="You are not expected to remember every website or have access to an email archive. Begin with any clue or evidence that belongs to you."
        action={<Link to="/dashboard/identifiers" className={secondaryButtonClass}>Manage identifiers</Link>}
      />

      <section className="grid gap-6 border border-ink/10 bg-charcoal p-7 text-bone lg:grid-cols-[1.4fr_0.6fr] lg:p-10">
        <div>
          <p className="text-label uppercase text-gold">Your first clue</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Your verified email is one clue—not a requirement.</h2>
          <div className="mt-7 max-w-xl border border-bone/15 bg-bone/5 p-5">
            <div className="flex items-center gap-3 text-body-s text-bone/55"><MailCheck size={18} className="text-gold" />Verified account email</div>
            <p className="mt-3 break-all text-xl font-medium">{loading ? 'Loading your secure clue…' : startingEmail ?? 'No verified email found'}</p>
          </div>
          <p className="mt-5 max-w-2xl text-body-s leading-relaxed text-bone/60">Use this address if it helps, or begin with an old username, a private file, a traceable public source, or a memory. You can combine recovery paths later.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#recovery-options-title" className={primaryButtonClass}>Choose a recovery path <ArrowRight size={16} className="ml-2" /></a>
            <Link to="/dashboard/timeline" className="inline-flex items-center justify-center rounded-pill border border-bone/30 px-5 py-3 text-body-s font-medium text-bone hover:bg-bone hover:text-ink">Start without email</Link>
          </div>
          <p className="mt-3 text-micro text-bone/45">You control which clues, findings, files, and memories are saved.</p>
        </div>
        <div className="border border-bone/15 bg-bone/5 p-6">
          <p className="text-label uppercase text-gold">Reconstruction readiness</p>
          <p className="mt-4 text-6xl font-semibold">{loading ? '—' : `${progress}%`}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-bone/10"><div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-5 text-body-s leading-relaxed text-bone/55">This measures the evidence workflow—not how much of your entire digital life has been recovered.</p>
        </div>
      </section>

      <RecoveryOptions className="mt-8" />

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="text-label uppercase text-gold">Next best steps</p><h2 className="mt-2 text-2xl font-semibold">Build from evidence, not memory</h2></div>
          <Link to="/dashboard/timeline" className="text-body-s text-ink/55 underline decoration-gold underline-offset-4">Add a memory instead (optional)</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map(({ title, description, complete, icon: Icon, action }, index) => (
            <article key={title} className="border border-ink/10 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-mist"><Icon size={21} className="text-gold" /></div>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-micro uppercase ${complete ? 'bg-emerald-100 text-emerald-800' : 'bg-mist text-ink/50'}`}>{complete && <Check size={12} />}{complete ? 'Ready' : `Step ${index + 1}`}</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-body-s leading-relaxed text-ink/55">{description}</p>
              {action && <Link to={action.to} className="mt-5 inline-flex items-center gap-2 text-body-s font-medium underline decoration-gold underline-offset-4">{action.label}<ArrowRight size={15} /></Link>}
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
