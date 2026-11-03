import Link from 'next/link'
import Header from '../components/site/Header'
import Footer from '../components/site/Footer'

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="px-5 py-32 text-center sm:px-6">
        <p className="eyebrow mb-6">404</p>
        <h1 className="h-display mx-auto max-w-3xl">
          This page <span className="accent text-brand">wandered off.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[19px] text-muted">The link may be old or mistyped. Try the homepage, or tell us what you were looking for.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-dark">Go to the homepage</Link>
          <Link href="/contact" className="btn-light">Contact us</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
