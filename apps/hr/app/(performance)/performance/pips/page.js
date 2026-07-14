'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PerformancePageShell from '../../../../components/performance/PerformancePageShell'
import PerformancePipsContent from '../../../../components/performance/PerformancePipsContent'
import { computePipStats } from '../../../../lib/performancePage'
import { getPerformancePageMeta } from '../../../../lib/performanceNavigation'
import { listPips, PIPS_UPDATED_EVENT } from '../../../../lib/performancePipsService'

export default function PerformancePipsPage() {
  const [pips, setPips] = useState([])

  const loadPips = useCallback(() => {
    setPips(listPips())
  }, [])

  useEffect(() => {
    loadPips()
  }, [loadPips])

  useEffect(() => {
    const onUpdated = () => loadPips()
    window.addEventListener(PIPS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(PIPS_UPDATED_EVENT, onUpdated)
  }, [loadPips])

  const pipStats = useMemo(() => computePipStats(pips), [pips])
  const pageMeta = getPerformancePageMeta('pips')

  return (
    <PerformancePageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      pipStats={pipStats}
      showKpis={pageMeta.showKpis}
    >
      <PerformancePipsContent />
    </PerformancePageShell>
  )
}
