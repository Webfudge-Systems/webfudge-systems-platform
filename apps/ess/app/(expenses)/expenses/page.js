'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Receipt, Clock, CheckCircle, Wallet } from 'lucide-react'
import {
  Badge,
  Button,
  Table,
  TableEmptyBelow,
  TableResultsCount,
} from '@webfudge/ui'
import EmployeeGate from '../../../components/shared/EmployeeGate'
import ESSModulePage from '../../../components/layout/ESSModulePage'
import ESSPageHeader from '../../../components/layout/ESSPageHeader'
import ESSModuleTabBar from '../../../components/layout/ESSModuleTabBar'
import ESSDataTableCard from '../../../components/shared/ESSDataTableCard'
import ESSDashboardKpiRow from '../../../components/dashboard/ESSDashboardKpiRow'
import ESSSubmitExpenseModal, {
  ESSEditExpenseModal,
  ESSExpenseDetailModal,
} from '../../../components/expenses/ESSExpenseModals'
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee'
import { listMyExpenseClaims } from '../../../lib/expenseSyncService'
import {
  EXPENSE_UPDATED_EVENT,
  filterClaimsByTab,
  formatExpenseAmount,
  getExpenseCategoryLabel,
} from '../../../lib/expenseShared'

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'paid', label: 'Paid' },
]

function expenseStatusBadgeVariant(status = '') {
  const raw = String(status || '').toLowerCase()
  if (raw === 'approved') return 'success'
  if (raw === 'rejected') return 'danger'
  if (raw === 'paid') return 'info'
  return 'warning'
}

export default function ExpensesPage() {
  const { employee } = useCurrentEmployee()
  const [claims, setClaims] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [editClaim, setEditClaim] = useState(null)
  const [detailClaim, setDetailClaim] = useState(null)

  const loadData = useCallback(async () => {
    if (!employee?.userId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const rows = await listMyExpenseClaims({ limit: 200 })
      setClaims(rows)
    } finally {
      setLoading(false)
    }
  }, [employee?.userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const refresh = () => loadData()
    window.addEventListener(EXPENSE_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(EXPENSE_UPDATED_EVENT, refresh)
  }, [loadData])

  const stats = useMemo(() => {
    const year = new Date().getFullYear()
    const yearClaims = claims.filter((row) => {
      const d = row.submitted ? new Date(row.submitted).getFullYear() : year
      return d === year
    })
    return {
      total: yearClaims.length,
      pending: yearClaims.filter((r) => r.status === 'Pending').length,
      approved: yearClaims.filter((r) => r.status === 'Approved').length,
      paid: yearClaims.filter((r) => r.status === 'Paid').length,
    }
  }, [claims])

  const kpiStats = useMemo(
    () => [
      {
        title: 'Claims this year',
        value: String(stats.total),
        subtitle: 'submitted by you',
        icon: Receipt,
        colorScheme: 'orange',
      },
      {
        title: 'Pending',
        value: String(stats.pending),
        subtitle: 'awaiting HR review',
        icon: Clock,
        colorScheme: 'orange',
        onClick: () => setFilter('pending'),
      },
      {
        title: 'Approved',
        value: String(stats.approved),
        subtitle: 'ready for payout',
        icon: CheckCircle,
        colorScheme: 'orange',
        onClick: () => setFilter('approved'),
      },
      {
        title: 'Paid',
        value: String(stats.paid),
        subtitle: 'reimbursed',
        icon: Wallet,
        colorScheme: 'orange',
        onClick: () => setFilter('paid'),
      },
    ],
    [stats],
  )

  const filteredClaims = useMemo(
    () => filterClaimsByTab(claims, filter),
    [claims, filter],
  )

  const claimColumns = [
    { key: 'expenseNumber', label: 'Claim #' },
    { key: 'categoryLabel', label: 'Category' },
    { key: 'submitted', label: 'Date' },
    { key: 'amountLabel', label: 'Amount' },
    { key: 'statusBadge', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const claimData = filteredClaims.map((row) => ({
    ...row,
    amountLabel: formatExpenseAmount(row.amount),
    categoryLabel: getExpenseCategoryLabel(row.category),
    statusBadge: <Badge variant={expenseStatusBadgeVariant(row.status)}>{row.status}</Badge>,
    actions: (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => setDetailClaim(row)}>
          View
        </Button>
        {row.status === 'Pending' ? (
          <Button variant="ghost" size="sm" onClick={() => setEditClaim(row)}>
            Edit
          </Button>
        ) : null}
      </div>
    ),
  }))

  return (
    <EmployeeGate>
      <ESSModulePage className={`!space-y-6 transition-opacity ${loading ? 'opacity-90' : ''}`}>
        <ESSPageHeader
          title="My Expenses"
          subtitle="Submit and track your reimbursement claims"
          breadcrumb={[
            { label: 'Overview', href: '/overview' },
            { label: 'Expenses', href: '/expenses' },
          ]}
          actions={
            <Button
              variant="primary"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => setSubmitOpen(true)}
            >
              Submit claim
            </Button>
          }
        />

        <ESSDashboardKpiRow stats={kpiStats} />

        <ESSModuleTabBar
          tabs={FILTER_TABS}
          activeTab={filter}
          onTabChange={setFilter}
          showAdd
          onAddClick={() => setSubmitOpen(true)}
          addTitle="Submit claim"
        />

        <TableResultsCount count={claimData.length} />
        <ESSDataTableCard>
          {claimData.length ? (
            <Table variant="modernEmbedded" columns={claimColumns} data={claimData} keyField="id" />
          ) : (
            <TableEmptyBelow
              title="No expense claims"
              description={
                filter === 'all'
                  ? 'Submit your first reimbursement claim to get started.'
                  : 'No claims match this filter.'
              }
              action={
                filter === 'all' ? (
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => setSubmitOpen(true)}
                  >
                    Submit claim
                  </Button>
                ) : null
              }
            />
          )}
        </ESSDataTableCard>

        <ESSSubmitExpenseModal
          open={submitOpen}
          onClose={() => setSubmitOpen(false)}
          onSuccess={loadData}
        />
        <ESSEditExpenseModal
          open={Boolean(editClaim)}
          claim={editClaim}
          onClose={() => setEditClaim(null)}
          onSuccess={loadData}
        />
        <ESSExpenseDetailModal
          open={Boolean(detailClaim)}
          claim={detailClaim}
          onClose={() => setDetailClaim(null)}
          onEdit={(claim) => setEditClaim(claim)}
          onDelete={loadData}
        />
      </ESSModulePage>
    </EmployeeGate>
  )
}
