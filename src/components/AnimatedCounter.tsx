import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface AnimatedCounterProps {
  target: string
  duration?: number
}

export function AnimatedCounter({ target, duration = 1.5 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState('0')
  const containerRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Extract numeric portion and suffix
    const match = target.match(/^([\d.]+)(.*)$/)
    if (!match) {
      setDisplayValue(target)
      return
    }

    const numericTarget = parseFloat(match[1])
    const suffix = match[2] || ''

    const proxy = { value: 0 }

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        if (hasAnimated.current) return
        hasAnimated.current = true

        if (prefersReducedMotion) {
          setDisplayValue(target)
          return
        }

        gsap.to(proxy, {
          value: numericTarget,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            let formatted: string
            if (numericTarget >= 1 && numericTarget % 1 !== 0) {
              formatted = proxy.value.toFixed(1)
            } else {
              formatted = Math.round(proxy.value).toString()
            }
            setDisplayValue(formatted + suffix)
          },
        })
      },
    })

    return () => {
      trigger.kill()
    }
  }, [target, duration])

  return (
    <span ref={containerRef} className="text-display-l text-gold font-semibold">
      {displayValue}
    </span>
  )
}
