import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export function EchoWaveform() {
  const pathRef = useRef<SVGPathElement>(null)
  const containerRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const path = pathRef.current
    const container = containerRef.current
    if (!path || !container) return

    const length = path.getTotalLength()
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
    })

    const tween = gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: container,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
    })

    return () => {
      tween.kill()
    }
  }, [])

  // Generate dampened sine wave path
  const generateWaveformPath = () => {
    const width = 1400
    const height = 40
    const midY = height / 2
    const points: string[] = []
    const steps = 200

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width
      const progress = i / steps
      // Dampening factor: starts at 1, decays to 0
      const dampening = Math.exp(-progress * 4)
      const amplitude = 16 * dampening
      const frequency = 8
      const y = midY + Math.sin(progress * Math.PI * frequency) * amplitude
      points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    }

    return points.join(' ')
  }

  return (
    <svg
      ref={containerRef}
      viewBox="0 0 1400 40"
      className="w-full h-10 mb-12"
      preserveAspectRatio="none"
    >
      <path
        ref={pathRef}
        d={generateWaveformPath()}
        fill="none"
        stroke="#1A1A1A"
        strokeOpacity="0.15"
        strokeWidth="1"
      />
    </svg>
  )
}
