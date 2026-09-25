'use client'

import Link from 'next/link'

/** Premium PLAYBEAT. wordmark — replaces gaming logo */
export function Wordmark({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  const sizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }
  return (
    <span
      className={`pb-wordmark ${sizes[size]}`}
      style={light ? { color: '#F8FAFC' } : undefined}
    >
      PLAYBEAT<span className="dot">.</span>
    </span>
  )
}

/** Compact cookie banner — bottom-left, 320px, dismissible */
export function CookieBanner() {
  if (typeof window === 'undefined') return null
  if (localStorage.getItem('pb-cookie-dismissed') === 'true') return null
  return (
    <div className="pb-cookie-banner">
      <div className="font-semibold text-white mb-1">We use cookies</div>
      <p className="text-silver text-xs mb-3">
        We use cookies to improve your experience. By continuing, you agree to our cookie policy.
      </p>
      <div className="flex gap-2">
        <button
          className="pb-cta-gold text-xs px-3 py-1.5 rounded flex-1"
          onClick={() => {
            localStorage.setItem('pb-cookie-dismissed', 'true')
            window.location.reload()
          }}
        >
          Accept
        </button>
        <button
          className="text-xs px-3 py-1.5 rounded border border-silver/30 text-silver hover:bg-silver/10 flex-1"
          onClick={() => {
            localStorage.setItem('pb-cookie-dismissed', 'true')
            window.location.reload()
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

/** Trust strip — moved from footer to directly under hero */
export function TrustStrip() {
  const items = [
    { icon: '🔒', label: 'Secure Payments' },
    { icon: '⚡', label: 'Instant Delivery' },
    { icon: '✓', label: 'Verified Products' },
    { icon: '📞', label: '24/7 Support' },
    { icon: '↩', label: '7-Day Guarantee' },
  ]
  return (
    <div className="pb-trust-strip">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-around flex-wrap gap-3">
          {items.map((item, i) => (
            <div key={i} className="item">
              <span className="text-gold">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Enterprise header — premium wordmark + nav */
export function Header({ activeRoute }: { activeRoute?: 'storefront' | 'crm' | 'admin' | 'home' }) {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Wordmark size="md" />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/storefront"
            className={`font-medium transition-colors ${activeRoute === 'storefront' ? 'text-navy' : 'text-slate-600 hover:text-navy'}`}
          >
            Storefront
          </Link>
          <Link
            href="/crm"
            className={`font-medium transition-colors ${activeRoute === 'crm' ? 'text-navy' : 'text-slate-600 hover:text-navy'}`}
          >
            CRM
          </Link>
          <Link
            href="/admin"
            className={`font-medium transition-colors ${activeRoute === 'admin' ? 'text-navy' : 'text-slate-600 hover:text-navy'}`}
          >
            Admin
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/storefront">
            <button className="pb-cta-gold text-sm px-4 py-2 rounded-md">
              Shop Now
            </button>
          </Link>
        </div>
      </div>
    </header>
  )
}

/** Format price as Rs {price.toLocaleString()} — PKR for Pakistan */
export function formatPrice(price: number, currency = 'PKR'): string {
  if (currency === 'PKR') return `Rs ${price.toLocaleString()}`
  return `${currency} ${price.toLocaleString()}`
}
