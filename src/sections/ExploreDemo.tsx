import { useState } from 'react'
import { Link } from 'react-router'
import { Check, X, HelpCircle, ArrowRight } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from './SectionHeading'

type TabId = 'timeline' | 'matches' | 'findings'
type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'uncertain'

const TABS: { id: TabId; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'matches', label: 'Possible matches' },
  { id: 'findings', label: 'Email findings' },
]

const SAMPLE_TIMELINE = [
  { date: '2009', title: 'First personal email account', platform: 'Webmail provider', confirmed: true },
  { date: 'Mar 2012', title: 'Photo-sharing account created', platform: 'Photos service', confirmed: true },
  { date: '2014', title: 'Personal blog on a now-closed platform', platform: 'Blogging platform', confirmed: false },
  { date: 'Aug 2016', title: 'Forum profile under a former username', platform: 'Community forum', confirmed: false },
  { date: '2019', title: 'Newsletter subscription', platform: 'Independent newsletter', confirmed: true },
]

const SAMPLE_MATCHES = [
  {
    id: 'm1',
    title: 'Old username on a community forum',
    source: 'Guided public search',
    retrieved: 'Retrieved 12 Feb 2024',
    confidence: 'Medium',
    reason: 'Matches a former username and city you added. No email confirmation, so it stays a possible match.',
  },
  {
    id: 'm2',
    title: 'Archived personal blog',
    source: 'Web archive link you opened',
    retrieved: 'Retrieved 12 Feb 2024',
    confidence: 'Low',
    reason: 'Similar display name only. The writing style and dates conflict with what you already confirmed.',
  },
]

const SAMPLE_FINDINGS = [
  {
    id: 'f1',
    service: 'Photos service',
    domain: 'no-reply@photos.example',
    categories: 'Registration · Password reset · Security notice',
    count: 6,
    range: '2012 – 2018',
  },
  {
    id: 'f2',
    service: 'Independent newsletter',
    domain: 'hello@newsletter.example',
    categories: 'Sign-up confirmation · Receipts',
    count: 3,
    range: '2019 – 2021',
  },
]

// This is a marketing-only preview — nothing here is saved. Labels say so
// explicitly so a visitor never thinks the sample changed their real history.
const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: 'Awaiting your review',
  accepted: 'Marked confirmed in this sample',
  rejected: 'Marked “not me” in this sample',
  uncertain: 'Flagged uncertain in this sample',
}

export function ExploreDemo() {
  const [tab, setTab] = useState<TabId>('timeline')
  const [statuses, setStatuses] = useState<Record<string, MatchStatus>>({ m1: 'pending', m2: 'pending' })

  const setStatus = (id: string, status: MatchStatus) =>
    setStatuses((current) => ({ ...current, [id]: status }))

  return (
    <section id="explore" className="scroll-mt-20 bg-midnight py-20 md:scroll-mt-24 md:py-28">
      <div className="mx-auto max-w-content px-5 md:px-10 lg:px-20">
        <SectionHeading
          eyebrow="Explore EchoTrace"
          title="See the workspace before you connect anything"
          description="Everything below is sample data. Click through the tabs and try reviewing a match to get a feel for how EchoTrace works."
        />

        <Reveal className="mt-10">
          <div className="overflow-hidden rounded-2xl border border-night-border bg-night-raised">
            <div className="flex items-center justify-between gap-3 border-b border-night-border px-4 py-3">
              <div role="tablist" aria-label="Sample workspace" className="flex flex-wrap gap-1">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    aria-selected={tab === item.id}
                    aria-controls={`panel-${item.id}`}
                    onClick={() => setTab(item.id)}
                    className={`rounded-full px-4 py-2 text-body-s font-medium transition-colors ${
                      tab === item.id
                        ? 'bg-cyan-300 text-midnight'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="hidden shrink-0 rounded-full border border-cyan-300/40 px-3 py-1 text-micro uppercase tracking-[0.14em] text-cyan-300 sm:inline">
                Sample data
              </span>
            </div>

            <div className="p-4 sm:p-6">
              {tab === 'timeline' && (
                <div role="tabpanel" id="panel-timeline" aria-labelledby="tab-timeline">
                  <ul className="divide-y divide-night-border">
                    {SAMPLE_TIMELINE.map((entry) => (
                      <li key={entry.title} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
                        <span className="w-20 shrink-0 text-body-s font-semibold text-cyan-300">{entry.date}</span>
                        <span className="flex-1">
                          <span className="block text-body-s font-medium text-white">{entry.title}</span>
                          <span className="mt-0.5 block text-micro text-slate-400">{entry.platform}</span>
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-micro font-medium ${
                            entry.confirmed
                              ? 'bg-cyan-300/10 text-cyan-200'
                              : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {entry.confirmed ? 'You confirmed' : 'Needs review'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tab === 'matches' && (
                <div role="tabpanel" id="panel-matches" aria-labelledby="tab-matches" className="space-y-4">
                  {SAMPLE_MATCHES.map((match) => {
                    const status = statuses[match.id] ?? 'pending'
                    return (
                      <div key={match.id} className="rounded-xl border border-night-border bg-midnight/40 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-body-s font-semibold text-white">{match.title}</h3>
                            <p className="mt-1 text-micro text-slate-400">
                              {match.source} · {match.retrieved}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-micro font-medium text-slate-300">
                            {match.confidence} confidence
                          </span>
                        </div>
                        <p className="mt-3 text-body-s leading-relaxed text-slate-400">{match.reason}</p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setStatus(match.id, 'accepted')}
                            className="inline-flex items-center gap-1.5 rounded-full bg-cyan-300 px-3 py-1.5 text-micro font-semibold text-midnight transition-colors hover:bg-cyan-200"
                          >
                            <Check size={13} aria-hidden="true" /> This is me
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatus(match.id, 'rejected')}
                            className="inline-flex items-center gap-1.5 rounded-full border border-night-border px-3 py-1.5 text-micro font-medium text-slate-300 transition-colors hover:text-white"
                          >
                            <X size={13} aria-hidden="true" /> Not me
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatus(match.id, 'uncertain')}
                            className="inline-flex items-center gap-1.5 rounded-full border border-night-border px-3 py-1.5 text-micro font-medium text-slate-300 transition-colors hover:text-white"
                          >
                            <HelpCircle size={13} aria-hidden="true" /> Not sure
                          </button>
                          <span aria-live="polite" className="ml-1 text-micro text-slate-400">
                            {STATUS_LABEL[status]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {tab === 'findings' && (
                <div role="tabpanel" id="panel-findings" aria-labelledby="tab-findings" className="space-y-3">
                  <p className="text-body-s text-slate-400">
                    A mailbox or Google Takeout import only ever saves aggregate summaries like these — never
                    raw messages, addresses, or attachments.
                  </p>
                  {SAMPLE_FINDINGS.map((finding) => (
                    <div key={finding.id} className="rounded-xl border border-night-border bg-midnight/40 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-body-s font-semibold text-white">{finding.service}</h3>
                        <span className="text-micro text-slate-400">{finding.range}</span>
                      </div>
                      <p className="mt-1 text-micro text-slate-400">Sender: {finding.domain}</p>
                      <p className="mt-2 text-body-s text-slate-300">{finding.categories}</p>
                      <p className="mt-1 text-micro text-slate-500">{finding.count} related messages counted</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-8 flex flex-wrap items-center gap-4" delay={80}>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-pill bg-cyan-300 px-6 py-3 text-body-s font-semibold text-midnight transition-colors hover:bg-cyan-200"
          >
            Create your workspace to build your own
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <a href="#how-it-works" className="text-body-s font-medium text-slate-300 underline underline-offset-4 hover:text-white">
            See how it works
          </a>
        </Reveal>
      </div>
    </section>
  )
}
