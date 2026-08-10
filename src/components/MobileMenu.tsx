import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const navLinks = [
  { label: 'About', href: '#main' },
  { label: 'Security', href: '#security' },
]

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const overlay = overlayRef.current
    const items = itemsRef.current
    if (!overlay || !items) return

    if (isOpen) {
      gsap.set(overlay, { display: 'flex' })
      gsap.to(overlay, { x: 0, duration: 0.3, ease: 'power2.out' })
      gsap.fromTo(
        items.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, delay: 0.15, ease: 'power2.out' }
      )
    } else {
      gsap.to(overlay, {
        x: '100%',
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => gsap.set(overlay, { display: 'none' }),
      })
    }
  }, [isOpen])

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    onClose()
    setTimeout(() => {
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 350)
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] bg-bone flex-col justify-center items-start px-10"
      style={{ display: 'none', transform: 'translateX(100%)' }}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-ink p-2"
        aria-label="Close menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="4" y1="4" x2="20" y2="20" />
          <line x1="20" y1="4" x2="4" y2="20" />
        </svg>
      </button>
      <div ref={itemsRef} className="flex flex-col gap-8">
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={(e) => handleLinkClick(e, link.href)}
            className="text-display-xl font-semibold text-ink hover:text-gold transition-colors duration-200"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}
