import { Check } from 'lucide-react'
import { PlanButton } from '../billing/PlanButton'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from './SectionHeading'

const plans = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'Start rebuilding your digital history with the essential recovery tools.',
    features: ['Create your private account', 'Private email-history import', 'Limited findings', 'Basic timeline and manual entries'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Recovery',
    price: '$19.99',
    cadence: 'one-time',
    description: 'Unlock your complete recovery without adding another subscription.',
    features: ['Everything in Free', 'Full findings and complete timeline', 'JSON and CSV exports', 'Evidence uploads and recovery report'],
    cta: 'Unlock recovery',
    featured: true,
  },
  {
    name: 'Vault',
    price: '$7.99',
    cadence: 'per month',
    description: 'Keep your recovered history organized, private, and available over time.',
    features: ['Everything in Recovery while active', 'Private long-term storage', 'Continued organization tools', 'Expanded file storage'],
    cta: 'Choose Vault',
    featured: false,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-night-border bg-night py-20 md:scroll-mt-24 md:py-28">
      <div className="mx-auto max-w-content px-5 md:px-10 lg:px-20">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free. Pay once for a complete recovery."
          description="Explore EchoTrace at no cost, unlock your full recovery for one clear price, or add a private vault when you want ongoing storage."
        />

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 80}>
              <article
                className={`relative flex h-full flex-col rounded-2xl border p-7 md:p-8 ${
                  plan.featured
                    ? 'border-cyan-300/60 bg-night-raised shadow-[0_24px_70px_rgba(2,8,23,0.5)] lg:-translate-y-3'
                    : 'border-night-border bg-night-raised'
                }`}
              >
                {plan.featured && (
                  <span className="absolute right-6 top-6 rounded-pill bg-cyan-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-midnight">
                    Most popular
                  </span>
                )}
                <h3 className="text-heading-m font-semibold text-white">{plan.name}</h3>
                <div className="mt-7 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-tight text-white">{plan.price}</span>
                  <span className="pb-1 text-body-s text-slate-400">{plan.cadence}</span>
                </div>
                <p className="mt-5 min-h-16 text-body-m leading-relaxed text-slate-400">{plan.description}</p>
                <ul className="mt-7 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-body-s text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <PlanButton
                  plan={plan.name.toLowerCase() as 'free' | 'recovery' | 'vault'}
                  className={`mt-8 inline-flex min-h-11 items-center justify-center rounded-pill px-5 py-3 text-body-s font-semibold transition-colors ${
                    plan.featured
                      ? 'bg-cyan-300 text-midnight hover:bg-cyan-200'
                      : 'border border-night-border text-white hover:border-slate-500'
                  }`}
                >
                  {plan.cta}
                </PlanButton>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-body-s text-slate-400">
          Cancel Vault anytime. You remain in control of the data you save, export, or delete.
        </p>
      </div>
    </section>
  )
}
