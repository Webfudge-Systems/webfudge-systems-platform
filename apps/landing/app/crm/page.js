import Link from 'next/link'

export const metadata = {
  title: 'CRM — Webfudge Platform',
  description: 'CRM product page',
}

export default function CRMPage() {
  return (
    <main className="min-h-screen bg-brand-light px-6 pt-28 pb-16">
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-sm font-semibold text-gray-600">Product</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-bold text-brand-dark">CRM</h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-700">
          A focused CRM page so the Navbar dropdown link opens correctly.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Start Your Trial
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}

