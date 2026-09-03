import {
  History,
  Waypoints,
  FileSearch,
  SearchCheck,
  Compass,
  Upload,
  Fingerprint,
  DownloadCloud,
} from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from './SectionHeading'

const FEATURES = [
  {
    icon: History,
    title: 'Digital history recovery',
    body: 'Reconstruct accounts and milestones from information you provide and evidence you authorize.',
  },
  {
    icon: Waypoints,
    title: 'Timeline organization',
    body: 'A searchable, filterable chronological view that handles exact, month/year, year-only, and unknown dates.',
  },
  {
    icon: FileSearch,
    title: 'Evidence & record organization',
    body: 'Every possible match keeps its original source and retrieval date so you can check the evidence yourself.',
  },
  {
    icon: SearchCheck,
    title: 'User-reviewed matches',
    body: 'You accept, reject, or mark each match uncertain. Confidence scores are explained estimates — never proof.',
  },
  {
    icon: Compass,
    title: 'Guided recovery workflows',
    body: 'Step-by-step prompts walk you through rebuilding your history from evidence you already have. You can also run guided public searches as outbound links.',
  },
  {
    icon: Upload,
    title: 'Google Takeout & mailbox import',
    body: 'Bring in .mbox and Takeout exports from common providers. Files are analyzed locally in your browser, not uploaded wholesale.',
  },
  {
    icon: Fingerprint,
    title: 'Private identifiers',
    body: 'A clear separation between your verified account email and the unverified historical ones you are researching.',
  },
  {
    icon: DownloadCloud,
    title: 'Export & deletion controls',
    body: 'Export to JSON or CSV, delete individual records, wipe all application data, or delete your account entirely.',
  },
]

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-night-border bg-night py-20 md:scroll-mt-24 md:py-28">
      <div className="mx-auto max-w-content px-5 md:px-10 lg:px-20">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to rebuild your history — and nothing you don't"
          description="These are the tools EchoTrace ships today. No surveillance features, no data broker lookups, no scraping."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 4) * 70}>
              <article className="flex h-full flex-col rounded-2xl border border-night-border bg-night-raised p-6 transition-all hover:-translate-y-0.5 hover:border-cyan-300/40">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">
                  <feature.icon size={20} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-body-l font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-body-s leading-relaxed text-slate-400">{feature.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
