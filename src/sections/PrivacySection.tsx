import { Link } from 'react-router'
import { Lock, Eye, Laptop, Trash2, X } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from './SectionHeading'

const PRINCIPLES = [
  {
    icon: Lock,
    title: 'Your data stays under your control',
    body: 'Records are tied to your account with owner-only access enforced by database row-level security. EchoTrace does not sell or rent personal data.',
  },
  {
    icon: Eye,
    title: 'You review before anything counts',
    body: 'Possible matches wait for your decision. Confidence is an explained estimate, and conflicting signals stay visible so you decide what belongs.',
  },
  {
    icon: Laptop,
    title: 'Local processing where it matters',
    body: 'Mailbox, Takeout, and saved-logins imports are analyzed in your browser — passwords are never stored or sent, and raw content never reaches our servers.',
  },
  {
    icon: Trash2,
    title: 'Deletion on your terms',
    body: 'Remove any single record, wipe all application data, or delete your account entirely through a dedicated secure function.',
  },
]

const NOT = [
  'A people-search or background-check service',
  'A surveillance or stalking tool',
  'A location tracker or phone-lookup tool',
  'A facial recognition service',
  'A scraper — guided searches are outbound links you click',
]

export function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-20 border-y border-night-border bg-night py-20 md:scroll-mt-24 md:py-28">
      <div className="mx-auto max-w-content px-5 md:px-10 lg:px-20">
        <SectionHeading
          eyebrow="Privacy"
          title="Privacy isn't a setting here. It's the design."
          description="EchoTrace is built for recovering your own history — which is why the boundaries below are structural, not optional."
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 70}>
                <div className="flex h-full flex-col rounded-2xl border border-night-border bg-night-raised p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">
                    <principle.icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-body-l font-semibold text-white">{principle.title}</h3>
                  <p className="mt-2 text-body-s leading-relaxed text-slate-400">{principle.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="flex h-full flex-col rounded-2xl border border-night-border bg-night-raised p-6">
              <h3 className="text-body-l font-semibold text-white">What EchoTrace is not</h3>
              <ul className="mt-4 space-y-3">
                {NOT.map((item) => (
                  <li key={item} className="flex gap-2.5 text-body-s text-slate-300">
                    <X size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/privacy"
                className="mt-6 inline-flex items-center gap-1.5 text-body-s font-medium text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
              >
                Read the full privacy notice
              </Link>
              <p className="mt-4 text-micro leading-relaxed text-slate-500">
                EchoTrace does not make legal or security guarantees. No method of storage or transmission is
                completely secure.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
