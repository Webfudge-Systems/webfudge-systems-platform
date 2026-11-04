import Link from 'next/link'
import SimplePage from '../../components/site/SimplePage'
import { Faq, PricingCards } from '../../components/home/Interactive'
import { FinalCta } from '../../components/home/Sections'
import { faqs } from '../../data/site'
import { getPlans } from '../../lib/pricing'

export const metadata = {
  title: 'Pricing',
  description: 'Per-app, per-user pricing for Webfudge CRM and Projects. Free plan for up to 3 users, paid plans from ₹499 per user per month, 15% off yearly.',
  alternates: { canonical: '/pricing' },
}

const COMPARE = [
  ['Users', 'Up to 3', 'Pay per user', 'Pay per user', 'Pay per user'],
  ['Records', 'Core limits', 'Unlimited', 'Unlimited', 'Unlimited'],
  ['Roles and permissions', '—', '✓', '✓', '✓'],
  ['Automations', '—', '—', '✓', '✓'],
  ['Reports and dashboards', 'Basic', 'Basic', '✓', '✓'],
  ['Links between your apps', '—', '—', '✓', '✓'],
  ['Audit logs and security controls', '—', '—', '—', '✓'],
  ['Support', 'Email', 'Email and chat', 'Email and chat', 'Priority'],
  ['Onboarding help', '—', '—', '—', '✓'],
]

export default async function PricingPage() {
  const plans = await getPlans()
  return (
    <SimplePage eyebrow="Pricing" title="Pay for the apps you use," accent="per user." intro="Every app has its own plan, so you only pay for what your team needs. Try any app free for 14 days — no card needed." center>
      <section className="px-5 pb-20 sm:px-6">
        <div className="mx-auto max-w-site space-y-20">
          {[
            ['crm', 'CRM', '/apps/crm.svg', '/crm', plans.crm],
            ['pm', 'Projects', '/apps/projects.svg', '/projects', plans.pm],
          ].map(([slug, name, icon, href, list]) => (
            <div key={slug} id={slug}>
              <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon} alt="" className="icon3d h-12 w-12" />
                <h2 className="text-3xl font-medium tracking-tightish">Webfudge {name}</h2>
                <Link href={href} className="text-sm font-semibold text-brand-ink hover:underline">What’s inside →</Link>
              </div>
              <PricingCards plans={list} compact />
            </div>
          ))}

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['books', 'Books', '/apps/books.svg', 'Invoices, payments and GST-ready accounts.'],
              ['hr', 'HR', '/apps/hr.svg', 'People, leave and attendance in one place.'],
            ].map(([slug, name, icon, text]) => (
              <article key={slug} id={slug} className="flex items-center gap-5 rounded-[28px] border border-line p-7">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon} alt="" className="icon3d h-14 w-14" />
                <div>
                  <h3 className="text-xl font-semibold">
                    Webfudge {name} <span className="ml-1 rounded-full bg-surface px-2 py-1 align-middle text-xs font-semibold text-muted">Coming soon</span>
                  </h3>
                  <p className="mt-1.5 text-[15px] text-muted">{text} <Link href="/contact" className="font-semibold text-brand-ink hover:underline">Get notified</Link></p>
                </div>
              </article>
            ))}
          </div>

          <div>
            <h2 className="h-section mb-8 text-center">Compare plans</h2>
            <div className="overflow-x-auto rounded-3xl border border-line">
              <table className="w-full min-w-[720px] text-left text-[15px]">
                <thead className="bg-surface">
                  <tr>
                    <th scope="col" className="px-5 py-4 font-semibold">Feature</th>
                    {['Free', 'Standard', 'Professional', 'Enterprise'].map((p) => (
                      <th key={p} scope="col" className="px-5 py-4 font-semibold">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map(([label, ...cells]) => (
                    <tr key={label} className="border-t border-line">
                      <th scope="row" className="px-5 py-4 font-medium">{label}</th>
                      {cells.map((c, i) => (
                        <td key={i} className={`px-5 py-4 ${c === '✓' ? 'font-semibold text-brand' : c === '—' ? 'text-[#BDBDBD]' : 'text-muted'}`}>
                          {c === '✓' ? <span aria-label="Included">✓</span> : c === '—' ? <span aria-label="Not included">—</span> : c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-center text-sm text-muted">Prices exclude 18% GST. You get a tax invoice with every payment.</p>
          </div>

          <div className="mx-auto max-w-[880px]">
            <h2 className="h-section mb-10 text-center">Billing questions</h2>
            <Faq items={faqs.slice(0, 5)} />
          </div>
        </div>
      </section>
      <FinalCta />
    </SimplePage>
  )
}
