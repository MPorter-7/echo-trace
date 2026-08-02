import { useEffect, useRef, lazy, Suspense } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const ThreeCarousel = lazy(() => import('../components/ThreeCarousel').then(m => ({ default: m.ThreeCarousel })))

export function HeroClip() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const scrollProgressRef = useRef(0)
  const overlayRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const copyrightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Pin the section and drive carousel rotation with scroll
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=400%',
      pin: true,
      scrub: prefersReducedMotion ? false : 1,
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress
      },
    })

    // Entrance animations
    const tl = gsap.timeline({ delay: 0.2 })
    tl.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out' }
    )
    tl.fromTo(
      ctaRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out' },
      '-=0.3'
    )
    tl.fromTo(
      [taglineRef.current, copyrightRef.current],
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.1 },
      '-=0.3'
    )

    return () => {
      st.kill()
      tl.kill()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-bone overflow-hidden"
    >
      {/* 3D Carousel */}
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-[1.5px] border-ink/30 rounded-full animate-spin border-t-ink" />
          </div>
        }
      >
        <ThreeCarousel scrollProgress={scrollProgressRef} />
      </Suspense>

      {/* Text Overlays */}
      <div className="absolute inset-0 pointer-events-none z-hero-overlay">
        {/* Top-left logo */}
        <div ref={overlayRef} className="hidden absolute top-10 left-5 md:left-10 pointer-events-auto">
          <span className="text-heading-m font-semibold text-ink">EchoTrace</span>
        </div>

        {/* Top-right CTA */}
        <button
          ref={ctaRef}
          className="hidden absolute top-10 right-5 md:right-10 pointer-events-auto rounded-pill border border-ink bg-bone text-ink text-body-s font-medium px-7 py-3.5 transition-all duration-300 hover:bg-ink hover:text-bone"
        >
          Request Access
        </button>

        {/* Bottom-left tagline */}
        <div ref={taglineRef} className="absolute bottom-10 left-5 md:left-10">
          <p className="text-body-m text-ink/70">
            Reconstructing the fragments
            <br />
            of your digital identity
          </p>
        </div>

        {/* Bottom-right copyright */}
        <div ref={copyrightRef} className="absolute bottom-10 right-5 md:right-10">
          <span className="text-micro uppercase text-ink/50">&copy; 2026</span>
        </div>


      </div>
    </section>
  )
}
