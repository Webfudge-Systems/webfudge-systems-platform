'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PerformancePageShell from '../../../../components/performance/PerformancePageShell'
import PerformanceAppraisalsContent from '../../../../components/performance/PerformanceAppraisalsContent'
import { computeAppraisalStats } from '../../../../lib/performancePage'
import { getPerformancePageMeta } from '../../../../lib/performanceNavigation'
import {
  APPRAISALS_UPDATED_EVENT,
  listAppraisals,
} from '../../../../lib/performanceAppraisalsService'

export default function PerformanceAppraisalsPage() {
  const [appraisals, setAppraisals] = useState([])

  const loadAppraisals = useCallback(() => {
    setAppraisals(listAppraisals())
  }, [])

  useEffect(() => {
    loadAppraisals()
  }, [loadAppraisals])

  useEffect(() => {
    const onUpdated = () => loadAppraisals()
    window.addEventListener(APPRAISALS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(APPRAISALS_UPDATED_EVENT, onUpdated)
  }, [loadAppraisals])

  const appraisalStats = useMemo(() => computeAppraisalStats(appraisals), [appraisals])
  const pageMeta = getPerformancePageMeta('appraisals')

  return (
    <PerformancePageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      appraisalStats={appraisalStats}
      showKpis={pageMeta.showKpis}
    >
      <PerformanceAppraisalsContent />
    </PerformancePageShell>
  )
}
