'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  computePayrollStats,
  filterPayrollEmployees,
  filterPayslips,
  filterSalaryStructures,
  filterComplianceItems,
} from '../lib/payrollPage'
import {
  createPayrollRun,
  getPayrollRunById,
  listPayrollRuns,
  listPayslips,
  listSalaryStructures,
  recalculatePayrollRun,
  transitionPayrollRun,
} from '../lib/payrollSyncService'
import { lineItemToRow } from '../lib/payrollShared'

export default function usePayrollRunData() {
  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState('')
  const [structures, setStructures] = useState([])
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [lockBlockers, setLockBlockers] = useState([])
  const [runCreateOpen, setRunCreateOpen] = useState(false)
  const [newRunMonth, setNewRunMonth] = useState(String(new Date().getMonth() + 1))
  const [newRunYear, setNewRunYear] = useState(String(new Date().getFullYear()))

  const loadData = useCallback(async (forcedRunId = null) => {
    try {
      setLoading(true)
      setError('')
      const [runsData, structuresData] = await Promise.all([listPayrollRuns(), listSalaryStructures()])
      setRuns(runsData)
      setStructures(structuresData)
      const targetRunId = forcedRunId || selectedRunId || String(runsData[0]?.id || '')
      if (targetRunId) {
        const run = await getPayrollRunById(targetRunId)
        setSelectedRunId(String(run.id))
        setRuns((prev) => prev.map((row) => (String(row.id) === String(run.id) ? run : row)))
        setPayslips(await listPayslips({ payrollRunId: run.id }))
      } else {
        setSelectedRunId('')
        setPayslips([])
      }
    } catch (err) {
      setError(err?.message || 'Failed to load payroll')
    } finally {
      setLoading(false)
    }
  }, [selectedRunId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedRun = useMemo(
    () => runs.find((run) => String(run.id) === String(selectedRunId)) || null,
    [runs, selectedRunId],
  )

  const lineItems = useMemo(
    () => (selectedRun?.lineItems || []).map((line) => lineItemToRow(line, selectedRun)),
    [selectedRun],
  )

  const stats = useMemo(() => computePayrollStats(selectedRun || {}, selectedRun || {}), [selectedRun])
  const readOnlyRun = ['locked', 'disbursed'].includes(String(selectedRun?.status || '').toLowerCase())

  const transition = async (action) => {
    if (!selectedRun) return
    try {
      setActionError('')
      setLockBlockers([])
      await transitionPayrollRun(selectedRun.id, action)
      await loadData(selectedRun.id)
    } catch (err) {
      if (action === 'lock') setLockBlockers(err?.details?.blockers || [])
      setActionError(err?.message || 'Action failed')
    }
  }

  const handleRunChange = async (value) => {
    setSelectedRunId(value)
    await loadData(value)
  }

  const handleRecalculate = async () => {
    if (!selectedRun) return
    try {
      setActionError('')
      await recalculatePayrollRun(selectedRun.id)
      await loadData(selectedRun.id)
    } catch (err) {
      setActionError(err?.message || 'Recalculate failed')
    }
  }

  const handleCreateRun = async () => {
    const run = await createPayrollRun({ month: Number(newRunMonth), year: Number(newRunYear) })
    setRunCreateOpen(false)
    await loadData(run?.id)
  }

  const filterRows = ({ searchQuery = '', statusFilter = '' } = {}) => ({
    employeeRows: filterPayrollEmployees(lineItems, { search: searchQuery, status: statusFilter }),
    structureRows: filterSalaryStructures(structures, searchQuery),
    payslipRows: filterPayslips(payslips, searchQuery),
    complianceRows: filterComplianceItems([], searchQuery),
  })

  return {
    runs,
    selectedRunId,
    selectedRun,
    structures,
    payslips,
    lineItems,
    stats,
    loading,
    error,
    actionError,
    lockBlockers,
    readOnlyRun,
    runCreateOpen,
    setRunCreateOpen,
    newRunMonth,
    setNewRunMonth,
    newRunYear,
    setNewRunYear,
    loadData,
    transition,
    handleRunChange,
    handleRecalculate,
    handleCreateRun,
    filterRows,
  }
}
