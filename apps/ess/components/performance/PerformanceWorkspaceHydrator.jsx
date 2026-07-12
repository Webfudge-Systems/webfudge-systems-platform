'use client'

import { useEffect } from 'react'
import { useAuth } from '@webfudge/auth'
import { hydratePerformanceWorkspaceOnce } from '@webfudge/utils/hrPerformance'

export default function PerformanceWorkspaceHydrator() {
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (loading || !isAuthenticated) return
    hydratePerformanceWorkspaceOnce().catch(() => {})
  }, [isAuthenticated, loading])

  useEffect(() => {
    if (!isAuthenticated) return undefined

    const onFocus = () => {
      hydratePerformanceWorkspaceOnce({ pushLocalIfRemoteEmpty: false }).catch(() => {})
    }

    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [isAuthenticated])

  return null
}
