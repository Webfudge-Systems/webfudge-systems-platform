'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PerformancePageShell from '../../../../components/performance/PerformancePageShell'
import PerformanceFeedbackContent from '../../../../components/performance/PerformanceFeedbackContent'
import { computeFeedbackStats } from '../../../../lib/performancePage'
import { getPerformancePageMeta } from '../../../../lib/performanceNavigation'
import {
  FEEDBACK_UPDATED_EVENT,
  listPendingFeedback,
  listReceivedFeedback,
} from '../../../../lib/performanceFeedbackService'

export default function PerformanceFeedbackPage() {
  const [pendingRows, setPendingRows] = useState([])
  const [receivedRows, setReceivedRows] = useState([])

  const loadFeedback = useCallback(() => {
    setPendingRows(listPendingFeedback())
    setReceivedRows(listReceivedFeedback())
  }, [])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  useEffect(() => {
    const onUpdated = () => loadFeedback()
    window.addEventListener(FEEDBACK_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(FEEDBACK_UPDATED_EVENT, onUpdated)
  }, [loadFeedback])

  const feedbackStats = useMemo(
    () => computeFeedbackStats(pendingRows, receivedRows),
    [pendingRows, receivedRows],
  )
  const pageMeta = getPerformancePageMeta('feedback')

  return (
    <PerformancePageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      feedbackStats={feedbackStats}
      showKpis={pageMeta.showKpis}
    >
      <PerformanceFeedbackContent />
    </PerformancePageShell>
  )
}
