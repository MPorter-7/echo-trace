import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface ScrollRevealOptions {
  y?: number
  duration?: number
  delay?: number
  stagger?: number
  threshold?: string
}

export function useScrollReveal<T extends HTMLElement>(options: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null)
  const {
    y = 24,
    duration = 0.8,
    delay = 0,
    stagger = 0,
    threshold = 'top 80%',
  } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    if (prefersReducedMotion) {
      gsap.set(el, { opacity: 1, y: 0 })
      return
    }

    const targets = stagger > 0 ? el.children : el
    
    gsap.set(targets, { opacity: 0, y })

    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration,
      delay,
      stagger: stagger > 0 ? stagger : 0,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: threshold,
        toggleActions: 'play none none none',
      },
    })

    return () => {
      tween.kill()
    }
  }, [y, duration, delay, stagger, threshold])

  return ref
}
