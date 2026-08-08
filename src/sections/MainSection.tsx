import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SectionLabel } from '../components/SectionLabel'
import { ArrowLink } from '../components/ArrowLink'

export function MainSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const body1Ref = useRef<HTMLParagraphElement>(null)
  const body2Ref = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    })

    timeline.fromTo(headlineRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' })
    timeline.fromTo(body1Ref.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
    timeline.fromTo(body2Ref.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
    timeline.fromTo(ctaRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
    timeline.fromTo(imageContainerRef.current, { opacity: 0, x: 36 }, { opacity: 1, x: 0, duration: 0.9, ease: 'power2.out' }, '-=0.8')

    if (!prefersReducedMotion && imageRef.current) {
      gsap.to(imageRef.current, {
        y: -28,
        scale: 1.035,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })
    }

    return () => {
      timeline.kill()
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === section) trigger.kill()
      })
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="main"
      className="relative bg-bone"
      style={{ paddingTop: '160px', paddingBottom: '80px' }}
    >
      <div className="mx-auto max-w-content px-5 md:px-10 lg:px-20">
        <SectionLabel text="01 / IDENTITY" />

        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-14">
          <div className="lg:w-[48%]">
            <h1
              ref={headlineRef}
              className="mb-6 text-4xl font-semibold leading-none text-ink md:text-5xl lg:text-display-xxl"
              style={{ letterSpacing: '-0.03em', lineHeight: '0.92' }}
            >
              Rebuild your digital past.
            </h1>
            <p ref={body1Ref} className="mb-4 max-w-[480px] text-body-l text-ink">
              Every account you've created, every platform you've used, every digital footprint you've left behind - EchoTrace reconstructs the fragments of your online identity into a coherent, chronological narrative.
            </p>
            <p ref={body2Ref} className="mb-8 max-w-[480px] text-body-m text-ink/80">
              Our intelligent correlation engine discovers connections across public data sources, resolves conflicts between records, and assigns confidence scores to every recovered piece of your digital history.
            </p>
            <div ref={ctaRef}>
              <ArrowLink text="Learn more" href="#features" />
            </div>
          </div>

          <div ref={imageContainerRef} className="lg:w-[52%]">
            <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-[#020817] shadow-[0_30px_80px_rgba(2,8,23,0.18)]">
              <img
                ref={imageRef}
                src="/images/sections/identity-reconstruction.webp"
                alt="Personal history fragments forming a chronological digital identity"
                width="1440"
                height="960"
                className="aspect-[3/2] w-full object-cover"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020817]/20 via-transparent to-transparent" />
            </div>
            <p className="mt-4 text-micro uppercase tracking-[0.18em] text-ink/45">
              From scattered fragments to one explainable timeline
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-content px-5 md:px-10 lg:px-20">
        <div className="h-px bg-ink/10" />
      </div>
    </section>
  )
}
