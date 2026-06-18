'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'

function ComingSoonContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const feature = searchParams.get('feature') || 'This feature'
  const featureName = feature.charAt(0).toUpperCase() + feature.slice(1).replace(/-/g, ' ')

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light">
      <div className="mx-auto max-w-md px-6 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/10">
          <Clock className="h-10 w-10 text-brand-primary" />
        </div>
        <h1 className="mb-3 text-3xl font-bold text-brand-foreground">Coming Soon</h1>
        <p className="mb-2 text-brand-text-light">
          <span className="font-semibold text-brand-foreground">{featureName}</span> is currently under
          development.
        </p>
        <p className="mb-8 text-brand-text-light">
          We&apos;re working hard to bring you this feature soon. Stay tuned!
        </p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-6 py-3 font-medium text-white transition-colors hover:bg-brand-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}

export default function ComingSoonPage() {
  return (
    <Suspense>
      <ComingSoonContent />
    </Suspense>
  )
}
