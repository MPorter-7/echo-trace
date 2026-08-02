import { useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  const iconRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (!iconRef.current) return
    gsap.to(iconRef.current, {
      scale: 1.05,
      duration: 0.4,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    })
  }

  return (
    <div
      className="bg-bone border-2 border-ink rounded p-8 min-h-[280px] transition-colors duration-300 hover:border-gold group"
      onMouseEnter={handleMouseEnter}
    >
      <div ref={iconRef} className="mb-6 text-ink">
        {icon}
      </div>
      <h3 className="text-heading-m text-ink mb-3">{title}</h3>
      <p className="text-body-s text-ink/70 leading-relaxed">{description}</p>
    </div>
  )
}
