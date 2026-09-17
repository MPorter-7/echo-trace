import { Archive, ArrowRight, Fingerprint, History, KeyRound, MailSearch, SearchCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router'

const recoveryOptions = [
  {
    title: 'Find my old accounts',
    description: 'Start with an email, username, display name, platform, or date you remember. No email export required.',
    to: '/dashboard/discover',
    label: 'Start account discovery',
    icon: Sparkles,
  },
  {
    title: 'Enter old accounts and usernames',
    description: 'Add previous email addresses, usernames, profile links, display names, and personal websites that belong to you.',
    to: '/dashboard/identifiers',
    label: 'Add identity clues',
    icon: Fingerprint,
  },
  {
    title: 'Upload private evidence',
    description: 'Keep screenshots, exported records, PDFs, photos, and saved webpages in your private archive.',
    to: '/dashboard/archive',
    label: 'Add files or screenshots',
    icon: Archive,
  },
  {
    title: 'Use guided public search',
    description: 'Search traceable public sources for your own identifiers, then save the original source for review.',
    to: '/dashboard/matches',
    label: 'Search public sources',
    icon: SearchCheck,
  },
  {
    title: 'Import an email archive',
    description: 'Already have an email export? Import an .mbox archive from Gmail, Yahoo, Proton Mail, Apple Mail, Thunderbird, or another compatible provider.',
    to: '/dashboard/email-history',
    label: 'Import email history',
    icon: MailSearch,
  },
  {
    title: 'Import saved logins',
    description: 'Export saved logins from Chrome, Firefox, Edge, Safari, or a password manager. A saved sign-in is direct evidence of an account — passwords are never stored or transmitted.',
    to: '/dashboard/login-export',
    label: 'Import saved logins',
    icon: KeyRound,
  },
  {
    title: 'Start without email',
    description: 'Begin with a remembered platform, username, event, or approximate year. You can add evidence later.',
    to: '/dashboard/timeline',
    label: 'Add a memory to my timeline',
    icon: History,
  },
]

interface RecoveryOptionsProps {
  className?: string
}

export function RecoveryOptions({ className = '' }: RecoveryOptionsProps) {
  return (
    <section className={className} aria-labelledby="recovery-options-title">
      <p className="text-label uppercase text-gold">Choose your starting point</p>
      <h2 id="recovery-options-title" className="mt-2 text-2xl font-semibold">How would you like to begin?</h2>
      <p className="mt-2 max-w-3xl text-body-s leading-relaxed text-ink/55">You do not need an email export. Start with whichever clues you already have, and use the other recovery paths whenever you are ready.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recoveryOptions.map(({ title, description, to, label, icon: Icon }) => (
          <article key={title} className="flex min-h-64 flex-col border border-ink/10 bg-white p-6">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-mist"><Icon size={21} className="text-gold" /></div>
            <h3 className="mt-5 text-xl font-semibold">{title}</h3>
            <p className="mt-2 flex-1 text-body-s leading-relaxed text-ink/55">{description}</p>
            <Link to={to} className="mt-5 inline-flex items-center gap-2 text-body-s font-medium underline decoration-gold underline-offset-4">{label}<ArrowRight size={15} /></Link>
          </article>
        ))}
      </div>
    </section>
  )
}
