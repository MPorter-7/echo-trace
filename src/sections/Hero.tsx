import { Link } from 'react-router'
import { ArrowRight, Check } from 'lucide-react'

interface HeroProps {
  onRequestAccess?: () => void
}

const PREVIEW_ROWS = [
  { year: '2011', title: 'Created a photo-sharing account', meta: 'From your email history · you confirmed' },
  { year: '2014', title: 'Old blog on a now-closed platform', meta: 'Possible match · you review' },
  { year: '2016', title: 'Forum profile under a former username', meta: 'Possible match · you review' },
  { year: '2019', title: 'Newsletter you signed up for', meta: 'From a Takeout import · you confirmed' },
]

export function Hero({ onRequestAccess }: HeroProps) {
  return (
    <section className="relative flex min-h-[640px] w-full items-center overflow-hidden bg-midnight pt-16 text-white md:min-h-screen">
      <img
        src="/images/hero/echo-trace-digital-archaeology.webp"
        alt=""
        width="1672"
        height="941"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[64%_center] opacity-40"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,23,0.97)_0%,rgba(2,8,23,0.9)_38%,rgba(2,8,23,0.6)_70%,rgba(2,8,23,0.4)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,23,0.5)_0%,transparent_40%,rgba(2,8,23,0.85)_100%)]" />
      <div className="absolute left-[-8%] top-[18%] h-72 w-72 rounded-full bg-cyan-400/10 blur-[130px]" />

      <div className="relative z-10 mx-auto grid w-full max-w-content gap-14 px-5 py-20 md:px-10 lg:grid-cols-[1fr_460px] lg:items-center lg:gap-10 lg:px-20">
        <div className="max-w-[620px]">
          <p className="mb-5 text-label uppercase tracking-[0.2em] text-cyan-300">
            Your digital history, recovered privately
          </p>
          <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Recover your digital history.
            <span className="block text-cyan-300">Privately.</span>
          </h1>
          <p className="mt-6 max-w-[520px] text-body-l text-slate-300">
            EchoTrace is a private workspace that helps you find, organize, and preserve the
            accounts, messages, and milestones from your own online past — with you reviewing
            every step.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-cyan-300 px-7 py-3 text-body-s font-semibold text-midnight transition-colors hover:bg-cyan-200"
            >
              Create your workspace
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-pill border border-white/25 bg-white/5 px-7 py-3 text-body-s font-medium text-white backdrop-blur-sm transition-colors hover:border-white/50 hover:bg-white/10"
            >
              See how it works
            </a>
          </div>

          {onRequestAccess && (
            <button
              type="button"
              onClick={onRequestAccess}
              className="mt-5 text-body-s text-slate-400 underline underline-offset-4 transition-colors hover:text-slate-200"
            >
              Prefer email updates? Join the waitlist
            </button>
          )}
        </div>

        {/* Interface preview — illustrative, not live data */}
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-night-border bg-night-raised/80 shadow-[0_30px_90px_rgba(2,8,23,0.55)] backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-night-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="ml-3 text-micro uppercase tracking-[0.14em] text-slate-500">
                Your timeline
              </span>
            </div>
            <ul className="divide-y divide-night-border">
              {PREVIEW_ROWS.map((row) => (
                <li key={row.year} className="flex gap-4 px-4 py-4">
                  <span className="mt-0.5 text-body-s font-semibold text-cyan-300">{row.year}</span>
                  <span className="flex-1">
                    <span className="block text-body-s font-medium text-white">{row.title}</span>
                    <span className="mt-1 block text-micro text-slate-400">{row.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 border-t border-night-border px-4 py-3 text-micro text-slate-400">
              <Check size={13} className="text-cyan-300" aria-hidden="true" />
              You approve every entry before it is saved
            </div>
          </div>
          <p className="mt-3 text-center text-micro uppercase tracking-[0.14em] text-slate-500">
            Illustration — not real data
          </p>
        </div>
      </div>
    </section>
  )
}
