import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import SimplePage from '../../components/site/SimplePage'
import { FinalCta } from '../../components/home/Sections'
import { services } from '../../data/site'

export const metadata = {
  title: 'Custom software',
  description: 'Webfudge Systems designs and builds custom ERPs, client portals, browser extensions, fleet management and web apps that connect to Webfudge CRM and Projects.',
  alternates: { canonical: '/services' },
}

const PROCESS = [
  ['Discover', 'We sit with the people who will use the software and map how work really moves today.'],
  ['Design', 'Clickable screens you can try before a line of code is written, so nothing surprises you later.'],
  ['Build', 'Short cycles with a working version to review every week or two.'],
  ['Launch and support', 'We move your data in, train your team and stay on to keep it running.'],
]

export default function ServicesPage() {
  return (
    <SimplePage eyebrow="Custom software" title="Software shaped around" accent="how you work." intro="When an off-the-shelf app isn’t enough, we design and build it for you — and connect it to your Webfudge apps so everything shares the same data.">
      <section className="bg-night px-5 py-24 text-white sm:px-6">
        <div className="mx-auto max-w-site">
          <ul>
            {services.map((s) => (
              <li key={s.name}>
                <Link href="/contact" className="group flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border-b border-[#262626] px-5 py-7 transition-colors hover:bg-brand hover:text-ink">
                  <span className="flex-[1_1_380px] text-[clamp(32px,4.6vw,64px)] font-medium leading-none tracking-[-0.04em]">{s.name}</span>
                  <span className="flex-[1_1_260px] text-[15px] text-[#A3A3A3] group-hover:text-ink">{s.example}</span>
                  <ArrowUpRight className="h-7 w-7" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="px-5 py-28 sm:px-6">
        <div className="mx-auto max-w-site">
          <h2 className="h-section mb-12 max-w-3xl">
            How we <span className="accent text-brand">work with you</span>
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map(([title, text], i) => (
              <li key={title} className="flex min-h-[220px] flex-col rounded-3xl bg-surface p-7">
                <p className="text-sm font-semibold text-brand-ink">0{i + 1}</p>
                <h3 className="mb-2 mt-auto text-[22px] font-semibold tracking-tight">{title}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap items-center gap-4 rounded-3xl border border-line p-7">
            <p className="flex-1 text-xl font-medium tracking-tight">See what we built for EVI, Xtrawrkx, PositiEV and BikeWo.</p>
            <Link href="/customers" className="btn-dark">Customer stories</Link>
          </div>
        </div>
      </section>
      <FinalCta title="Have a project in mind?" accent="Let’s talk." />
    </SimplePage>
  )
}
