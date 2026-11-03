'use client'

import { Check } from 'lucide-react'
import { WEBSITE_URL } from '../../lib/saas'

const PERKS = [
  'A 14-day free trial on every app, no card needed',
  'Pay only for the apps you keep, per user',
  'Invite your team with the right roles from day one',
  'Your apps link up automatically when you use more than one',
]

const LOGOS = [
  { src: '/customers/evi.webp', alt: 'EVI', bg: 'bg-white', img: 'h-9' },
  { src: '/customers/xtrawrkx.png', alt: 'Xtrawrkx', bg: '', img: 'h-full w-full object-cover' },
  { src: '/customers/positiev.png', alt: 'PositiEV', bg: 'bg-white px-2', img: 'max-h-6' },
  { src: '/customers/bikewo.webp', alt: 'BikeWo', bg: 'bg-[#0E0B09] border border-white/10 px-2', img: 'max-h-7' },
]

/** Split screen for sign-up, sign-in and onboarding: form on the left, brand panel on the right. */
export default function AuthLayout({ children, steps, current, aside = true, topRight }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-white font-primary text-[#0F0F0F]">
      <main className="flex min-w-0 flex-[999_1_560px] flex-col px-5 pb-8 pt-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <a href={WEBSITE_URL} aria-label="Webfudge Systems website">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/webfudge-horizontal-color.svg" alt="Webfudge Systems" className="h-10 w-auto" />
          </a>
          {topRight}
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[460px]">
            {steps && (
              <ol aria-label="Progress" className="mb-9 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                {steps.map((name, i) => (
                  <li key={name} aria-current={i === current ? 'step' : undefined}>
                    <span className={`block h-1 rounded-full ${i <= current ? 'bg-[#F5630F]' : 'bg-[#EAEAE6]'}`} />
                    <span className={`mt-2 whitespace-nowrap text-xs font-semibold ${i === current ? 'block text-[#0F0F0F]' : 'hidden text-[#5C5C5C] sm:block'}`}>{name}</span>
                  </li>
                ))}
              </ol>
            )}
            {children}
          </div>
        </div>

        <p className="text-center text-[13px] text-[#5C5C5C]">
          © {new Date().getFullYear()} Webfudge Systems ·{' '}
          <a className="underline-offset-2 hover:underline" href={`${WEBSITE_URL}/legal/privacy`}>Privacy</a> ·{' '}
          <a className="underline-offset-2 hover:underline" href={`${WEBSITE_URL}/legal/terms`}>Terms</a> ·{' '}
          <a className="underline-offset-2 hover:underline" href={`${WEBSITE_URL}/contact`}>Help</a>
        </p>
      </main>

      {aside && (
        <aside className="relative hidden min-w-0 flex-[1_1_420px] flex-col justify-between gap-12 overflow-hidden bg-[#0B0B0B] px-12 py-14 text-white lg:flex">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(245,99,15,.55),rgba(245,99,15,0)_70%)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/webfudge-horizontal-light.svg" alt="" className="relative h-9 w-auto self-start" />
          <div className="relative">
            <h2 className="text-[42px] font-medium leading-[1.05] tracking-[-0.035em]">
              One account.
              <br />
              <span className="font-serif-accent italic text-[#FF9A5C]">Every Webfudge app.</span>
            </h2>
            <ul className="mt-8 space-y-4">
              {PERKS.map((p) => (
                <li key={p} className="flex gap-3 text-[17px] leading-snug text-[#E8E2DC]">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#FF9A5C]" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Running on Webfudge software</p>
            <div className="grid grid-cols-4 gap-2">
              {LOGOS.map((l) => (
                <div key={l.alt} className={`flex h-14 items-center justify-center overflow-hidden rounded-xl ${l.bg}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.src} alt={l.alt} className={`${l.img} w-auto`} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
