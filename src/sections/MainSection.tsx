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
  const img1aRef = useRef<HTMLImageElement>(null)
  const img1bRef = useRef<HTMLImageElement>(null)
  const img2aRef = useRef<HTMLImageElement>(null)
  const img2bRef = useRef<HTMLImageElement>(null)
  const img3aRef = useRef<HTMLImageElement>(null)
  const img3bRef = useRef<HTMLImageElement>(null)
  const imagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Entrance animations
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    })

    tl.fromTo(headlineRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' })
    tl.fromTo(body1Ref.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
    tl.fromTo(body2Ref.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
    tl.fromTo(ctaRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')

    // Parallax for images
    if (!prefersReducedMotion) {
      const parallaxElements = [
        { el: img1aRef.current, speed: 0.15 },
        { el: img1bRef.current, speed: 0.15 },
        { el: img2aRef.current, speed: 0.10 },
        { el: img2bRef.current, speed: 0.10 },
        { el: img3aRef.current, speed: 0.08 },
        { el: img3bRef.current, speed: 0.08 },
      ]

      parallaxElements.forEach(({ el, speed }) => {
        if (!el) return
        gsap.to(el, {
          y: () => -speed * 200,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        })
      })

      // Image cross-fade
      const setA = [img1aRef.current, img2aRef.current, img3aRef.current]
      const setB = [img1bRef.current, img2bRef.current, img3bRef.current]

      if (setA.every(Boolean) && setB.every(Boolean)) {
        const crossFadeTl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 60%',
            end: 'bottom 40%',
            scrub: true,
          },
        })

        setA.forEach((el) => {
          crossFadeTl.to(el, { opacity: 0, duration: 0.5, ease: 'none' }, 0)
        })
        setB.forEach((el) => {
          gsap.set(el, { opacity: 0 })
          crossFadeTl.to(el, { opacity: 1, duration: 0.5, ease: 'none' }, 0)
        })
      }
    } else {
      // Show set A only for reduced motion
      if (img1bRef.current) img1bRef.current.style.opacity = '0'
      if (img2bRef.current) img2bRef.current.style.opacity = '0'
      if (img3bRef.current) img3bRef.current.style.opacity = '0'
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
      id="main"
      className="relative bg-bone"
      style={{ paddingTop: '160px', paddingBottom: '80px' }}
    >
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20">
        <SectionLabel text="01 / IDENTITY" />

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8">
          {/* Left column - text */}
          <div className="lg:w-[55%]">
            <h1
              ref={headlineRef}
              className="text-4xl md:text-5xl lg:text-display-xxl font-semibold text-ink leading-none mb-6"
              style={{ letterSpacing: '-0.03em', lineHeight: '0.92' }}
            >
              Rebuild your digital past.
            </h1>
            <p
              ref={body1Ref}
              className="text-body-l text-ink max-w-[480px] mb-4"
            >
              Every account you've created, every platform you've used, every digital footprint you've left behind - EchoTrace reconstructs the fragments of your online identity into a coherent, chronological narrative.
            </p>
            <p
              ref={body2Ref}
              className="text-body-m text-ink/80 max-w-[480px] mb-8"
            >
              Our intelligent correlation engine discovers connections across public data sources, resolves conflicts between records, and assigns confidence scores to every recovered piece of your digital history.
            </p>
            <div ref={ctaRef}>
              <ArrowLink text="Learn more" href="#features" />
            </div>
          </div>

          {/* Right column - parallax images */}
          <div
            ref={imagesContainerRef}
            className="lg:w-[45%] relative hidden lg:block"
            style={{ minHeight: '450px' }}
          >
            {/* Image 1 - top right */}
            <div className="absolute top-0 right-0 w-[280px]">
              <img
                ref={img1aRef}
                src="/images/parallax/parallax-1a.jpg"
                alt="Archival letter"
                className="w-full rounded border border-ink/20"
                loading="lazy"
              />
              <img
                ref={img1bRef}
                src="/images/parallax/parallax-1b.jpg"
                alt="Data network"
                className="w-full rounded border border-ink/20 absolute top-0 left-0"
                loading="lazy"
              />
            </div>

            {/* Image 2 - center right */}
            <div className="absolute top-[140px] right-[100px] w-[240px]">
              <img
                ref={img2aRef}
                src="/images/parallax/parallax-2a.jpg"
                alt="Filing cabinet"
                className="w-full rounded border border-ink/20"
                loading="lazy"
              />
              <img
                ref={img2bRef}
                src="/images/parallax/parallax-2b.jpg"
                alt="Digital fragments"
                className="w-full rounded border border-ink/20 absolute top-0 left-0"
                loading="lazy"
              />
            </div>

            {/* Image 3 - far right bottom */}
            <div className="absolute top-[300px] right-0 w-[200px]">
              <img
                ref={img3aRef}
                src="/images/parallax/parallax-3a.jpg"
                alt="Scattered photos"
                className="w-full rounded border border-ink/20"
                loading="lazy"
              />
              <img
                ref={img3bRef}
                src="/images/parallax/parallax-3b.jpg"
                alt="Timeline data"
                className="w-full rounded border border-ink/20 absolute top-0 left-0"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20 mt-20">
        <div className="h-px bg-ink/10" />
      </div>
    </section>
  )
}
