import Link from 'next/link'
import SimplePage from '../../components/site/SimplePage'
import CustomerMock from '../../components/mocks/CustomerMock'
import { FinalCta } from '../../components/home/Sections'
import { customers } from '../../data/customers'

export const metadata = {
  title: 'Customers',
  description: 'How EVI, Xtrawrkx, PositiEV and BikeWo run on software built by Webfudge Systems — ERPs, CRM, project management, client portals and more.',
  alternates: { canonical: '/customers' },
}

export default function CustomersPage() {
  return (
    <SimplePage eyebrow="Customers" title="Built with the teams" accent="who use it every day." intro="From electric mobility to business services — here’s what we built and how these teams run on it.">
      <section className="px-5 pb-28 sm:px-6">
        <div className="mx-auto grid max-w-site gap-x-5 gap-y-14 md:grid-cols-2">
          {customers.map((c) => (
            <article key={c.slug} className="group">
              <Link href={`/customers/${c.slug}`} className="block">
                <CustomerMock customer={c} />
                <div className="mt-5">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{c.name}</span>
                    {c.built.map((b) => (
                      <span key={b} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">{b}</span>
                    ))}
                    {c.status === 'deploying' && <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-[#8F3907]">Rolling out</span>}
                  </div>
                  <h2 className="text-2xl font-medium leading-snug tracking-tight">{c.headline}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.summary}</p>
                  <span className="mt-3 inline-block font-medium text-brand-ink group-hover:underline">Read the story →</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
      <FinalCta title="Want software like this?" accent="Let’s talk." />
    </SimplePage>
  )
}
