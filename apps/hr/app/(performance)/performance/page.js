'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PerformancePageShell from '../../../components/performance/PerformancePageShell'
import PerformanceGoalsContent from '../../../components/performance/PerformanceGoalsContent'
import { GOALS_UPDATED_EVENT, listGoals } from '../../../lib/performanceGoalsService'
import { REVIEWS_UPDATED_EVENT, listReviewCycles } from '../../../lib/performanceReviewsService'
import { APPRAISALS_UPDATED_EVENT, listAppraisals } from '../../../lib/performanceAppraisalsService'
import { PIPS_UPDATED_EVENT, listPips } from '../../../lib/performancePipsService'
import { FEEDBACK_UPDATED_EVENT, listPendingFeedback } from '../../../lib/performanceFeedbackService'
import { computePerformanceStats } from '../../../lib/performancePage'
import { getPerformancePageMeta } from '../../../lib/performanceNavigation'

export default function PerformanceGoalsPage() {
  const [okrs, setOkrs] = useState([])
  const [cycles, setCycles] = useState([])
  const [appraisals, setAppraisals] = useState([])
  const [pips, setPips] = useState([])
  const [pendingFeedback, setPendingFeedback] = useState([])

  const loadAll = useCallback(() => {
    setOkrs(listGoals())
    setCycles(listReviewCycles())
    setAppraisals(listAppraisals())
    setPips(listPips())
    setPendingFeedback(listPendingFeedback())
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    const onUpdated = () => loadAll()
    window.addEventListener(GOALS_UPDATED_EVENT, onUpdated)
    window.addEventListener(REVIEWS_UPDATED_EVENT, onUpdated)
    window.addEventListener(APPRAISALS_UPDATED_EVENT, onUpdated)
    window.addEventListener(PIPS_UPDATED_EVENT, onUpdated)
    window.addEventListener(FEEDBACK_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener(GOALS_UPDATED_EVENT, onUpdated)
      window.removeEventListener(REVIEWS_UPDATED_EVENT, onUpdated)
      window.removeEventListener(APPRAISALS_UPDATED_EVENT, onUpdated)
      window.removeEventListener(PIPS_UPDATED_EVENT, onUpdated)
      window.removeEventListener(FEEDBACK_UPDATED_EVENT, onUpdated)
    }
  }, [loadAll])

  const stats = useMemo(
    () => computePerformanceStats(cycles, appraisals, pips, okrs, pendingFeedback),
    [cycles, appraisals, pips, okrs, pendingFeedback],
  )
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
