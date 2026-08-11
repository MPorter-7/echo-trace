import { useState, useEffect } from 'react'
import { Link } from 'react-router'

interface NavigationProps {
  onRequestAccess?: () => void
}

export function Navigation({ onRequestAccess }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-nav h-16 flex items-center transition-all duration-300 ${
          isScrolled ? 'bg-bone/90 text-ink backdrop-blur-xl' : 'bg-[#020817]/20 text-white backdrop-blur-sm'
        }`}
        style={{ borderBottom: `1px solid ${isScrolled ? 'rgba(26, 26, 26, 0.1)' : 'rgba(255, 255, 255, 0.14)'}` }}
      >
        <div className="w-full max-w-content mx-auto px-5 md:px-10 lg:px-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-heading-m font-semibold text-current">
            EchoTrace
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-10">
            <a
              href="#main"
              onClick={(e) => handleNavClick(e, '#main')}
              className="text-body-m text-current hover:text-cyan-300 transition-colors duration-200"
            >
              About
            </a>
            <a
              href="#pricing"
              onClick={(e) => handleNavClick(e, '#pricing')}
              className="text-body-m text-current hover:text-cyan-300 transition-colors duration-200"
            >
              Pricing
            </a>
            <a
              href="#security"
              onClick={(e) => handleNavClick(e, '#security')}
              className="text-body-m text-current hover:text-cyan-300 transition-colors duration-200"
            >
              Security
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="px-3 py-2 text-body-s font-medium text-current hover:text-cyan-300">Sign in</Link>
            <button
              onClick={onRequestAccess}
              className={`rounded-pill border px-6 py-2.5 text-body-s font-medium transition-all duration-300 ${
                isScrolled
                  ? 'border-ink bg-bone text-ink hover:bg-ink hover:text-bone'
                  : 'border-white/50 bg-white/10 text-white hover:border-cyan-300 hover:bg-cyan-300 hover:text-[#02101f]'
              }`}
            >
              Request Access
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-current md:hidden"
            aria-label="Toggle menu"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="0" y1="1" x2="20" y2="1" />
              <line x1="0" y1="7" x2="20" y2="7" />
              <line x1="0" y1="13" x2="20" y2="13" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-bone flex flex-col justify-center items-start px-10 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-5 right-5 text-ink p-2"
            aria-label="Close menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="4" y1="4" x2="20" y2="20" />
              <line x1="20" y1="4" x2="4" y2="20" />
            </svg>
          </button>
          <div className="flex flex-col gap-8">
            {[
              { label: 'About', href: '#main' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Security', href: '#security' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  handleNavClick(e, link.href)
                  setMobileMenuOpen(false)
                }}
                className="text-4xl font-semibold text-ink hover:text-gold transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-4xl font-semibold text-ink hover:text-gold">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
