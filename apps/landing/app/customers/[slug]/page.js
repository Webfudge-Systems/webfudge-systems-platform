import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import Header from '../../../components/site/Header'
import Footer from '../../../components/site/Footer'
import CustomerMock from '../../../components/mocks/CustomerMock'
import { FinalCta } from '../../../components/home/Sections'
import { customers, getCustomer } from '../../../data/customers'

export function generateStaticParams() {
  return customers.map((c) => ({ slug: c.slug }))
}

export function generateMetadata({ params }) {
  const c = getCustomer(params.slug)
  if (!c) return {}
  return {
    title: `${c.name} — customer story`,
    description: c.summary,
    alternates: { canonical: `/customers/${c.slug}` },
  }
}

export default function CustomerStoryPage({ params }) {
  const c = getCustomer(params.slug)
  if (!c) notFound()
  const others = customers.filter((x) => x.slug !== c.slug).slice(0, 3)
  const quote = c.quote?.approved ? c.quote : null

  return (
    <>
      <Header />
      <main id="main">
        <article>
          <header className="px-5 pb-12 pt-16 sm:px-6 sm:pt-20">
            <div className="mx-auto max-w-site">
              <Link href="/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All customers
              </Link>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <span className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-line ${c.logo.surface === 'dark' ? 'bg-ink' : 'bg-white'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.logo.src} alt={c.name} className={c.logo.surface === 'tile' ? 'h-full w-full object-cover' : 'w-[52px] object-contain'} />
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-surface px-3 py-1.5 text-sm font-semibold">{c.industry}</span>
                  {c.built.map((b) => (
                    <span key={b} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">{b}</span>
                  ))}
                  {c.status === 'deploying' && <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-[#8F3907]">Rolling out</span>}
                </div>
              </div>
              <h1 className="mt-6 max-w-4xl text-[clamp(38px,5vw,68px)] font-medium leading-[1.02] tracking-display">{c.headline}</h1>
              <p className="mt-6 max-w-2xl text-[19px] leading-relaxed text-muted">{c.summary}</p>
            </div>
          </header>

          <div className="px-5 sm:px-6">
            <div className="mx-auto max-w-site">
              <CustomerMock customer={c} tall />
            </div>
          </div>

          <div className="px-5 py-20 sm:px-6">
            <div className="mx-auto grid max-w-site gap-12 lg:grid-cols-[1fr_380px]">
              <div className="space-y-12">
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">The challenge</h2>
                  <p className="mt-4 text-[22px] leading-relaxed tracking-tight">{c.challenge}</p>
                </section>
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">What we built</h2>
                  <p className="mt-4 text-[22px] leading-relaxed tracking-tight">{c.solution}</p>
                </section>
                {quote && (
                  <figure className="rounded-[28px] bg-surface p-8">
                    <p className="accent text-6xl leading-[.5] text-brand" aria-hidden="true">“</p>
                    <blockquote className="mt-4 text-[26px] font-medium leading-tight tracking-tight">{quote.text}</blockquote>
                    <figcaption className="mt-6 border-l border-[#BDBDB8] pl-3.5">
                      <p className="font-semibold">{quote.name}</p>
                      <p className="text-sm text-muted">{quote.role}, {c.name}</p>
                    </figcaption>
                  </figure>
                )}
              </div>
              <aside className="h-fit rounded-[28px] bg-ink p-7 text-white lg:sticky lg:top-24">
                <h2 className="text-lg font-semibold">Delivered</h2>
                <ul className="mt-5 space-y-3.5">
                  {c.delivered.map((d) => (
                    <li key={d} className="flex gap-3 text-[15px] leading-snug text-[#E8E2DC]">
                      <Check className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-brand-glow" aria-hidden="true" strokeWidth={2.6} />
                      {d}
                    </li>
                  ))}
                </ul>
                <Link href="/contact" className="btn-brand mt-7 w-full">Build something similar</Link>
              </aside>
            </div>
          </div>
        </article>

        <section className="px-5 pb-28 sm:px-6">
          <div className="mx-auto max-w-site">
            <h2 className="mb-8 text-3xl font-medium tracking-tightish">More customer stories</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {others.map((o) => (
                <Link key={o.slug} href={`/customers/${o.slug}`} className="rounded-[28px] bg-surface p-7 transition hover:-translate-y-1">
                  <p className="text-sm font-semibold text-muted">{o.name}</p>
                  <p className="mt-2 text-xl font-medium leading-snug tracking-tight">{o.headline}</p>
                  <span className="mt-4 inline-block text-[15px] font-medium text-brand-ink">Read the story →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <FinalCta title="Want software like this?" accent="Let’s talk." />
      </main>
      <Footer />
    </>
  )
}
