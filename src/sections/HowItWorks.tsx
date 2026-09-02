import { Upload, Eye, ListChecks, Archive } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from './SectionHeading'

const STEPS = [
  {
    icon: Upload,
    title: 'Connect or import your own data',
    body: 'Verify your email, run an optional read-only Gmail quick-scan, or import a Google Takeout or mailbox export. Nothing is pulled in without your say-so.',
  },
  {
    icon: Eye,
    title: 'Review your digital history',
    body: 'EchoTrace lays out possible accounts and events, each with its source and a plain-language confidence estimate. It never assumes something is yours.',
  },
  {
    icon: ListChecks,
    title: 'Organize what matters',
    body: 'Accept, reject, or flag each item. Build a searchable timeline and attach supporting files to your private archive.',
  },
  {
    icon: Archive,
    title: 'Preserve or export your results',
    body: 'Keep everything in your private workspace, export to JSON or CSV, or delete any record — or all of it — whenever you choose.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-midnight py-20 md:scroll-mt-24 md:py-28">
      <div className="mx-auto max-w-content px-5 md:px-10 lg:px-20">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps, and you stay in control of every one"
          description="EchoTrace guides the recovery. You make every decision about what becomes part of your history."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-night-border bg-night-raised p-6 transition-colors hover:border-cyan-300/40">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">
                    <step.icon size={20} aria-hidden="true" />
                  </span>
                  <span className="text-heading-m font-semibold text-night-border">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-5 text-body-l font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-body-s leading-relaxed text-slate-400">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
