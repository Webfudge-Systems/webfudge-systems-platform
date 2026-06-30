'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PerformancePageShell from '../../../../components/performance/PerformancePageShell'
import PerformanceReviewsContent from '../../../../components/performance/PerformanceReviewsContent'
import { computeReviewStats } from '../../../../lib/performancePage'
import { getPerformancePageMeta } from '../../../../lib/performanceNavigation'
import {
  listReviewCycles,
  REVIEWS_UPDATED_EVENT,
} from '../../../../lib/performanceReviewsService'

export default function PerformanceReviewsPage() {
  const [cycles, setCycles] = useState([])

  const loadCycles = useCallback(() => {
    setCycles(listReviewCycles())
  }, [])

  useEffect(() => {
    loadCycles()
  }, [loadCycles])

  useEffect(() => {
    const onUpdated = () => loadCycles()
    window.addEventListener(REVIEWS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, onUpdated)
  }, [loadCycles])

  const reviewStats = useMemo(() => computeReviewStats(cycles), [cycles])
  const pageMeta = getPerformancePageMeta('reviews')

  return (
    <PerformancePageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      reviewStats={reviewStats}
      showKpis={pageMeta.showKpis}
    >
      <PerformanceReviewsContent />
    </PerformancePageShell>
  )
}
