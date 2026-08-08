import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ArrowLink } from '../components/ArrowLink'

const LOGOS = [
  'Twitter', 'LinkedIn', 'GitHub', 'Instagram', 'Reddit', 'Medium',
  'Facebook', 'Spotify', 'YouTube', 'Pinterest', 'Tumblr', 'Flickr',
]

export function OverviewSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const logosRef = useRef<HTMLDivElement>(null)

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

    tl.fromTo(taglineRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' })
    tl.fromTo(bodyRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
    tl.fromTo(ctaRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
    tl.fromTo(dividerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.4')

    if (logosRef.current) {
      const logos = logosRef.current.children
      tl.fromTo(
        logos,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' },
        '-=0.2'
      )
    }

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="overview"
      className="relative bg-bone"
      style={{ paddingTop: '120px', paddingBottom: '80px' }}
    >
      <div className="max-w-[800px] mx-auto px-5 md:px-10 text-center">
        <h2
          ref={taglineRef}
          className="text-3xl md:text-5xl lg:text-display-xl font-semibold text-ink mb-6"
          style={{ letterSpacing: '-0.02em', lineHeight: '0.95' }}
        >
          Identity shouldn't be a puzzle you can't solve.
        </h2>
        <p ref={bodyRef} className="text-body-l text-ink/80 max-w-[640px] mx-auto mb-6">
          EchoTrace gives you a private workspace to rebuild your own digital history from information you provide, account evidence you authorize, and traceable public sources. It organizes possible matches, explains confidence signals, and keeps conflicts visible while you decide what becomes part of your timeline.
        </p>
        <div ref={ctaRef} className="mb-12">
          <ArrowLink text="Learn more" href="#features" />
        </div>

        {/* Divider */}
        <div ref={dividerRef} className="h-px bg-ink/10 max-w-[1000px] mx-auto mb-12" />
      </div>

      {/* Logo Grid */}
      <div className="max-w-[1000px] mx-auto px-5 md:px-10">
        <div
          ref={logosRef}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-12 gap-y-8 justify-items-center"
        >
          {LOGOS.map((name) => (
            <span
              key={name}
              className="text-body-s font-medium text-ink/40 transition-all duration-200 hover:scale-105 hover:text-ink/70 cursor-default select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom divider */}
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20 mt-20">
        <div className="h-px bg-ink/10" />
      </div>
    </section>
  )
}
