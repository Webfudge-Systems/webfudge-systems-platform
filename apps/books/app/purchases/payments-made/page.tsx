'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CreditCard, Receipt, TrendingUp, Users } from 'lucide-react'
import BooksListPageShell from '@/app/_components/BooksListPageShell'
import BooksDeleteItemModal from '@/app/_components/BooksDeleteItemModal'
import { useBooksPurchaseDocTableColumns } from '@/app/_components/booksPurchasesTableColumns'
import type { PurchaseDocRow } from '@/lib/mock-data/purchases/seeds'
import {
  countPurchaseDocTab,
  matchesPurchaseDocStatuses,
  purchaseDocStatusOptions,
} from '@/lib/purchases/listHelpers'
import { deletePaymentMade, listPaymentsMade } from '@/lib/paymentsMadeSync'

const BASE = '/purchases/payments-made'
const STATUS_GROUPS = {
  paid: ['paid'],
  cleared: ['cleared'],
}

export default function PaymentsMadePage() {
  const [paymentsMade, setPaymentsMade] = useState<PurchaseDocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError('')
      const rows = await listPaymentsMade()
      setPaymentsMade(rows)
    } catch (err) {
      setPaymentsMade([])
      setLoadError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const vendorCount = useMemo(
    () => new Set(paymentsMade.map((p) => p.vendor).filter((v) => v && v !== '—')).size,
    [paymentsMade],
  )

  const reimbursementCount = useMemo(
    () => paymentsMade.filter((p) => p.vendor === 'Employee reimbursement').length,
    [paymentsMade],
  )

  const handleRequestDelete = useCallback((row: PurchaseDocRow) => setDeleteId(row.id), [])
  const columns = useBooksPurchaseDocTableColumns({
    numberLabel: 'PAYMENT#',
    basePath: BASE,
    onRequestDelete: handleRequestDelete,
    deletingId,
  })

  const confirmDelete = useCallback(async () => {
    if (deleteId == null || deletingId) return
    try {
      setDeletingId(deleteId)
      await deletePaymentMade(deleteId)
      setDeleteId(null)
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }, [deleteId, deletingId, loadData])

  const tabs = useMemo(
    () => [
      { key: 'all', label: 'All Payments', count: paymentsMade.length },
      { key: 'paid', label: 'Paid', count: countPurchaseDocTab(paymentsMade, 'paid', STATUS_GROUPS) },
    ],
    [paymentsMade],
  )

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading payments…
      </div>
    )
  }

  return (
    <>
      {loadError ? <p className="mb-4 text-sm text-red-600">{loadError}</p> : null}
      <BooksListPageShell
        title="Payments Made"
        subtitle="Track outgoing vendor and employee reimbursement payments."
        kpis={[
          {
            title: 'All Payments',
            value: paymentsMade.length,
            subtitle: `${paymentsMade.length} payments`,
            icon: CreditCard,
          },
          {
            title: 'Paid',
            value: countPurchaseDocTab(paymentsMade, 'paid', STATUS_GROUPS),
            subtitle: 'Completed payments',
            icon: Receipt,
          },
          {
            title: 'Reimbursements',
            value: reimbursementCount,
            subtitle: 'From HR expense payouts',
            icon: TrendingUp,
          },
          { title: 'Vendors', value: vendorCount, subtitle: `${vendorCount} payees`, icon: Users },
        ]}
        tabs={tabs}
        tabFilter={(row, tab) => matchesPurchaseDocStatuses(row, tab, STATUS_GROUPS)}
        filterFields={[
          { key: 'status', label: 'Status', options: purchaseDocStatusOptions(['Paid', 'Cleared']) },
        ]}
        columns={columns}
        data={paymentsMade}
        onRowClickHref={(row) => `${BASE}/${row.id}`}
        emptyIcon={CreditCard}
        emptyTitle="No payments yet"
        emptyDescription="HR expense payouts and vendor payments will appear here when recorded."
        addHref={`${BASE}/new`}
        addLabel="Record payment"
        searchPlaceholder="Search payments..."
        exportFilePrefix="books-payments-made"
        sortEntity="paymentMade"
      />
      <BooksDeleteItemModal
        isOpen={deleteId != null}
        itemName={paymentsMade.find((row) => row.id === deleteId)?.number}
        entityLabel="Payment"
        deleting={deletingId != null}
        onClose={() => {
          if (deletingId) return
          setDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />
    </>
  )
}
