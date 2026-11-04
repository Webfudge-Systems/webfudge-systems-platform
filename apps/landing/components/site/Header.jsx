'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'
import { apps } from '../../data/site'
import { loginUrl, signupUrl } from '../../lib/links'

const LINKS = [
  ['Customers', '/customers'],
  ['Pricing', '/pricing'],
  ['Services', '/services'],
  ['About', '/about'],
]

function ProductsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div className="relative" ref={ref} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className="flex min-h-[44px] items-center gap-1 text-[15px] font-medium"
      >
        Products <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-[520px] -translate-x-1/2 pt-3">
          <div className="rounded-3xl border border-line bg-white p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,.3)]">
            <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Webfudge apps</p>
            <div className="grid grid-cols-2 gap-2">
              {apps.map((a) => (
                <Link key={a.slug} href={a.href} onClick={() => setOpen(false)} className="flex gap-3 rounded-2xl p-3 hover:bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.icon} alt="" className="h-11 w-11" />
                  <span>
                    <span className="flex items-center gap-2 font-semibold">
                      {a.name}
                      {!a.available && <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">Soon</span>}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted">{a.text}</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link href="/services" onClick={() => setOpen(false)} className="mt-2 block rounded-2xl bg-surface px-4 py-3 text-sm">
              <span className="font-semibold">Need something custom?</span> <span className="text-muted">ERPs, portals and extensions →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Header({ tone = 'light' }) {
  const [menu, setMenu] = useState(false)
  const pathname = usePathname()
  useEffect(() => setMenu(false), [pathname])
  const glass = tone === 'clear'

  return (
    <header className={`${glass ? 'absolute inset-x-0' : 'sticky border-b border-line bg-white/90 backdrop-blur-md'} top-0 z-40`}>
      <nav aria-label="Main" className="container-site flex items-center gap-8 py-3.5">
        <Link href="/" aria-label="Webfudge Systems home" className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/webfudge-horizontal-color.svg" alt="Webfudge Systems" className="h-10 w-auto" />
        </Link>
        <div className={`hidden items-center gap-7 lg:flex ${glass ? 'glass rounded-full px-5' : ''}`}>
          <ProductsMenu />
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className="flex min-h-[44px] items-center text-[15px] font-medium hover:text-brand-ink">
              {label}
            </Link>
          ))}
        </div>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <a href={loginUrl()} className="px-3 py-3 text-[15px] font-medium hover:text-brand-ink">
            Sign in
          </a>
          <a href={signupUrl()} className="btn-dark min-h-[44px] px-5">
            Start free
          </a>
        </div>
        <button type="button" className="ml-auto flex h-11 w-11 items-center justify-center rounded-full sm:ml-0 lg:hidden" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
          {menu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>
      {menu && (
        <div className="border-t border-line bg-white lg:hidden">
          <div className="container-site space-y-1 py-4">
            <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Apps</p>
            <div className="grid grid-cols-2 gap-2 pb-3">
              {apps.map((a) => (
                <Link key={a.slug} href={a.href} className="flex items-center gap-2.5 rounded-2xl bg-surface p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.icon} alt="" className="h-8 w-8" />
                  <span className="text-sm font-semibold">{a.name}</span>
                </Link>
              ))}
            </div>
            {LINKS.map(([label, href]) => (
              <Link key={href} href={href} className="block rounded-xl px-1 py-3 text-lg font-medium">
                {label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3">
              <a href={loginUrl()} className="btn-light flex-1">Sign in</a>
              <a href={signupUrl()} className="btn-dark flex-1">Start free</a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
