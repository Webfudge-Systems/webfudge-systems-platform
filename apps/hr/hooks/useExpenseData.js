'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { computeExpenseStats } from '../lib/expensesPage'
import { notifyHrExpensesUpdated } from '../lib/expensesShared'
import {
  approveExpenseClaim,
  buildPayoutRowsFromClaims,
  createExpenseClaim,
  deleteExpenseClaim,
  listExpenseClaims,
  rejectExpenseClaim,
  reimburseExpenseClaim,
  updateExpenseClaim,
} from '../lib/expenseSyncService'

const ExpenseDataContext = createContext(null)

export function ExpenseDataProvider({ children }) {
  const [claims, setClaims] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const rows = await listExpenseClaims()
      setClaims(rows)
      setPayouts(buildPayoutRowsFromClaims(rows))
    } catch (err) {
      setClaims([])
      setPayouts([])
      setError(err?.message || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshAfterMutation = useCallback(async () => {
    await loadData()
    notifyHrExpensesUpdated()
  }, [loadData])

  useEffect(() => {
    loadData()
    const onUpdated = () => loadData()
    if (typeof window !== 'undefined') {
      window.addEventListener('hr-expenses-updated', onUpdated)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('hr-expenses-updated', onUpdated)
      }
    }
  }, [loadData])

  const addClaim = useCallback(
    async (payload, { submittedById } = {}) => {
      const created = await createExpenseClaim(payload, { submittedById })
      await refreshAfterMutation()
      return created
    },
    [refreshAfterMutation],
  )

  const updateClaim = useCallback(
    async (id, payload, { submittedById } = {}) => {
      const updated = await updateExpenseClaim(id, payload, { submittedById })
      await refreshAfterMutation()
      return updated
    },
    [refreshAfterMutation],
  )

  const deleteClaim = useCallback(
    async (id) => {
      await deleteExpenseClaim(id)
      await refreshAfterMutation()
    },
    [refreshAfterMutation],
  )

  const approveClaim = useCallback(
    async (id) => {
      const updated = await approveExpenseClaim(id)
      await refreshAfterMutation()
      return updated
    },
    [refreshAfterMutation],
  )

  const rejectClaim = useCallback(
    async (id, reason = '') => {
      const updated = await rejectExpenseClaim(id, reason)
      await refreshAfterMutation()
      return updated
    },
    [refreshAfterMutation],
  )

  const reimburseClaim = useCallback(
    async (id, payload = {}) => {
      const updated = await reimburseExpenseClaim(id, payload)
      await refreshAfterMutation()
      return updated
    },
    [refreshAfterMutation],
  )

  const stats = useMemo(() => computeExpenseStats(claims), [claims])
  const pendingClaims = useMemo(() => claims.filter((claim) => claim.status === 'Pending'), [claims])

  const value = useMemo(
    () => ({
      claims,
      pendingClaims,
      payouts,
      stats,
      loading,
      error,
      reload: loadData,
      addClaim,
      updateClaim,
      deleteClaim,
      approveClaim,
      rejectClaim,
      reimburseClaim,
      addPayout: reimburseClaim,
      updatePayout: reimburseClaim,
      deletePayout: async () => {
        throw new Error('Delete payout by updating the related expense claim instead.')
      },
    }),
    [
      claims,
      pendingClaims,
      payouts,
      stats,
      loading,
      error,
      loadData,
      addClaim,
      updateClaim,
      deleteClaim,
      approveClaim,
      rejectClaim,
      reimburseClaim,
    ],
  )

  return <ExpenseDataContext.Provider value={value}>{children}</ExpenseDataContext.Provider>
}

export default function useExpenseData() {
  const ctx = useContext(ExpenseDataContext)
  if (!ctx) {
    throw new Error('useExpenseData must be used within ExpenseDataProvider')
  }
  return ctx
}
