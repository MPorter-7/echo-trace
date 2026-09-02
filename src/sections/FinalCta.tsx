import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '../components/Reveal'

interface FinalCtaProps {
  onRequestAccess?: () => void
}

export function FinalCta({ onRequestAccess }: FinalCtaProps) {
  return (
    <section className="bg-midnight px-5 py-20 md:px-10 md:py-28 lg:px-20">
      <Reveal className="mx-auto max-w-content">
        <div className="relative overflow-hidden rounded-3xl border border-night-border bg-night-raised px-6 py-14 text-center md:px-12 md:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-4xl">
              Your history is yours. Start putting it back together.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-body-l text-slate-400">
              Create a private workspace in a couple of minutes. You decide what goes in, and you can export or
              delete everything at any time.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-cyan-300 px-7 py-3 text-body-s font-semibold text-midnight transition-colors hover:bg-cyan-200"
              >
                Create your workspace
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-pill border border-night-border px-7 py-3 text-body-s font-medium text-white transition-colors hover:border-slate-500"
              >
                Sign in
              </Link>
            </div>
            {onRequestAccess && (
              <button
                type="button"
                onClick={onRequestAccess}
                className="mt-5 text-body-s text-slate-400 underline underline-offset-4 transition-colors hover:text-slate-200"
              >
                Not ready yet? Join the email waitlist
              </button>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  )
}
