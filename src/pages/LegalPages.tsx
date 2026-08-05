import { Link } from 'react-router'

const privacySections = [
  ['What EchoTrace does', 'EchoTrace helps you organize information you provide about your own digital history, plus public sources you choose to save. It is not a people-search, surveillance, background-check, or private-investigation service.'],
  ['Information stored', 'We store your account details, consent record, identifiers, timeline events, possible matches, email-history summaries you select, scoring explanations, notes, activity metadata, and private archive files. Raw mailbox files and Gmail message content, addresses, and subject lines analyzed during recovery are not stored by EchoTrace.'],
  ['How information is used', 'Information is used only to provide your private recovery workspace, protect the service, and support exports and deletion. EchoTrace does not sell personal data or send private identifiers to third parties.'],
  ['Security and access', 'Private database tables use user-owner Row Level Security. Archive objects use private storage paths scoped to the authenticated user. No service-role key is included in browser code.'],
  ['Your choices', 'You can choose which locally analyzed email findings to save, correct records, accept or reject findings and possible matches, export JSON or CSV, delete individual records and files, delete all application data, or request permanent account deletion.'],
  ['Limits', 'Public sources may be incomplete, outdated, or wrong. A confidence score is an explainable estimate—not proof that a result belongs to you. You make the final decision.'],
]
const termsSections = [
  ['Permitted use', 'You may use EchoTrace only to reconstruct digital history that belongs to you. You must have the right to upload each private file and save each identifier.'],
  ['Email-history analysis', 'You may analyze only a mailbox you control as part of reconstructing your own digital history. Quick Gmail Scan uses temporary read-only permission and disconnects after the scan. Supported .mbox files remain a local advanced option. EchoTrace saves only the aggregate findings you select.'],
  ['Prohibited use', 'Do not use EchoTrace for surveillance, harassment, stalking, doxxing, employment or tenant screening, background checks, private investigation, arbitrary people-search, or research about another person without their informed authorization.'],
  ['Public-source rules', 'Do not bypass authentication, paywalls, CAPTCHAs, robots.txt, access controls, or platform restrictions. Follow website terms and applicable law. Guided searches are user-directed outbound links, not automated scraping.'],
  ['Result accuracy', 'EchoTrace does not guarantee that a public result belongs to you. Keep original sources, review conflicts, correct mistakes, and treat confidence as an estimate.'],
  ['Account responsibility', 'Keep your credentials secure. Do not upload malware, unlawful content, secrets belonging to others, or files you do not have permission to store.'],
  ['Availability', 'This MVP may change and may experience interruptions. Export important records regularly.'],
]

function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: string[][] }) {
  return <main className="min-h-screen bg-bone px-5 py-10 text-ink"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><Link to="/" className="text-2xl font-semibold">EchoTrace</Link><Link to="/login" className="text-body-s underline decoration-gold underline-offset-4">Sign in</Link></div><p className="mt-16 text-label uppercase text-gold">Plain-language MVP draft</p><h1 className="mt-3 text-5xl font-semibold tracking-tight md:text-7xl">{title}</h1><p className="mt-6 text-body-l text-ink/60">{intro}</p><div className="mt-10 border border-amber-200 bg-amber-50 p-4 text-body-s text-amber-950"><strong>Legal review required before commercial launch.</strong> This practical MVP text is not a substitute for advice from a qualified attorney.</div><div className="mt-12 space-y-10">{sections.map(([heading, body]) => <section key={heading}><h2 className="text-2xl font-semibold">{heading}</h2><p className="mt-3 text-body-m leading-relaxed text-ink/65">{body}</p></section>)}</div><p className="mt-14 border-t border-ink/10 pt-6 text-micro uppercase text-ink/40">MVP draft · Last updated August 3, 2026</p></div></main>
}

export function PrivacyPage() { return <LegalPage title="Privacy Notice" intro="Your digital history can be deeply personal. EchoTrace is designed around ownership, source attribution, local processing, correction, portability, and deletion." sections={privacySections} /> }
export function TermsPage() { return <LegalPage title="Terms of Use" intro="EchoTrace is a self-recovery tool. Using it means respecting other people’s privacy, public-source rules, and the boundaries below." sections={termsSections} /> }
