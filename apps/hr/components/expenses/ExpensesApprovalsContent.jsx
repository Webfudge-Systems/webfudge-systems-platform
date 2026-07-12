'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, CheckCircle, Paperclip } from 'lucide-react'
import {
  Avatar,
  Button,
  Table,
  TableCellDateOnly,
  TableCellOrangePill,
  TableCellText,
  TableEmptyBelow,
  TableResultsCount,
  TabsWithActions,
} from '@webfudge/ui'
import HRDataTableCard from '../shared/HRDataTableCard'
import HRStatusBadge from '../shared/HRStatusBadge'
import ExpenseClaimDetailModal from './ExpenseClaimDetailModal'
import ExpenseRejectModal from './ExpenseRejectModal'
import useExpenseData from '../../hooks/useExpenseData'
import { getExpenseApprovalsTabItems, matchesExpenseApprovalsTab } from '../../lib/expensesPage'
import { getExpenseCategoryLabel } from '../../lib/expensesShared'

export default function ExpensesApprovalsContent() {
  const router = useRouter()
  const { pendingClaims, approveClaim, rejectClaim, error } = useExpenseData()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [rejectingClaim, setRejectingClaim] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actingId, setActingId] = useState(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  const tabItems = useMemo(() => getExpenseApprovalsTabItems(pendingClaims), [pendingClaims])

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return pendingClaims.filter((row) => {
      if (!matchesExpenseApprovalsTab(row, activeTab)) return false
      if (!q) return true
      const categoryLabel = row.categoryLabel || getExpenseCategoryLabel(row.category)
      return (
        row.employee.toLowerCase().includes(q) ||
        categoryLabel.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        (row.description || '').toLowerCase().includes(q) ||
        (row.expenseNumber || '').toLowerCase().includes(q)
      )
    })
  }, [pendingClaims, searchQuery, activeTab])

  const handleApprove = useCallback(async (claim) => {
    if (!claim?.id) return
    try {
      setActingId(claim.id)
      setActionError('')
      await approveClaim(claim.id)
      setSelectedClaim(null)
    } catch (err) {
      setActionError(err?.message || 'Failed to approve claim')
    } finally {
      setActingId(null)
    }
  }, [approveClaim])

  const handleRejectConfirm = useCallback(async (id, reason) => {
    try {
      setRejectSubmitting(true)
      setActionError('')
      await rejectClaim(id, reason)
      setRejectingClaim(null)
      setSelectedClaim(null)
    } catch (err) {
      setActionError(err?.message || 'Failed to reject claim')
    } finally {
      setRejectSubmitting(false)
    }
  }, [rejectClaim])

  const columns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[180px] items-center gap-3">
            <Avatar alt={row.employee} fallback={row.employee?.charAt(0) || '?'} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{row.employee}</div>
              <div className="truncate text-sm text-gray-500">{row.description}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        label: 'CATEGORY',
        render: (_, row) => <TableCellOrangePill value={getExpenseCategoryLabel(row.category)} />,
      },
      {
        key: 'amount',
        label: 'AMOUNT',
        render: (_, row) => (
          <TableCellText value={`₹${row.amount.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'submitted',
        label: 'SUBMITTED',
        render: (_, row) => <TableCellDateOnly dateString={row.submitted} />,
      },
      {
        key: 'receipt',
        label: 'RECEIPT',
        render: (_, row) =>
          row.receipt ? (
            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
              <Paperclip className="h-4 w-4 text-orange-500" aria-hidden />
              Attached
            </span>
          ) : (
            <TableCellText value="—" />
          ),
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[200px] items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="View"
              onClick={() => setSelectedClaim(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={actingId === row.id}
              onClick={() => handleApprove(row)}
            >
              {actingId === row.id ? 'Approving…' : 'Approve'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={actingId === row.id || rejectSubmitting}
              onClick={() => setRejectingClaim(row)}
            >
              Reject
            </Button>
          </div>
        ),
      },
    ],
    [actingId, rejectSubmitting, handleApprove],
  )

  return (
    <>
      <TabsWithActions
        tabs={tabItems.map((item) => ({ key: item.key, label: item.label, badge: String(item.count) }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search pending approvals..."
        variant="glass"
      />

      <TableResultsCount count={filteredRows.length} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      <HRDataTableCard>
        <Table
          columns={columns}
          data={filteredRows}
          keyField="id"
          variant="modernEmbedded"
          onRowClick={(row) => setSelectedClaim(row)}
        />
        {filteredRows.length === 0 ? (
          <TableEmptyBelow
            icon={CheckCircle}
            title="No pending approvals"
            description="Claims submitted from ESS or HR Claims will appear here for review."
            action={
              <Button variant="outline" size="sm" onClick={() => router.push('/expenses')}>
                View all claims
              </Button>
            }
          />
        ) : null}
      </HRDataTableCard>

      <ExpenseClaimDetailModal
        claim={selectedClaim}
        open={Boolean(selectedClaim)}
        onClose={() => !actingId && setSelectedClaim(null)}
        showDelete={false}
        approvalMode
        acting={Boolean(selectedClaim && actingId === selectedClaim.id)}
        onApprove={handleApprove}
        onReject={(claim) => {
          setSelectedClaim(null)
          setRejectingClaim(claim)
        }}
      />

      <ExpenseRejectModal
        open={Boolean(rejectingClaim)}
        claim={rejectingClaim}
        onClose={() => !rejectSubmitting && setRejectingClaim(null)}
        onConfirm={handleRejectConfirm}
        submitting={rejectSubmitting}
      />
    </>
  )
}
