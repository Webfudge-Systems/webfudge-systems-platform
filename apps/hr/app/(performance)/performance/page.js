'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PerformancePageShell from '../../../components/performance/PerformancePageShell'
import PerformanceGoalsContent from '../../../components/performance/PerformanceGoalsContent'
import { GOALS_UPDATED_EVENT, listGoals } from '../../../lib/performanceGoalsService'
import { computePerformanceStats } from '../../../lib/performancePage'
import { getPerformancePageMeta } from '../../../lib/performanceNavigation'

export default function PerformanceGoalsPage() {
  const [okrs, setOkrs] = useState([])

  const loadGoals = useCallback(() => {
    setOkrs(listGoals())
  }, [])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  useEffect(() => {
    const onUpdated = () => loadGoals()
    window.addEventListener(GOALS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(GOALS_UPDATED_EVENT, onUpdated)
  }, [loadGoals])

  const stats = useMemo(() => computePerformanceStats(undefined, undefined, undefined, okrs), [okrs])
  const pageMeta = getPerformancePageMeta('goals')

  return (
    <PerformancePageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      stats={stats}
      showKpis={pageMeta.showKpis}
    >
      <PerformanceGoalsContent />
    </PerformancePageShell>
  )
}
