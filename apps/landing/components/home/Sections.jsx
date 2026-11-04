import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { apps, kpis, services, steps } from '../../data/site'
import { customers } from '../../data/customers'
import { signupUrl } from '../../lib/links'
import CustomerMock from '../mocks/CustomerMock'

export function Hero() {
  return (
    <section className="px-5 pb-10 pt-14 sm:px-6 sm:pt-20">
      <div className="mx-auto flex max-w-site flex-wrap items-center gap-12">
        <div className="min-w-0 flex-[1_1_540px] reveal">
          <h1 className="h-display">
            Business apps that work the way <span className="accent text-brand">your team</span> does.
          </h1>
          <p className="mt-7 max-w-[540px] text-[19px] leading-relaxed text-muted">
            Sell with Webfudge CRM. Deliver with Webfudge Projects. Pick only the apps you need, try each free for 14 days, and pay per app when you are ready.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href={signupUrl()} className="btn-dark min-h-[52px] px-7 text-base">
              Start your free trial <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link href="/contact" className="btn-light min-h-[52px] px-7 text-base">
              Book a demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">No card needed · Set up in under 3 minutes</p>
        </div>

        <div className="min-w-0 flex-[1_1_420px] rounded-[28px] border border-line bg-white p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,.25)] reveal" style={{ animationDelay: '.15s' }}>
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Webfudge apps</p>
          <div className="grid grid-cols-2 gap-2.5">
            {apps.map((a) => (
              <Link key={a.slug} href={a.href} className="group flex flex-col gap-3 rounded-[18px] bg-[#F7F7F5] p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,.25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.icon} alt="" className="icon3d h-12 w-12" />
                <span>
                  <span className="flex items-center gap-2 text-[17px] font-semibold">
                    {a.name}
                    {!a.available && <span className="rounded-full bg-[#EAEAE6] px-2 py-0.5 text-[11px] font-semibold text-muted">Soon</span>}
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-muted">{a.text}</span>
                </span>
              </Link>
            ))}
          </div>
          <Link href="/pricing" className="mt-4 inline-block text-sm font-semibold text-brand-ink hover:underline">
            See plans and pricing →
          </Link>
        </div>
      </div>
    </section>
  )
}

export function Logos() {
  return (
    <section aria-labelledby="trusted" className="px-5 pb-6 pt-16 sm:px-6">
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-center gap-x-14 gap-y-6">
        <p id="trusted" className="text-[15px] text-muted">Running on Webfudge software</p>
        {/* eslint-disable @next/next/no-img-element */}
        <img src="/customers/evi.webp" alt="EVI" className="h-14 w-auto grayscale contrast-[1.4] mix-blend-multiply" />
        <img src="/customers/positiev.png" alt="PositiEV" className="h-8 w-auto grayscale contrast-[1.3] mix-blend-multiply" />
        <img src="/customers/bikewo.webp" alt="BikeWo" className="h-10 w-auto opacity-75 brightness-0" />
        <img src="/customers/xtrawrkx.png" alt="Xtrawrkx" className="h-12 w-12 rounded-xl object-cover brightness-[.6] grayscale" />
        {/* eslint-enable @next/next/no-img-element */}
      </div>
    </section>
  )
}

export function About() {
  return (
    <section id="about" className="px-5 pb-16 pt-28 sm:px-6">
      <div className="mx-auto max-w-[1120px] text-center">
        <p className="eyebrow mb-7">About Webfudge Systems</p>
        <p className="text-[clamp(28px,3.6vw,52px)] font-medium leading-[1.16] tracking-[-0.035em]">
          Webfudge Systems{' '}
          <span className="inline-flex gap-0.5 rounded-full bg-surface px-2.5 py-1 align-middle">
            {/* eslint-disable @next/next/no-img-element */}
            <img src="/apps/crm.svg" alt="" className="h-[1em] w-[1em]" />
            <img src="/apps/projects.svg" alt="" className="h-[1em] w-[1em]" />
            <img src="/apps/books.svg" alt="" className="h-[1em] w-[1em]" />
            {/* eslint-enable @next/next/no-img-element */}
          </span>{' '}
          builds the software growing businesses run on —{' '}
          <span className="text-[#8C8C8C]">from CRM and project management to custom ERPs, client portals and browser extensions, designed and built in Pune, India.</span>
        </p>
      </div>
      <dl className="mx-auto mt-20 grid max-w-site grid-cols-2 gap-y-8 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col border-l border-[#E2E2DE] px-5 sm:px-7">
            <dt className="order-2 mt-3 text-[15px] text-muted sm:text-base">{k.label}</dt>
            <dd className="text-[clamp(44px,5vw,72px)] font-medium leading-none tracking-[-0.05em]">{k.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function AppsBento() {
  return (
    <section id="apps" className="px-5 py-24 sm:px-6">
      <div className="mx-auto max-w-site">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="eyebrow mb-5">The apps</p>
          <h2 className="h-section">
            Start with one app. <span className="accent text-brand">Add the next</span> when you need it.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['CRM', '/apps/crm.svg', 'Leads, companies, contacts and deals in one pipeline — with follow-ups, proposals and meetings that never slip.', '/crm', 'Explore CRM'],
            ['Projects', '/apps/projects.svg', 'Plan work, assign tasks, track deadlines and see who has room this week — across every client and project.', '/projects', 'Explore Projects'],
          ].map(([name, icon, text, href, cta]) => (
            <article key={name} className="flex flex-col gap-5 rounded-[28px] bg-surface p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={icon} alt="" className="icon3d h-16 w-16" />
              <h3 className="text-3xl font-medium tracking-tightish">{name}</h3>
              <p className="text-[17px] leading-relaxed text-muted">{text}</p>
              <Link href={href} className="btn-dark mt-auto self-start">{cta}</Link>
            </article>
          ))}
          <article className="relative flex flex-col gap-5 overflow-hidden rounded-[28px] bg-ink p-8 text-white">
            <div aria-hidden="true" className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(245,99,15,.65),rgba(245,99,15,0)_70%)]" />
            <div className="relative flex items-center gap-3">
              {/* eslint-disable @next/next/no-img-element */}
              <img src="/apps/crm.svg" alt="" className="h-12 w-12" />
              <ArrowRight className="h-6 w-6 text-brand" aria-hidden="true" />
              <img src="/apps/projects.svg" alt="" className="h-12 w-12" />
              {/* eslint-enable @next/next/no-img-element */}
            </div>
            <h3 className="relative text-3xl font-medium tracking-tightish">
              Better <span className="accent text-brand-glow">together</span>
            </h3>
            <p className="relative text-[17px] leading-relaxed text-[#BDBDBD]">Use both apps and they link up on their own. A won deal becomes a project in one click, with the client’s details carried over.</p>
          </article>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ['/apps/books.svg', 'Books', 'Invoices, payments and GST-ready accounts.'],
            ['/apps/hr.svg', 'HR', 'People, leave and attendance in one place.'],
          ].map(([icon, name, text]) => (
            <article key={name} id={name.toLowerCase()} className="flex items-center gap-5 rounded-[28px] border border-line p-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={icon} alt="" className="icon3d h-14 w-14" />
              <div>
                <h3 className="text-xl font-semibold">
                  {name} <span className="ml-1 rounded-full bg-surface px-2 py-1 align-middle text-xs font-semibold text-muted">Coming soon</span>
                </h3>
                <p className="mt-1.5 text-[15px] text-muted">{text}</p>
              </div>
            </article>
          ))}
          <article className="flex items-center gap-5 rounded-[28px] border border-line p-7">
            <p className="text-6xl font-medium leading-none tracking-[-0.04em] text-brand">14</p>
            <div>
              <h3 className="text-xl font-semibold">days free, per app</h3>
              <p className="mt-1.5 text-[15px] text-muted">No card needed. Keep only what you use.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export function HowItWorks() {
  return (
    <section className="px-5 pb-28 sm:px-6">
      <div className="mx-auto max-w-site">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 className="h-section max-w-3xl">
            From sign-up to your first deal in <span className="accent text-brand">three minutes.</span>
          </h2>
          <a href={signupUrl()} className="btn-dark">Try it now</a>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="flex min-h-[220px] flex-col rounded-3xl bg-surface p-7">
              <p className="text-sm font-semibold text-brand-ink">Step {s.n}</p>
              <h3 className="mb-2 mt-auto text-[22px] font-semibold tracking-tight">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function CustomersShowcase() {
  return (
    <section id="customers" className="bg-night px-5 py-28 text-white sm:px-6">
      <div className="mx-auto max-w-site">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <h2 className="h-section max-w-3xl">
            Built with the teams <span className="accent text-brand-glow">who use it</span> every day.
          </h2>
          <Link href="/customers" className="btn min-h-[44px] border border-[#3A3A3A] text-white hover:bg-white/10">All customer stories →</Link>
        </div>
        <div className="grid gap-x-5 gap-y-12 md:grid-cols-2">
          {customers.map((c) => (
            <article key={c.slug} className="group">
              <Link href={`/customers/${c.slug}`} className="block">
                <CustomerMock customer={c} />
                <div className="mt-5 flex gap-4">
                  <span className={`flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl ${c.logo.surface === 'dark' ? 'bg-ink' : c.logo.surface === 'tile' ? '' : 'bg-white'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.logo.src} alt={c.name} className={c.logo.surface === 'tile' ? 'h-full w-full object-cover' : 'max-h-10 w-[54px] object-contain'} />
                  </span>
                  <div>
                    <div className="mb-2.5 flex flex-wrap gap-1.5">
                      {c.built.map((b) => (
                        <span key={b} className="rounded-full border border-[#333] px-2.5 py-1 text-xs text-[#D4D4D4]">{b}</span>
                      ))}
                      {c.status === 'deploying' && <span className="rounded-full bg-brand-glow px-2.5 py-1 text-xs font-semibold text-ink">Rolling out</span>}
                    </div>
                    <h3 className="text-[22px] font-medium leading-snug tracking-tight">{c.headline}</h3>
                    <span className="mt-2.5 inline-block text-[15px] font-medium text-brand-glow group-hover:underline">Read the {c.name} story →</span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div id="services" className="mt-28 border-t border-[#262626] pt-16">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <h2 className="h-section">
              Need it custom? <span className="accent text-brand-glow">We build that too.</span>
            </h2>
            <Link href="/contact" className="btn-white">Talk to our team</Link>
          </div>
          <ul>
            {services.map((s) => (
              <li key={s.name}>
                <Link href="/services" className="group flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border-b border-[#262626] px-5 py-6 transition-colors hover:bg-brand hover:text-ink">
                  <span className="flex-[1_1_380px] text-[clamp(32px,4.6vw,64px)] font-medium leading-none tracking-[-0.04em]">{s.name}</span>
                  <span className="flex-[1_1_260px] text-[15px] text-[#A3A3A3] group-hover:text-ink">{s.example}</span>
                  <ArrowUpRight className="h-7 w-7" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function FinalCta({ title = 'Start free today.', accent = 'Be working in minutes.' }) {
  return (
    <section className="px-5 pb-6 sm:px-6">
      <div className="stage relative mx-auto max-w-site overflow-hidden rounded-[36px] px-6 py-28 text-center text-white">
        <div className="beam" aria-hidden="true" />
        <div className="relative">
          <h2 className="mx-auto max-w-4xl text-[clamp(40px,5.4vw,76px)] font-medium leading-none tracking-display">
            {title} <span className="accent text-brand-glow">{accent}</span>
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href={signupUrl()} className="btn-white min-h-[52px] px-7 text-base">Start your free trial</a>
            <Link href="/contact" className="btn min-h-[52px] border border-white/35 px-7 text-base text-white hover:bg-white/10">Book a demo</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
