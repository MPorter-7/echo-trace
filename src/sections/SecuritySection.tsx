import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SectionLabel } from '../components/SectionLabel'
import { ArrowLink } from '../components/ArrowLink'

export function SecuritySection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const imgElRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Text panel entrance
    const textTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    })

    if (textRef.current) {
      const children = textRef.current.children
      textTl.fromTo(
        children,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: 'power2.out' }
      )
    }

    // Image panel entrance
    if (imageRef.current) {
      gsap.fromTo(
        imageRef.current,
        { opacity: 0, x: 40 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          delay: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      )
    }

    // Blur-to-focus parallax on image
    if (!prefersReducedMotion && imgElRef.current) {
      gsap.fromTo(
        imgElRef.current,
        { filter: 'blur(5px)' },
        {
          filter: 'blur(0px)',
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'bottom 20%',
            scrub: true,
          },
        }
      )

      // Vertical parallax
      gsap.to(imgElRef.current, {
        y: -40,
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
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === section) st.kill()
      })
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="security"
      className="relative bg-warm"
      style={{ paddingTop: '120px', paddingBottom: '120px' }}
    >
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Left - text */}
          <div ref={textRef} className="lg:w-1/2">
            <SectionLabel text="05 / SECURITY" />
            <h2
              className="text-3xl md:text-5xl lg:text-display-xl font-semibold text-ink mt-3 mb-6"
              style={{ letterSpacing: '-0.02em', lineHeight: '0.95' }}
            >
              Your data. Your control.
            </h2>
            <p className="text-body-m text-ink/80 max-w-[440px] leading-relaxed mb-8">
              EchoTrace is built on a foundation of transparency and user sovereignty. We never store passwords, never access private accounts, and never share your data with third parties. Our platform only processes publicly available information that you have the right to access. Every data source is fully auditable, every correlation is explainable, and every result can be traced back to its origin. You decide what to keep, what to discard, and what to share.
            </p>
            <ArrowLink text="Learn more" href="#" />
          </div>

          {/* Right - image */}
          <div ref={imageRef} className="lg:w-1/2">
            <img
              ref={imgElRef}
              src="/images/security.jpg"
              alt="Digital security concept"
              className="w-full rounded object-cover"
              style={{ aspectRatio: '4/5' }}
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20 mt-20">
        <div className="h-px bg-ink/10" />
      </div>
    </section>
  )
}
