import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Menu, X } from 'lucide-react'

interface NavigationProps {
  onRequestAccess?: () => void
}

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Explore', href: '#explore' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'FAQ', href: '#faq' },
]

function scrollToHash(href: string) {
  const el = document.querySelector(href)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Navigation({ onRequestAccess }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const handleHashClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault()
    setMenuOpen(false)
    scrollToHash(href)
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className={`fixed inset-x-0 top-0 z-nav flex h-16 items-center border-b transition-colors duration-300 ${
          isScrolled
            ? 'border-night-border bg-midnight/90 backdrop-blur-xl'
            : 'border-transparent bg-midnight/40 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex w-full max-w-content items-center justify-between px-5 md:px-10 lg:px-20">
          <Link
            to="/"
            className="text-heading-m font-semibold tracking-tight text-white"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            EchoTrace
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => handleHashClick(event, link.href)}
                className="text-body-s font-medium text-slate-300 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-pill px-4 py-2 text-body-s font-medium text-slate-300 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-pill bg-cyan-300 px-5 py-2.5 text-body-s font-semibold text-midnight transition-colors hover:bg-cyan-200"
            >
              Create your workspace
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-md p-2 text-white md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-[200] flex flex-col bg-midnight px-6 py-6 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="flex items-center justify-between">
            <span className="text-heading-m font-semibold text-white">EchoTrace</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-md p-2 text-white"
              aria-label="Close menu"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Mobile" className="mt-10 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => handleHashClick(event, link.href)}
                className="border-b border-night-border py-4 text-2xl font-semibold text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            <Link
              to="/signup"
              onClick={() => setMenuOpen(false)}
              className="rounded-pill bg-cyan-300 px-6 py-3.5 text-center text-body-s font-semibold text-midnight"
            >
              Create your workspace
            </Link>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-pill border border-night-border px-6 py-3.5 text-center text-body-s font-medium text-white"
            >
              Sign in
            </Link>
            {onRequestAccess && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onRequestAccess()
                }}
                className="py-2 text-center text-body-s text-slate-400 underline underline-offset-4"
              >
                Join the email waitlist
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
