import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { companySocialLinks } from '@/app/config/socialLinks'
import { footerClickScrollMode } from '@/app/layout/footerScroll'
import { useAuth } from '@/features/auth/authContext'
import { Button } from '@/shared/ui/Button'

const publicLinks = [
  { to: '/discover', label: 'Discover' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/for-businesses', label: 'For businesses' },
  { to: '/for-ambassadors', label: 'For ambassadors' },
]

function scrollDocumentToTop() {
  const root = document.documentElement
  const previous = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  window.scrollTo(0, 0)
  root.style.scrollBehavior = previous
}

function FooterRouteLink({
  to,
  children,
  onClick,
}: {
  to: string
  children: string
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <Link to={to} onClick={onClick}>
      {children}
    </Link>
  )
}

export function PublicShell() {
  const { status, user, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const footerScrollRequest = useRef(false)
  const authenticated = status === 'authenticated' || status === 'restricted'

  useLayoutEffect(() => {
    if (!footerScrollRequest.current) return
    footerScrollRequest.current = false
    if (location.hash) return
    scrollDocumentToTop()
  }, [location.hash, location.key, location.pathname, location.search])

  function onFooterRouteClick(event: MouseEvent<HTMLAnchorElement>) {
    const destination = new URL(event.currentTarget.href)
    const mode = footerClickScrollMode(event, location, destination)
    if (mode === 'immediate') scrollDocumentToTop()
    if (mode === 'on-next-location') footerScrollRequest.current = true
  }

  const authActions =
    authenticated && user ? (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
            void logout()
          }}
        >
          Sign out
        </Button>
        <Link
          className="btn btn--primary btn--sm"
          to={user.role === 'BUSINESS' ? '/app/business' : '/app/ambassador'}
          onClick={() => setOpen(false)}
        >
          Open app
        </Link>
      </>
    ) : (
      <>
        <Link className="btn btn--ghost btn--sm" to="/login" onClick={() => setOpen(false)}>
          Sign in
        </Link>
        <Link className="btn btn--primary btn--sm" to="/register" onClick={() => setOpen(false)}>
          Get started
        </Link>
      </>
    )

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand" aria-label="MarcatursHub home">
            <span className="brand__mark" aria-hidden>
              M
            </span>
            MarcatursHub
          </Link>
          <nav className="site-header__nav" aria-label="Primary">
            <ul className="nav-links">
              {publicLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} onClick={() => setOpen(false)}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="nav-actions">
            <div className="nav-actions__auth">{authActions}</div>
            <button
              type="button"
              className="mobile-nav-toggle"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="visually-hidden">Menu</span>
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </div>
        <div id="mobile-nav" className={`mobile-drawer${open ? ' is-open' : ''}`}>
          {publicLinks.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
          <div className="mobile-drawer__actions">{authActions}</div>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container site-footer__grid">
          <div>
            <div className="brand site-footer__brand">
              <span className="brand__mark">M</span>
              MarcatursHub
            </div>
            <p className="site-footer__intro">
              More reach for businesses. More opportunities for independent ambassadors. Businesses can now easily connect with ambassadors to promote their products and services.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>
              <li>
                <FooterRouteLink to="/discover" onClick={onFooterRouteClick}>
                  Discover
                </FooterRouteLink>
              </li>
              <li>
                <FooterRouteLink to="/how-it-works" onClick={onFooterRouteClick}>
                  How it works
                </FooterRouteLink>
              </li>
              <li>
                <FooterRouteLink to="/faq" onClick={onFooterRouteClick}>
                  FAQ
                </FooterRouteLink>
              </li>
            </ul>
          </div>
          <div>
            <h3>Participate</h3>
            <ul>
              <li>
                <FooterRouteLink to="/for-businesses" onClick={onFooterRouteClick}>
                  For businesses
                </FooterRouteLink>
              </li>
              <li>
                <FooterRouteLink to="/for-ambassadors" onClick={onFooterRouteClick}>
                  For ambassadors
                </FooterRouteLink>
              </li>
              <li>
                <FooterRouteLink to="/register" onClick={onFooterRouteClick}>
                  Create account
                </FooterRouteLink>
              </li>
            </ul>
          </div>
          <div>
            <h3>Company</h3>
            <ul>
              <li>
                <FooterRouteLink to="/about" onClick={onFooterRouteClick}>
                  About
                </FooterRouteLink>
              </li>
              <li>
                <FooterRouteLink to="/contact" onClick={onFooterRouteClick}>
                  Contact
                </FooterRouteLink>
              </li>
              <li>
                <FooterRouteLink to="/terms" onClick={onFooterRouteClick}>
                  Terms
                </FooterRouteLink>
              </li>
              <li>
                <FooterRouteLink to="/privacy" onClick={onFooterRouteClick}>
                  Privacy
                </FooterRouteLink>
              </li>
            </ul>
          </div>
          <div>
            <h3>Follow</h3>
            <ul className="site-footer__social">
              {companySocialLinks.map((network) => (
                <li key={network.id}>
                  {network.href ? (
                    <a
                      href={network.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${network.label} (opens in a new tab)`}
                    >
                      {network.label}
                    </a>
                  ) : (
                    <span
                      className="site-footer__social-pending"
                      aria-label={`${network.label} (link destination awaiting confirmation)`}
                    >
                      {network.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="container site-footer__meta">
          © {new Date().getFullYear()} MarcatursHub. Marketplace coordination.
        </div>
      </footer>
    </>
  )
}
