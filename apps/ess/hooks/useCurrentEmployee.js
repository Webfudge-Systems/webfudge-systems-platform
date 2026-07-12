'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@webfudge/auth'
import { resolveCurrentEmployee } from '../lib/currentEmployee'

const EmployeeContext = createContext(null)

export function EmployeeProvider({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [employee, setEmployee] = useState(null)
  const [membershipId, setMembershipId] = useState(null)
  const [notOnboarded, setNotOnboarded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setEmployee(null)
      setMembershipId(null)
      setNotOnboarded(false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const result = await resolveCurrentEmployee(user)
      setEmployee(result.employee)
      setMembershipId(result.membershipId)
      setNotOnboarded(result.notOnboarded)
    } catch (err) {
      setError(err?.message || 'Could not load employee profile')
      setEmployee(null)
      setMembershipId(null)
      setNotOnboarded(true)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (authLoading) return
    refresh()
  }, [authLoading, refresh])

  const value = useMemo(
    () => ({
      employee,
      membershipId,
      notOnboarded,
      loading: authLoading || loading,
      error,
      refresh,
    }),
    [employee, membershipId, notOnboarded, authLoading, loading, error, refresh],
  )

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>
}

export function useCurrentEmployee() {
  const ctx = useContext(EmployeeContext)
  if (!ctx) {
    throw new Error('useCurrentEmployee must be used within EmployeeProvider')
  }
  return ctx
}
