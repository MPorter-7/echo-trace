import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { SectionLabel } from '../components/SectionLabel'
import { ArrowLink } from '../components/ArrowLink'
import { AnimatedCounter } from '../components/AnimatedCounter'

const stats = [
  {
    value: '47%',
    description:
      'of online accounts are abandoned or forgotten by their original owners, leaving fragments of personal history scattered across the web',
  },
  {
    value: '156+',
    description:
      'data sources continuously monitored and cross-referenced to build the most complete picture of your digital identity',
  },
  {
    value: '2.3M',
    description:
      'records processed daily through our correlation engine, each one analyzed for relevance, accuracy, and relationship to your identity graph',
  },
  {
    value: '99.7%',
    description:
      'accuracy rate in conflict resolution when cross-referencing multiple data sources for the same identity event',
  },
]

export function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

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

    tl.fromTo(headerRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })

    if (gridRef.current) {
      const cards = gridRef.current.children
      tl.fromTo(
        cards,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' },
        '-=0.3'
      )
    }

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="stats"
      className="relative bg-charcoal"
      style={{ paddingTop: '120px', paddingBottom: '120px' }}
    >
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20">
        <div ref={headerRef} className="flex items-start justify-between mb-12">
          <SectionLabel text="04 / BY THE NUMBERS" />
          <ArrowLink text="Learn more" href="#security" light />
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="border border-bone/20 rounded p-10 min-h-[200px]"
            >
              <AnimatedCounter target={stat.value} duration={1.5} />
              <p className="text-body-m text-bone/80 mt-4 leading-relaxed">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom divider */}
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20 mt-20">
        <div className="h-px bg-bone/10" />
      </div>
    </section>
  )
}
