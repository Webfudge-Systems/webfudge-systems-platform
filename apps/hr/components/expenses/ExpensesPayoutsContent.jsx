'use client'

import { useCallback, useMemo, useState } from 'react'
import { Banknote, Eye, Plus } from 'lucide-react'
import {
  Avatar,
  Button,
  Table,
  TableCellDateOnly,
  TableCellText,
  TableEmptyBelow,
  TableResultsCount,
  TabsWithActions,
} from '@webfudge/ui'
import HRDataTableCard from '../shared/HRDataTableCard'
import HRStatusBadge from '../shared/HRStatusBadge'
import AddExpensePayoutModal from './AddExpensePayoutModal'
import ExpensePayoutDetailModal from './ExpensePayoutDetailModal'
import useExpenseData from '../../hooks/useExpenseData'
import { filterExpensePayouts, getExpensePayoutsTabItems, matchesExpensePayoutsTab } from '../../lib/expensesPage'

export default function ExpensesPayoutsContent() {
  const { payouts, reimburseClaim, error } = useExpenseData()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState(null)
  const [defaultExpenseId, setDefaultExpenseId] = useState('')
  const [actionError, setActionError] = useState('')
  const [actingId, setActingId] = useState(null)

  const tabItems = useMemo(() => getExpensePayoutsTabItems(payouts), [payouts])

  const filteredRows = useMemo(() => {
    const searched = filterExpensePayouts(payouts, searchQuery)
    return searched.filter((row) => matchesExpensePayoutsTab(row, activeTab))
  }, [payouts, searchQuery, activeTab])

  const openProcessModal = useCallback((payout = null) => {
    setDefaultExpenseId(payout?.expenseId ? String(payout.expenseId) : '')
    setAddOpen(true)
  }, [])

  const handleReimburse = useCallback(
    async (payout) => {
      if (!payout?.expenseId) return
      try {
        setActingId(payout.expenseId)
        setActionError('')
        await reimburseClaim(payout.expenseId, {
          method: payout.method,
          scheduled: new Date().toISOString().slice(0, 10),
          reference: payout.reference,
        })
        setSelectedPayout(null)
      } catch (err) {
        setActionError(err?.message || 'Failed to process payout')
      } finally {
        setActingId(null)
      }
    },
    [reimburseClaim],
  )

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
              <div className="truncate text-sm text-gray-500">{row.expenseNumber || row.reference}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'amount',
        label: 'AMOUNT',
        render: (_, row) => (
          <TableCellText value={`₹${row.amount.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'method',
        label: 'METHOD',
        render: (_, row) => <TableCellText value={row.method} />,
      },
      {
        key: 'scheduled',
        label: 'SCHEDULED',
        render: (_, row) => (
          <TableCellDateOnly dateString={row.status === 'Completed' ? row.paidDate || row.scheduled : row.scheduled} />
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
              title="View payout"
              onClick={() => setSelectedPayout(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {row.status === 'Scheduled' ? (
              <Button
                variant="primary"
                size="sm"
                disabled={actingId === row.expenseId}
                onClick={() => openProcessModal(row)}
              >
                {actingId === row.expenseId ? 'Processing…' : 'Pay out'}
              </Button>
            ) : (
              <span className="px-2 text-xs text-gray-500">Paid</span>
            )}
          </div>
        ),
      },
    ],
    [actingId, openProcessModal],
  )

  const emptyCopy = {
    all: {
      title: 'No payouts scheduled',
      description: 'Approved claims ready for reimbursement will appear here.',
    },
    scheduled: {
      title: 'No scheduled payouts',
      description: 'Approve claims in Approvals, then process reimbursement here.',
    },
    completed: {
      title: 'No completed payouts',
      description: 'Processed reimbursements will appear here as completed.',
    },
  }
  const empty = emptyCopy[activeTab] || emptyCopy.all

  return (
    <>
      <TabsWithActions
        tabs={tabItems.map((item) => ({ key: item.key, label: item.label, badge: String(item.count) }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search payouts..."
        showAdd
        onAddClick={() => openProcessModal()}
        addTitle="Process Payout"
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
          onRowClick={(row) => setSelectedPayout(row)}
        />
        {filteredRows.length === 0 ? (
          <TableEmptyBelow
            icon={Banknote}
            title={empty.title}
            description={empty.description}
            action={
              activeTab !== 'completed' ? (
                <Button
                  variant="primary"
                  className="gap-2 bg-orange-500 hover:bg-orange-600"
                  onClick={() => openProcessModal()}
                >
                  <Plus className="h-4 w-4" />
                  Process Payout
                </Button>
              ) : null
            }
          />
        ) : null}
      </HRDataTableCard>

      <AddExpensePayoutModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultExpenseId={defaultExpenseId}
        onSaved={() => setDefaultExpenseId('')}
      />
      <ExpensePayoutDetailModal
        payout={selectedPayout}
        open={Boolean(selectedPayout) && !addOpen}
        onClose={() => !actingId && setSelectedPayout(null)}
        acting={Boolean(selectedPayout && actingId === selectedPayout.expenseId)}
        onReimburse={(payout) => {
          setSelectedPayout(null)
          openProcessModal(payout)
        }}
      />
    </>
  )
}
