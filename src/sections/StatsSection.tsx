import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { SectionLabel } from '../components/SectionLabel'
import { ArrowLink } from '../components/ArrowLink'

const stats = [
  {
    value: 'Private by design',
    description:
      'Email history is analyzed in your browser. EchoTrace saves only the account findings you explicitly select—not raw mailbox content or credentials.',
  },
  {
    value: 'Evidence linked',
    description:
      'Possible matches keep their original public source and retrieval date so you can inspect the evidence behind each result.',
  },
  {
    value: 'You decide',
    description:
      'Confidence is an explainable estimate, never proof. You accept, reject, or mark each possible match uncertain before it becomes part of your history.',
  },
  {
    value: 'Portable and removable',
    description:
      'Export your timeline as JSON or CSV, remove individual records, or delete your application data when you choose.',
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
          <SectionLabel text="04 / BUILT ON EVIDENCE" />
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
              <h3 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-bone md:text-4xl">
                {stat.value}
              </h3>
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
