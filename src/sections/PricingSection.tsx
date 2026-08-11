import { Check } from 'lucide-react'
import { SectionLabel } from '../components/SectionLabel'
import { PlanButton } from '../billing/PlanButton'

const plans = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'Start rebuilding your digital history with the essential recovery tools.',
    features: ['Create your private account', 'Gmail quick scan', 'Limited findings', 'Basic timeline and manual entries'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Recovery',
    price: '$19.99',
    cadence: 'one-time',
    description: 'Unlock your complete recovery without adding another subscription.',
    features: ['Everything in Free', 'Full scan results and complete timeline', 'JSON and CSV exports', 'Evidence uploads and recovery report'],
    cta: 'Unlock recovery',
    featured: true,
  },
  {
    name: 'Vault',
    price: '$7.99',
    cadence: 'per month',
    description: 'Keep your recovered history organized, private, and available over time.',
    features: ['Everything in Recovery while active', 'Private long-term storage', 'Continued scans and advanced organization', 'Expanded file storage'],
    cta: 'Choose Vault',
    featured: false,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative bg-bone py-20 md:py-28">
      <div className="mx-auto max-w-content px-5 md:px-10 lg:px-20">
        <SectionLabel text="05 / PRICING" />
        <div className="mt-3 max-w-3xl">
          <h2
            className="text-3xl font-semibold text-ink md:text-5xl lg:text-display-xl"
            style={{ letterSpacing: '-0.02em', lineHeight: '0.95' }}
          >
            Start free. Pay once for a complete recovery.
          </h2>
          <p className="mt-6 max-w-2xl text-body-m leading-relaxed text-ink/70">
            Explore EchoTrace at no cost, unlock your full recovery for one clear price, or add a private vault when you want ongoing storage and scans.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-7 md:p-8 ${
                plan.featured
                  ? 'border-ink bg-ink text-bone shadow-2xl lg:-translate-y-3'
                  : 'border-ink/15 bg-white/60 text-ink'
              }`}
            >
              {plan.featured && (
                <span className="absolute right-6 top-6 rounded-pill bg-cyan-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#02101f]">
                  Most Popular
                </span>
              )}
              <h3 className="text-heading-m font-semibold">{plan.name}</h3>
              <div className="mt-7 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                <span className={`pb-1 text-body-s ${plan.featured ? 'text-bone/60' : 'text-ink/55'}`}>
                  {plan.cadence}
                </span>
              </div>
              <p className={`mt-5 min-h-16 text-body-m leading-relaxed ${plan.featured ? 'text-bone/75' : 'text-ink/70'}`}>
                {plan.description}
              </p>
              <ul className="mt-7 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-body-s">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? 'text-cyan-300' : 'text-ink'}`} aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <PlanButton
                plan={plan.name.toLowerCase() as 'free' | 'recovery' | 'vault'}
                className={`mt-8 inline-flex min-h-11 items-center justify-center rounded-pill border px-5 py-3 text-body-s font-semibold transition-colors ${
                  plan.featured
                    ? 'border-cyan-300 bg-cyan-300 text-[#02101f] hover:bg-white'
                    : 'border-ink bg-ink text-bone hover:bg-transparent hover:text-ink'
                }`}
              >
                {plan.cta}
              </PlanButton>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-body-s text-ink/55">
          Cancel Vault anytime. You remain in control of the data you save, export, or delete.
        </p>
      </div>
    </section>
  )
}
