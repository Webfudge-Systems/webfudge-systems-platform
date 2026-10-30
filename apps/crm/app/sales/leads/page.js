'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@webfudge/ui'

/**
 * Legacy /sales/leads route — leads live under Lead Companies.
 */
export default function LeadsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/sales/lead-companies')
  }, [router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <LoadingSpinner size="lg" message="Redirecting to Lead Companies…" />
    </div>
  )
}
