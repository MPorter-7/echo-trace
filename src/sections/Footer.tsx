import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { EchoWaveform } from '../components/EchoWaveform'
import { PillButton } from '../components/PillButton'
import { Link } from 'react-router'

const productLinks = [
  { label: 'Overview', href: '#overview' },
  { label: 'Features', href: '#features' },
  { label: 'Security', href: '#security' },
  { label: 'Download', href: '/dashboard/settings' },
]

const socialLinks = [
  { label: 'Twitter', href: 'https://twitter.com/echotrace' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/echotrace' },
  { label: 'GitHub', href: 'https://github.com/echotrace' },
]

interface FooterProps {
  onRequestAccess?: () => void
}

export function Footer({ onRequestAccess }: FooterProps) {
  const footerRef = useRef<HTMLElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const copyrightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const footer = footerRef.current
    if (!footer) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: footer,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
    })

    tl.fromTo(leftRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' })
    tl.fromTo(centerRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.7')
    tl.fromTo(rightRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.7')
    tl.fromTo(copyrightRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.4')

    return () => {
      tl.kill()
    }
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer
      ref={footerRef}
      className="relative bg-bone"
      style={{ borderTop: '1px solid rgba(26, 26, 26, 0.1)', paddingTop: '80px', paddingBottom: '48px' }}
    >
      <div className="max-w-content mx-auto px-5 md:px-10 lg:px-20">
        <EchoWaveform />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Left column - CTA */}
          <div ref={leftRef}>
            <h3
              className="text-3xl lg:text-display-l font-semibold text-ink mb-6"
              style={{ letterSpacing: '-0.01em', lineHeight: '1.05' }}
            >
              Ready to reconstruct your past?
            </h3>
            <PillButton text="Request Access" size="large" onClick={onRequestAccess} />
          </div>

          {/* Center column - Product links */}
          <div ref={centerRef}>
            <span className="text-label uppercase text-gold block mb-4">Product</span>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('#') ? (
                    <a
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="text-body-s text-ink hover:text-gold transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-body-s text-ink hover:text-gold transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Right column - Connect + Legal */}
          <div ref={rightRef}>
            <span className="text-label uppercase text-gold block mb-4">Connect</span>
            <ul className="space-y-3 mb-8">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-s text-ink hover:text-gold transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-micro uppercase text-silver hover:text-ink transition-colors duration-200">
                Privacy
              </Link>
              <Link to="/terms" className="text-micro uppercase text-silver hover:text-ink transition-colors duration-200">
                Terms
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div ref={copyrightRef} className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(26, 26, 26, 0.05)' }}>
          <span className="text-micro uppercase text-silver">
            &copy; 2026 EchoTrace. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  )
}
