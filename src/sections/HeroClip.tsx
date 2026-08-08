import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { gsap } from 'gsap'

export function HeroClip() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const timeline = gsap.timeline({ delay: 0.15 })
    timeline.fromTo(
      contentRef.current,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }
    )
    timeline.fromTo(
      footerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out' },
      '-=0.35'
    )

    return () => {
      timeline.kill()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[720px] w-full items-center overflow-hidden bg-[#020817] text-white md:min-h-screen"
    >
      <img
        src="/images/hero/echo-trace-digital-archaeology.webp"
        alt=""
        width="1672"
        height="941"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[64%_center]"
      />

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,7,22,0.98)_0%,rgba(2,8,24,0.9)_31%,rgba(2,8,24,0.38)_63%,rgba(2,8,24,0.12)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,24,0.35)_0%,transparent_42%,rgba(2,8,24,0.7)_100%)]" />
      <div className="absolute left-[-10%] top-[22%] h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]" />

      <div className="relative z-10 mx-auto w-full max-w-content px-5 py-28 md:px-10 lg:px-20">
        <div ref={contentRef} className="max-w-[700px]">
          <p className="mb-6 text-label uppercase tracking-[0.22em] text-cyan-300">
            Privacy-first digital archaeology
          </p>
          <h1 className="max-w-[680px] text-5xl font-semibold leading-[0.96] tracking-[-0.035em] text-white sm:text-6xl lg:text-[88px]">
            Reclaim your digital history.
          </h1>
          <p className="mt-7 max-w-[560px] text-lg leading-relaxed text-slate-200 md:text-xl">
            Reconstruct the scattered accounts, memories, and milestones that shaped your online life—privately, transparently, and on your terms.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex min-h-12 items-center justify-center rounded-pill border border-cyan-300 bg-cyan-300 px-7 py-3 text-body-s font-semibold text-[#02101f] transition-colors duration-200 hover:border-cyan-200 hover:bg-cyan-200"
            >
              Start your recovery
            </Link>
            <a
              href="#main"
              className="inline-flex min-h-12 items-center justify-center rounded-pill border border-white/35 bg-white/5 px-7 py-3 text-body-s font-medium text-white backdrop-blur-sm transition-colors duration-200 hover:border-white/60 hover:bg-white/10"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>

      <div
        ref={footerRef}
        className="absolute inset-x-0 bottom-7 z-10 mx-auto flex max-w-content items-end justify-between px-5 text-white/55 md:px-10 lg:px-20"
      >
        <p className="text-body-s">
          Your fragments. Your timeline.
          <br />
          Your identity.
        </p>
        <span className="text-micro uppercase">&copy; 2026</span>
      </div>
    </section>
  )
}
