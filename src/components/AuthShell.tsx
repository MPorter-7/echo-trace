import { Link } from 'react-router'
import { isSupabaseConfigured } from '../lib/supabase'

export function AuthShell({ eyebrow, title, description, children }: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-charcoal px-5 py-8 text-bone md:py-14">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="text-2xl font-semibold tracking-tight">EchoTrace</Link>
        <div className="grid min-h-[calc(100vh-8rem)] items-center gap-12 py-12 lg:grid-cols-[1fr_480px]">
          <section className="max-w-xl">
            <p className="mb-4 text-label uppercase text-gold">Private by design</p>
            <h1 className="text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
              Your history.<br />Your evidence.<br />Your decision.
            </h1>
            <p className="mt-7 max-w-lg text-body-l text-bone/65">
              EchoTrace helps you reconstruct your own digital history from information you provide and traceable public sources.
            </p>
          </section>
          <section className="border border-bone/15 bg-bone p-7 text-ink shadow-2xl md:p-10">
            <p className="text-label uppercase text-gold">{eyebrow}</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-3 text-body-s text-ink/60">{description}</p>
            {!isSupabaseConfigured && (
              <div className="mt-6 border border-amber-300 bg-amber-50 p-4 text-body-s text-amber-950" role="alert">
                Authentication is not configured on this deployment. Add the two Vite Supabase variables described in SETUP.md.
              </div>
            )}
            <div className="mt-7">{children}</div>
          </section>
        </div>
      </div>
    </main>
  )
}
