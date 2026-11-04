import Header from './Header'
import Footer from './Footer'

/** Page shell with the standard header, an intro block and the footer. */
export default function SimplePage({ eyebrow, title, accent, intro, children, center = false }) {
  return (
    <>
      <Header />
      <main id="main">
        <section className="px-5 pb-12 pt-20 sm:px-6 sm:pt-24">
          <div className={`mx-auto max-w-site ${center ? 'text-center' : ''}`}>
            {eyebrow && <p className="eyebrow mb-6">{eyebrow}</p>}
            <h1 className={`h-display max-w-4xl ${center ? 'mx-auto' : ''}`}>
              {title} {accent && <span className="accent text-brand">{accent}</span>}
            </h1>
            {intro && <p className={`mt-6 max-w-2xl text-[19px] leading-relaxed text-muted ${center ? 'mx-auto' : ''}`}>{intro}</p>}
          </div>
        </section>
        {children}
      </main>
      <Footer />
    </>
  )
}
