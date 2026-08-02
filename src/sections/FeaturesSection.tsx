import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { SectionLabel } from '../components/SectionLabel'
import { FeatureCard } from '../components/FeatureCard'
import { ArrowLink } from '../components/ArrowLink'

const features = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="8" r="3" />
        <circle cx="24" cy="8" r="3" />
        <circle cx="10" cy="24" r="3" />
        <line x1="12.5" y1="9.5" x2="21.5" y2="22.5" />
        <line x1="10" y1="11" x2="10" y2="21" />
        <line x1="21.5" y1="9.5" x2="12.5" y2="22.5" />
      </svg>
    ),
    title: 'Cross-Platform Correlation',
    description:
      'Intelligent algorithms discover hidden connections across disparate public data sources. Accounts, posts, profiles, and interactions are automatically linked to build a unified picture of your digital footprint.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="6" y1="16" x2="26" y2="16" />
        <polyline points="20,10 26,16 20,22" />
        <polyline points="12,10 6,16 12,22" />
      </svg>
    ),
    title: 'Conflict Resolution',
    description:
      'When records from different sources contradict each other, EchoTrace applies intelligent heuristics to determine the most accurate information. Conflicts are flagged, analyzed, and resolved automatically.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 4 C10 4, 6 8, 6 14 L6 26 L12 23 L16 26 L20 23 L26 26 L26 14 C26 8, 22 4, 16 4Z" />
        <polyline points="11,16 14,19 21,12" />
      </svg>
    ),
    title: 'Confidence Scoring',
    description:
      'Every piece of recovered data receives a confidence score based on source reliability, cross-reference verification, and data freshness. You always know how trustworthy each fragment of your history is.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="4" y1="16" x2="28" y2="16" />
        <circle cx="10" cy="16" r="2.5" />
        <circle cx="22" cy="16" r="2.5" />
        <circle cx="16" cy="16" r="2.5" />
      </svg>
    ),
    title: 'Timeline Visualization',
    description:
      'Your reconstructed history is presented as an interactive, chronological timeline. Navigate through years of digital life with an intuitive interface that makes your data immediately comprehensible.',
  },
]

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    })

    tl.fromTo(labelRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' })

    if (gridRef.current) {
      const cards = gridRef.current.children
      tl.fromTo(
        cards,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' },
        '-=0.3'
      )
    }

    tl.fromTo(ctaRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.3')

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative bg-bone"
      style={{ paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20">
        <div ref={labelRef}>
          <SectionLabel text="03 / CAPABILITIES" />
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8"
        >
          {features.map((feature, i) => (
            <FeatureCard
              key={i}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>

        <div ref={ctaRef} className="mt-8">
          <ArrowLink text="Learn more" href="#stats" />
        </div>
      </div>

      {/* Bottom divider */}
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20 mt-20">
        <div className="h-px bg-ink/10" />
      </div>
    </section>
  )
}
