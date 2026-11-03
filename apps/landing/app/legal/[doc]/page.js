import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '../../../components/site/Header'
import Footer from '../../../components/site/Footer'
import { LEGAL } from '../../../data/legal'

export function generateStaticParams() {
  return Object.keys(LEGAL).map((doc) => ({ doc }))
}

export function generateMetadata({ params }) {
  const page = LEGAL[params.doc]
  if (!page) return {}
  return { title: page.title, description: page.intro, alternates: { canonical: `/legal/${params.doc}` } }
}

export default function LegalPage({ params }) {
  const page = LEGAL[params.doc]
  if (!page) notFound()
  return (
    <>
      <Header />
      <main id="main" className="px-5 pb-28 pt-16 sm:px-6 sm:pt-20">
        <div className="mx-auto grid max-w-site gap-12 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Legal" className="lg:sticky lg:top-24 lg:h-fit">
            <ul className="flex flex-wrap gap-2 lg:flex-col">
              {Object.entries(LEGAL).map(([key, p]) => (
                <li key={key}>
                  <Link href={`/legal/${key}`} aria-current={key === params.doc ? 'page' : undefined} className={`block rounded-full px-4 py-2.5 text-sm font-medium ${key === params.doc ? 'bg-ink text-white' : 'bg-surface hover:bg-[#EAEAE6]'}`}>
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <article className="max-w-3xl">
            <h1 className="text-[clamp(38px,5vw,64px)] font-medium leading-[1.02] tracking-display">{page.title}</h1>
            <p className="mt-3 text-sm text-muted">Last updated {page.updated}</p>
            <p className="mt-8 text-[19px] leading-relaxed">{page.intro}</p>
            {page.sections.map(([heading, paras]) => (
              <section key={heading} className="mt-10">
                <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
                {paras.length > 1 ? (
                  <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[17px] leading-relaxed text-[#3A3A3A]">
                    {paras.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                ) : (
                  <p className="mt-4 text-[17px] leading-relaxed text-[#3A3A3A]">{paras[0]}</p>
                )}
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
