'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from 'lucide-react'
import { signupUrl } from '../../lib/links'

const money = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`

/** Pricing cards with a monthly / yearly switch. `plans` come from the API (or defaults). */
export function PricingCards({ plans, compact = false }) {
  const [yearly, setYearly] = useState(false)
  return (
    <div>
      <div role="group" aria-label="Billing period" className="mx-auto mb-10 flex w-max gap-1 rounded-full bg-surface p-1">
        <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} className={`min-h-[44px] rounded-full px-5 text-[15px] font-medium ${!yearly ? 'bg-ink text-white' : ''}`}>
          Monthly
        </button>
        <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} className={`min-h-[44px] rounded-full px-5 text-[15px] font-medium ${yearly ? 'bg-ink text-white' : ''}`}>
          Yearly <span className={yearly ? 'text-brand-glow' : 'text-brand-ink'}>−15%</span>
        </button>
      </div>
      <div className={`grid gap-4 sm:grid-cols-2 ${compact ? 'lg:grid-cols-4' : 'xl:grid-cols-4'}`}>
        {plans.map((p) => {
          const dark = p.isPopular
          const per = yearly ? p.pricePerUserMonthly * (1 - (p.yearlyDiscountPercent ?? 15) / 100) : p.pricePerUserMonthly
          const free = p.pricePerUserMonthly === 0
          return (
            <article key={p.code} className={`flex flex-col gap-4 rounded-[28px] p-7 ${dark ? 'bg-ink text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)]' : 'bg-surface'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                {dark && <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-ink">Popular</span>}
              </div>
              <p className={`min-h-[44px] text-[15px] leading-snug ${dark ? 'text-[#BDBDBD]' : 'text-muted'}`}>{p.description}</p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-5xl font-medium tracking-[-0.04em]">{free ? '₹0' : money(per)}</span>
                <span className={`text-sm ${dark ? 'text-[#BDBDBD]' : 'text-muted'}`}>{free ? 'forever' : '/ user / mo'}</span>
              </p>
              <p className={`-mt-2 min-h-[20px] text-[13px] ${dark ? 'text-[#BDBDBD]' : 'text-muted'}`}>
                {free ? `Up to ${p.maxUsers || 3} users` : yearly ? `${money(per * 12)} per user, billed yearly` : 'Billed monthly'}
              </p>
              <a href={signupUrl()} className={`${dark ? 'btn-brand' : 'btn-dark'}`}>
                {free ? 'Get started' : 'Start free trial'}
              </a>
              <ul className="mt-1 space-y-2.5">
                {(p.features || []).map((f) => (
                  <li key={f} className="flex gap-2.5 text-[15px] leading-snug">
                    <Check className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-brand" aria-hidden="true" strokeWidth={2.6} />
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
      <p className="mt-6 text-center text-sm text-muted">Prices are per user, per month, for one app, and exclude GST.</p>
    </div>
  )
}

export function Faq({ items }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="space-y-2.5">
      {items.map((f, i) => {
        const isOpen = open === i
        return (
          <div key={f.q} className={`rounded-[18px] transition-colors ${isOpen ? 'bg-ink text-white' : 'bg-surface'}`}>
            <h3>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)} className="flex min-h-[64px] w-full items-center justify-between gap-4 px-6 py-5 text-left text-[17px] font-medium">
                {f.q}
                {isOpen ? <Minus className="h-5 w-5 flex-shrink-0" aria-hidden="true" /> : <Plus className="h-5 w-5 flex-shrink-0" aria-hidden="true" />}
              </button>
            </h3>
            {isOpen && <p className="px-6 pb-6 text-[15px] leading-relaxed text-[#D4D4D4]">{f.a}</p>}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Customer voices. Only quotes marked `approved` are shown as quotes; until then each card shows
 * a factual summary of what was built, so nothing is attributed to a customer without their OK.
 */
export function Testimonials({ customers }) {
  const [index, setIndex] = useState(0)
  const max = Math.max(0, customers.length - 1)
  return (
    <section aria-labelledby="testimonials-h" className="overflow-hidden px-5 pt-28 sm:px-6">
      <div className="mx-auto max-w-site">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-4 text-[13px] uppercase tracking-[0.14em] text-muted">Customer stories</p>
            <h2 id="testimonials-h" className="h-section">
              What we built <span className="accent text-brand">for our customers</span>
            </h2>
          </div>
          <div className="flex gap-2.5">
            <button type="button" aria-label="Previous" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))} className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white disabled:opacity-30">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Next" disabled={index === max} onClick={() => setIndex((i) => Math.min(max, i + 1))} className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white disabled:opacity-30">
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-4 transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none" style={{ transform: `translateX(calc(-${index} * (min(380px, 85vw) + 16px)))` }}>
          {customers.map((c) => {
            const quote = c.quote?.approved ? c.quote : null
            return (
              <figure key={c.slug} className="flex min-h-[420px] w-[min(380px,85vw)] flex-shrink-0 flex-col rounded-[28px] bg-surface p-7">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted">{c.industry}</span>
                  <span className={`flex h-[52px] min-w-[96px] items-center justify-center overflow-hidden rounded-full border border-[#DCDCD8] px-4 ${c.logo.surface === 'dark' ? 'bg-ink' : c.logo.surface === 'tile' ? 'bg-[#FF6A4D] px-0' : 'bg-white'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.logo.src} alt={c.name} className={c.logo.surface === 'tile' ? 'h-[52px] w-auto' : 'max-h-8 w-auto'} />
                  </span>
                </div>
                <p className="accent mt-7 text-6xl leading-[.5] text-brand" aria-hidden="true">“</p>
                <blockquote className="mt-4 text-[24px] font-medium leading-tight tracking-tight">{quote ? quote.text : c.headline}</blockquote>
                <figcaption className="mt-auto border-l border-[#BDBDB8] pl-3.5">
                  {quote ? (
                    <>
                      <p className="font-semibold">{quote.name}</p>
                      <p className="mt-1 text-sm text-muted">{quote.role}, {c.name}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">{c.name}</p>
                      <Link href={`/customers/${c.slug}`} className="mt-1 inline-block text-sm font-semibold text-brand-ink hover:underline">Read the story →</Link>
                    </>
                  )}
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}
