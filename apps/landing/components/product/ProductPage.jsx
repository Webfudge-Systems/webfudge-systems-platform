import Link from 'next/link'
import { ArrowUpRight, Check } from 'lucide-react'
import Header from '../site/Header'
import Footer from '../site/Footer'
import FeatureExplorer from './FeatureExplorer'
import { Board, CRM_BOARD, PM_BOARD } from '../mocks/AppWindow'
import { Faq, PricingCards } from '../home/Interactive'
import { customers } from '../../data/customers'
import { signupUrl } from '../../lib/links'

function Clouds() {
  return (
    <div aria-hidden="true">
      <span className="cloud" style={{ width: 620, height: 220, left: -120, top: 120 }} />
      <span className="cloud" style={{ width: 520, height: 200, right: -80, top: 60, animationDuration: '46s' }} />
      <span className="cloud" style={{ width: 900, height: 260, left: '20%', top: 520, animationDuration: '54s' }} />
    </div>
  )
}

function Hero({ page }) {
  return (
    <section className="relative overflow-hidden px-5 pb-0 pt-24 sm:px-6" style={{ background: page.sky }}>
      <Clouds />
      <div className="relative mx-auto max-w-4xl pt-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={page.icon} alt="" className="bob mx-auto h-[92px] w-[92px]" />
        <p className="mt-3.5 text-[15px] font-semibold">Webfudge {page.name}</p>
        <h1 className="h-display mt-3.5">
          {page.h1[0]} <span className="accent" style={{ color: page.accentText }}>{page.h1[1]}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[620px] text-[19px] leading-relaxed text-[#4A4A4A]">{page.lede}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <a href={signupUrl()} className="btn-dark min-h-[52px] px-7 text-base">Try {page.name} free</a>
          <a href="#explore" className="btn glass min-h-[52px] px-6 text-base">
            <span className="h-2 w-2 rounded-full" style={{ background: page.accent }} />
            See it in action
          </a>
        </div>
        <p className="mt-4 text-sm text-[#4A4A4A]">14-day free trial · no card needed · from ₹499 per user / month</p>
      </div>

      <div className="relative mx-auto mt-16 max-w-[1180px] [perspective:1800px]">
        <div className="rise flex h-[460px] overflow-hidden rounded-t-[30px] border-[8px] border-b-0 border-white bg-[#F6F6F4] shadow-[0_-30px_80px_-30px_rgba(0,0,0,.35)] sm:h-[540px]">
          <aside className="hidden w-[210px] flex-shrink-0 border-r border-line bg-white p-4 md:block">
            <div className="mb-3.5 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.icon} alt="" className="h-7 w-7" />
              <span className="text-[15px] font-bold">Webfudge {page.short}</span>
            </div>
            <div className="mb-3 flex h-9 items-center gap-2 rounded-[10px] bg-brand-soft px-2 text-xs font-semibold">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-brand text-[15px] text-white">+</span>Quick Actions
            </div>
            {page.menu.map((m, i) => (
              <div key={m} className={`mb-0.5 rounded-lg px-2.5 py-2 text-[13px] ${i === 0 ? 'bg-brand font-semibold text-white' : 'text-[#3A3A3A]'}`}>{m}</div>
            ))}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-3.5 p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5">
              <div className="flex-1">
                <p className="text-[11px] text-[#8A8A8A]">{page.crumb}</p>
                <p className="mt-0.5 text-[22px] font-medium tracking-tight">{page.screen}</p>
              </div>
              <span className="rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white">{page.newLabel}</span>
            </div>
            <div className="relative min-h-0 flex-1">
              <Board columns={page.board === 'crm' ? CRM_BOARD : PM_BOARD} />
              <div aria-hidden="true" className="drag absolute left-2.5 top-[214px] hidden w-[calc(25%-27px)] rounded-[10px] border-2 bg-white p-2.5 shadow-[0_18px_30px_-12px_rgba(0,0,0,.35)] sm:block" style={{ borderColor: page.accent }}>
                <p className="text-[13px] font-semibold">{page.drag[0]}</p>
                <p className="mt-1 text-xs text-muted">{page.drag[1]}</p>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#0F0F0F" stroke="#FFFFFF" strokeWidth="1.5" className="absolute -bottom-3 -right-2">
                  <path d="M4 3l15 7-6.5 2L10 19z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="bob absolute -left-6 bottom-[-120px] hidden h-[440px] w-[220px] rounded-[38px] bg-ink p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,.5)] lg:block" style={{ animationDuration: '7s' }}>
          <div className="h-full overflow-hidden rounded-[30px] bg-[#F6F6F4] px-3 pb-3 pt-8">
            <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.icon} alt="" className="h-[18px] w-[18px]" />
              {page.phoneTitle}
            </p>
            {page.phone.map(([a, b]) => (
              <div key={a} className="mb-1.5 rounded-xl bg-white px-2.5 py-2">
                <p className="text-xs font-semibold">{a}</p>
                <p className="mt-0.5 text-[11px] text-muted">{b}</p>
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="absolute -right-4 top-16 hidden w-[270px] lg:block">
          <div className="toast glass flex items-center gap-2.5 rounded-2xl px-3.5 py-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,.35)]">
            <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] text-base font-bold text-white" style={{ background: page.accent }}>+</span>
            <span><span className="block text-[13px] font-semibold">{page.toasts[0][0]}</span><span className="block text-xs text-[#4A4A4A]">{page.toasts[0][1]}</span></span>
          </div>
        </div>
        <div aria-hidden="true" className="absolute right-10 top-40 hidden w-[250px] lg:block">
          <div className="toast toast-late glass flex items-center gap-2.5 rounded-2xl px-3.5 py-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,.35)]">
            <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[#0E9F6E] text-white"><Check className="h-[18px] w-[18px]" strokeWidth={2.6} /></span>
            <span><span className="block text-[13px] font-semibold">{page.toasts[1][0]}</span><span className="block text-xs text-[#4A4A4A]">{page.toasts[1][1]}</span></span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Why({ page }) {
  return (
    <section id="why" className="px-5 pb-28 pt-16 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3.5 text-[13px] uppercase tracking-[0.14em] text-muted">Why {page.name}</p>
            <h2 className="max-w-2xl text-[clamp(34px,4vw,54px)] font-medium leading-[1.05] tracking-[-0.04em]">{page.whyTitle}</h2>
          </div>
          <a href="#explore" className="btn-light">How it works</a>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {page.why.map((w) => (
            <article key={w.title} className={`rounded-[28px] p-7 transition hover:-translate-y-1 ${w.featured ? 'text-white' : 'border border-line bg-white'}`} style={w.featured ? { background: page.featured } : undefined}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: w.featured ? '#FFFFFF' : page.accent, color: w.featured ? page.accent : '#FFFFFF' }}>
                <ArrowUpRight className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <h3 className="mb-2 mt-4 text-xl font-semibold">{w.title}</h3>
              <p className={`text-[15px] leading-relaxed ${w.featured ? 'text-white/85' : 'text-muted'}`}>{w.text}</p>
              <div className={`mt-6 flex h-[120px] items-end gap-2 rounded-2xl p-3.5 ${w.featured ? 'bg-white/20' : 'bg-surface'}`} aria-hidden="true">
                {w.bars.map((h, i) => (
                  <span key={i} className="flex-1 rounded-lg" style={{ height: `${h}%`, background: i === 5 && w.featured ? '#FFFFFF' : w.featured ? 'rgba(255,255,255,.45)' : '#E2E2DE' }} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Together({ page }) {
  const nodes = [
    { x: '17%', y: '18%', icon: page.other.icon, label: page.other.name, href: page.other.href, op: 1 },
    { x: '83%', y: '18%', icon: '/apps/books.svg', label: 'Books · soon', op: 0.7 },
    { x: '14%', y: '79%', icon: '/apps/hr.svg', label: 'HR · soon', op: 0.7 },
    { x: '86%', y: '79%', icon: '/brand/webfudge-mark-orange.svg', label: 'Accounts', op: 1 },
  ]
  return (
    <section id="together" className="px-5 pb-28 sm:px-6">
      <div className="relative mx-auto flex max-w-[1180px] flex-wrap items-center gap-12 overflow-hidden rounded-[36px] px-7 py-16 text-white sm:px-12" style={{ background: page.gloss }}>
        <div className="relative flex-[1_1_400px]">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-3.5 py-2 text-[13px] uppercase tracking-[0.08em]">Better together</p>
          <h2 className="text-[clamp(34px,4vw,54px)] font-medium leading-[1.05] tracking-[-0.04em]">
            {page.together[0]} <span className="accent text-[#FFD2B5]">{page.together[1]}</span>
          </h2>
          <p className="mt-4 max-w-[480px] text-[17px] leading-relaxed text-white/75">{page.together[2]}</p>
          <Link href={page.other.href} className="btn-white mt-7">Explore Webfudge {page.other.name}</Link>
        </div>
        <div className="relative h-[380px] flex-[1_1_420px]">
          <svg viewBox="0 0 420 380" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <g fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" className="dash">
              <path d="M210 190 L70 70" />
              <path d="M210 190 L350 70" />
              <path d="M210 190 L60 300" />
              <path d="M210 190 L360 300" />
            </g>
          </svg>
          <div className="absolute left-1/2 top-1/2 -ml-[60px] -mt-[60px] flex h-[120px] w-[120px] items-center justify-center rounded-[36px] bg-white/95 shadow-[0_0_0_10px_rgba(255,255,255,.12),0_30px_60px_-20px_rgba(0,0,0,.5)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.icon} alt={`Webfudge ${page.name}`} className="h-[84px] w-[84px]" />
          </div>
          {nodes.map((n, i) => (
            <div key={n.label} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: n.x, top: n.y }}>
              <div className="bob mx-auto flex h-[70px] w-[70px] items-center justify-center rounded-[22px] bg-white/90" style={{ animationDelay: `${-i}s`, opacity: n.op }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={n.icon} alt="" className="h-12 w-12 object-contain" />
              </div>
              <p className="mt-2 text-[13px] font-semibold">{n.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function ProductPage({ page, plans }) {
  const users = page.users.map(([slug, line]) => ({ ...customers.find((c) => c.slug === slug), line })).filter((u) => u.slug)
  return (
    <>
      <Header tone="clear" />
      <main id="main">
        <Hero page={page} />

        <section className="border-t border-line bg-white px-5 py-9 sm:px-6">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-14 gap-y-5">
            <p className="text-[15px] text-muted">Teams running on Webfudge {page.short}</p>
            {/* eslint-disable @next/next/no-img-element */}
            <img src="/customers/positiev.png" alt="PositiEV" className="h-8 w-auto grayscale contrast-[1.3] mix-blend-multiply" />
            <img src="/customers/bikewo.webp" alt="BikeWo" className="h-10 w-auto opacity-75 brightness-0" />
            <img src="/customers/xtrawrkx.png" alt="Xtrawrkx" className="h-12 w-12 rounded-xl object-cover brightness-[.6] grayscale" />
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </section>

        <section className="px-5 pb-10 pt-28 sm:px-6">
          <p className="mx-auto max-w-[1100px] text-center text-[clamp(28px,3.6vw,52px)] font-medium leading-[1.16] tracking-[-0.035em]">
            {page.statement[0]} <span className="text-[#8C8C8C]">{page.statement[1]}</span>
          </p>
        </section>

        <Why page={page} />

        <section id="explore" className="bg-surface px-5 py-28 sm:px-6">
          <div className="mx-auto max-w-[1180px]">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <p className="eyebrow mb-5 bg-white">Inside {page.name}</p>
              <h2 className="h-section">
                {page.feat[0]} <span className="accent" style={{ color: page.accentText }}>{page.feat[1]}</span>
              </h2>
            </div>
            <FeatureExplorer page={page} />
          </div>
        </section>

        <section className="px-5 py-28 sm:px-6">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="mb-10 text-[clamp(32px,3.6vw,48px)] font-medium leading-[1.05] tracking-[-0.04em]">
              And everything else <span className="accent" style={{ color: page.accentText }}>you’d expect.</span>
            </h2>
            <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {page.extras.map(([a, b]) => (
                <div key={a} className="bg-white p-6">
                  <p className="text-[17px] font-semibold">{a}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Together page={page} />

        <section id="customers" className="px-5 pb-28 sm:px-6">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="mb-10 text-[clamp(34px,4vw,54px)] font-medium leading-[1.05] tracking-[-0.04em]">
              Who runs on <span className="accent" style={{ color: page.accentText }}>{page.name}</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {users.map((u) => (
                <article key={u.slug} className="flex flex-col gap-4 rounded-[28px] bg-surface p-7 transition hover:-translate-y-1">
                  <span className={`flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[18px] ${u.logo.surface === 'dark' ? 'bg-ink' : u.logo.surface === 'tile' ? '' : 'bg-white'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.logo.src} alt={u.name} className={u.logo.surface === 'tile' ? 'h-full w-full object-cover' : 'w-[60px] object-contain'} />
                  </span>
                  <p className="text-xl font-medium leading-snug tracking-tight">{u.line}</p>
                  <Link href={`/customers/${u.slug}`} className="mt-auto text-[15px] font-medium text-brand-ink hover:underline">Read the {u.name} story →</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-5 pb-28 sm:px-6">
          <div className="mx-auto max-w-site">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <h2 className="h-section">Webfudge {page.name} pricing</h2>
              <p className="mt-4 text-[17px] text-muted">Per user, per month. Every paid plan starts with a 14-day free trial.</p>
            </div>
            <PricingCards plans={plans} compact />
          </div>
        </section>

        <section className="px-5 pb-28 sm:px-6">
          <div className="mx-auto max-w-[880px]">
            <h2 className="mb-10 text-center text-[clamp(32px,3.6vw,48px)] font-medium tracking-[-0.04em]">Questions about {page.name}</h2>
            <Faq items={page.faqs} />
          </div>
        </section>

        <section className="px-5 pb-6 sm:px-6">
          <div className="relative mx-auto max-w-[1180px] overflow-hidden rounded-[36px] px-6 py-24 text-center" style={{ background: page.sky }}>
            <span className="cloud" aria-hidden="true" style={{ width: 520, height: 180, left: -80, top: 40 }} />
            <span className="cloud" aria-hidden="true" style={{ width: 520, height: 180, right: -80, bottom: 20, animationDuration: '44s' }} />
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.icon} alt="" className="bob mx-auto h-[72px] w-[72px]" />
              <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(38px,5vw,68px)] font-medium leading-none tracking-display">
                {page.cta[0]} <span className="accent" style={{ color: page.accentText }}>{page.cta[1]}</span>
              </h2>
              <a href={signupUrl()} className="btn-dark mt-8 min-h-[52px] px-7 text-base">Start your free trial</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
