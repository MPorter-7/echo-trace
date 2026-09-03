import { Link } from 'react-router'

const PRODUCT_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Explore', href: '#explore' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'FAQ', href: '#faq' },
]

function scrollToHash(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  event.preventDefault()
  const el = document.querySelector(href)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Footer() {
  return (
    <footer className="border-t border-night-border bg-midnight px-5 py-14 md:px-10 lg:px-20">
      <div className="mx-auto max-w-content">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <span className="text-heading-m font-semibold text-white">EchoTrace</span>
            <p className="mt-4 max-w-xs text-body-s leading-relaxed text-slate-400">
              A privacy-first workspace for recovering, organizing, and preserving your own digital history.
              Not a people-search or surveillance tool.
            </p>
          </div>

          <div>
            <span className="text-micro uppercase tracking-[0.14em] text-cyan-300">Product</span>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(event) => scrollToHash(event, link.href)}
                    className="text-body-s text-slate-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-micro uppercase tracking-[0.14em] text-cyan-300">Account & legal</span>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link to="/signup" className="text-body-s text-slate-400 transition-colors hover:text-white">
                  Create your workspace
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-body-s text-slate-400 transition-colors hover:text-white">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-body-s text-slate-400 transition-colors hover:text-white">
                  Privacy Notice
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-body-s text-slate-400 transition-colors hover:text-white">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-night-border pt-6">
          <span className="text-micro uppercase tracking-[0.12em] text-slate-500">
            &copy; 2026 EchoTrace. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  )
}
