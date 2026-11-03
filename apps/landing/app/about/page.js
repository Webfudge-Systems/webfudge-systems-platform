import Link from 'next/link'
import SimplePage from '../../components/site/SimplePage'
import { FinalCta } from '../../components/home/Sections'
import { kpis } from '../../data/site'

export const metadata = {
  title: 'About us',
  description: 'Webfudge Systems builds business software in Pune, India — Webfudge CRM and Projects, and custom ERPs, portals and extensions for growing companies.',
  alternates: { canonical: '/about' },
}

const VALUES = [
  ['Built around real work', 'We start from how your team actually works, not from a template, and shape the software to fit.'],
  ['Simple to start, room to grow', 'Begin with one app and a small team. Add apps, people and custom pieces as you grow.'],
  ['Your data stays yours', 'We don’t sell or share your data. You can export it, and we keep it safe while you use Webfudge.'],
  ['People you can talk to', 'You work with the team that builds the software — in Pune, on the phone or on a call.'],
]

export default function AboutPage() {
  return (
    <SimplePage eyebrow="About Webfudge Systems" title="We build the software" accent="growing businesses run on." intro="Webfudge Systems is a product and engineering team in Pune, India. We make Webfudge CRM and Projects, and we build custom software for companies whose work doesn’t fit a template.">
      <section className="px-5 pb-20 sm:px-6">
        <dl className="mx-auto grid max-w-site grid-cols-2 gap-y-8 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col border-l border-[#E2E2DE] px-5 sm:px-7">
              <dt className="order-2 mt-3 text-[15px] text-muted">{k.label}</dt>
              <dd className="text-[clamp(44px,5vw,72px)] font-medium leading-none tracking-[-0.05em]">{k.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="bg-surface px-5 py-28 sm:px-6">
        <div className="mx-auto max-w-site">
          <h2 className="h-section mb-12 max-w-3xl">
            What we <span className="accent text-brand">care about</span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {VALUES.map(([title, text]) => (
              <article key={title} className="rounded-[28px] bg-white p-8">
                <h3 className="text-2xl font-medium tracking-tight">{title}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 py-28 sm:px-6">
        <div className="mx-auto flex max-w-site flex-wrap items-end justify-between gap-6">
          <p className="max-w-3xl text-[clamp(26px,3vw,40px)] font-medium leading-snug tracking-tight">
            Our apps grew out of the custom systems we built for clients — the same CRM and project tools now run teams across{' '}
            <span className="text-[#8C8C8C]">electric mobility and business services.</span>
          </p>
          <Link href="/customers" className="btn-dark">Meet our customers</Link>
        </div>
      </section>
      <FinalCta />
    </SimplePage>
  )
}
