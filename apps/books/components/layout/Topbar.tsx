'use client'

import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import { Button, Input, Modal, Select } from '@webfudge/ui'
import BooksPageHeader from './BooksPageHeader'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

function formatHeaderDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const initialFilters = useMemo(
    () => ({
      status: '',
      source: '',
      type: '',
      subType: '',
      assignedToId: '',
      companyQuery: '',
      dateRange: '',
      valueRange: '',
    }),
    []
  )

  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)

  const segments = useMemo(() => pathname.split('/').filter(Boolean), [pathname])
  const isSalesRoute = segments[0] === 'sales'
  const isPurchasesRoute = segments[0] === 'purchases'
  const isAccountantRoute = segments[0] === 'accountant'
  const isThreadsRoute = segments[0] === 'threads'
  const isSalesOrPurchases = isSalesRoute || isPurchasesRoute
  const isSalesPurchasesAccountant = isSalesRoute || isPurchasesRoute || isAccountantRoute
  const lastSegment = segments[segments.length - 1] ?? ''
  const isAddPage = lastSegment === 'new'

  const moduleSubtitle = useMemo(() => {
    const root = segments[0] ?? ''
    const leaf = segments[1] ?? root

    const salesMap: Record<string, string> = {
      sales: 'Manage customers, estimates, invoices, and recurring billing.',
      customers: 'View and manage your customer list',
      invoices: 'Manage invoices and track payment status',
      estimates: 'Proposal status and approval tracking.',
      'retainer-invoices': 'Manage retainer invoices and balances.',
      'sales-orders': 'Track confirmed orders and fulfillment.',
      'delivery-challans': 'Manage delivery documents and shipment tracking.',
      'payments-received': 'Track customer payments and settlements.',
      'recurring-invoices': 'Automate recurring billing cycles.',
      'credit-notes': 'Track issued credits and adjustments.',
    }

    const purchasesMap: Record<string, string> = {
      purchases: 'Manage vendors, expenses, bills, and purchase orders.',
      vendors: 'View and manage vendor records',
      expenses: 'Track expenses and vendor spending',
      'recurring-expenses': 'Automate recurring expense entries',
      'purchase-orders': 'Manage purchase orders and approvals',
      bills: 'Track bills and due dates',
      'payments-made': 'Track outgoing payments and settlements',
      'recurring-bills': 'Automate recurring bill cycles',
      'vendor-credits': 'Track vendor credits and adjustments',
    }

    if (root === 'sales') return salesMap[leaf] ?? 'Manage sales activity.'
    if (root === 'purchases') return purchasesMap[leaf] ?? 'Manage purchases activity.'
    if (root === 'accountant') {
      const accountantMap: Record<string, string> = {
        accountant: 'Manage journals, accounts, currency adjustments, and controls.',
        'manual-journals': 'Create and review manual journal entries.',
        'bulk-update': 'Apply bulk updates across transactions.',
        'currency-adjustments': 'Track exchange differences and adjustments.',
        'chart-of-accounts': 'Manage accounts and balances.',
        'transaction-locking': 'Lock periods and control postings.',
      }
      return accountantMap[leaf] ?? 'Manage accounting controls.'
    }
    return ''
  }, [segments])

  const moduleAddSubtitle = useMemo(() => {
    const root = segments[0] ?? ''
    const parent = segments[segments.length - 2] ?? segments[1] ?? root
    const make = (value: string) => `Create a new ${value}`

    if (root === 'sales') {
      const map: Record<string, string> = {
        customers: 'customer',
        invoices: 'invoice',
        estimates: 'estimate',
        'retainer-invoices': 'retainer invoice',
        'sales-orders': 'sales order',
        'delivery-challans': 'delivery challan',
        'recurring-invoices': 'recurring invoice',
        'credit-notes': 'credit note',
        'payments-received': 'payment',
      }
      return make(map[parent] ?? parent)
    }

    if (root === 'purchases') {
      const map: Record<string, string> = {
        vendors: 'vendor',
        expenses: 'expense',
        'recurring-expenses': 'recurring expense',
        'purchase-orders': 'purchase order',
        bills: 'bill',
        'payments-made': 'payment',
        'recurring-bills': 'recurring bill',
        'vendor-credits': 'vendor credit',
      }
      return make(map[parent] ?? parent)
    }

    if (root === 'accountant') {
      const map: Record<string, string> = {
        'manual-journals': 'manual journal entry',
        'bulk-update': 'bulk update',
        'currency-adjustments': 'currency adjustment',
        'chart-of-accounts': 'chart of accounts',
        'transaction-locking': 'transaction locking',
      }
      return make(map[parent] ?? parent)
    }

    return ''
  }, [segments])

  const moduleAddHref = useMemo(() => {
    const root = segments[0]
    const leaf = segments[1]
    const salesMap: Record<string, string> = {
      customers: '/sales/customers/new',
      invoices: '/sales/invoices/new',
      estimates: '/sales/estimates/new',
      'retainer-invoices': '/sales/retainer-invoices/new',
      'sales-orders': '/sales/sales-orders/new',
      'delivery-challans': '/sales/delivery-challans/new',
      'payments-received': '/sales/payments-received/new',
      'recurring-invoices': '/sales/recurring-invoices/new',
      'credit-notes': '/sales/credit-notes/new',
    }
    const purchasesMap: Record<string, string> = {
      vendors: '/purchases/vendors/new',
      expenses: '/purchases/expenses/new',
      'recurring-expenses': '/purchases/recurring-expenses/new',
      'purchase-orders': '/purchases/purchase-orders/new',
      bills: '/purchases/bills/new',
      'payments-made': '/purchases/payments-made/new',
      'recurring-bills': '/purchases/recurring-bills/new',
      'vendor-credits': '/purchases/vendor-credits/new',
    }

    const accountantMap: Record<string, string> = {
      'manual-journals': '/accountant/manual-journals/new',
      'bulk-update': '/accountant/bulk-update/new',
      'currency-adjustments': '/accountant/currency-adjustments/new',
      'chart-of-accounts': '/accountant/chart-of-accounts/new',
      'transaction-locking': '/accountant/transaction-locking/new',
    }

    if (root === 'sales') return leaf ? salesMap[leaf] : ''
    if (root === 'purchases') return leaf ? purchasesMap[leaf] : ''
    if (root === 'accountant') return leaf ? accountantMap[leaf] : ''
    return ''
  }, [segments])

  const pageTitle = useMemo(() => {
    const first = segments[0] ?? 'home'
    if (first === 'home') return 'Dashboard'

    if (first === 'threads') return 'Conversations'

    // For add pages (e.g. /sales/customers/new) match CRM:
    // "Add New Customer"
    if (isAddPage) {
      const parent = segments[segments.length - 2] ?? first
      const label = parent.replace(/-/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase())
      return `Add New ${label}`
    }

    // For nested routes (e.g. /sales/customers), use the leaf title like CRM.
    const leaf = segments[segments.length - 1] ?? first
    return leaf.replace(/-/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase())
  }, [segments])

  const filterTargetLabel = useMemo(() => {
    const last = segments[segments.length - 1] ?? 'records'
    const cleaned = last === 'new' ? (segments[segments.length - 2] ?? last) : last
    return cleaned.replace(/-/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase())
  }, [segments])

  const hasActiveFilters = useMemo(() => Object.values(appliedFilters).some((v) => Boolean(String(v || ''))), [
    appliedFilters,
  ])

  const breadcrumb = useMemo(() => {
    if (pathname === '/threads') {
      return [{ label: 'Threads', href: '/threads' }]
    }

    // Always show Dashboard first (CRM-style), then the current path segments.
    if (pathname === '/home' || pathname === '/') {
      return [{ label: 'Dashboard', href: '/home' }]
    }

    const items: Array<{ label: string; href: string }> = [{ label: 'Dashboard', href: '/home' }]

    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/')
      const label =
        segment === 'new'
          ? 'Add New'
          : segment.replace(/-/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase())
      items.push({ label, href })
    })

    return items
  }, [pathname, segments])

  const userName =
    (user as { firstName?: string; name?: string } | null)?.firstName ||
    (user as { name?: string } | null)?.name?.split?.(' ')?.[0] ||
    'User'

  const subtitle = isSalesPurchasesAccountant ? moduleSubtitle : `${getGreeting()}, ${userName} • ${formatHeaderDate()}`
  const resolvedSubtitle = isSalesPurchasesAccountant
    ? isAddPage
      ? moduleAddSubtitle
      : moduleSubtitle
    : isThreadsRoute
      ? 'Comments and threads on leads, deals, and contacts'
      : `${getGreeting()}, ${userName} • ${formatHeaderDate()}`

  const exportTemplate = () => {
    const root = segments[0] ?? 'books'
    const leaf = segments[1] ?? 'list'
    const filename = `books-${root}-${leaf}-export.csv`

    const templates: Record<string, string[]> = {
      customers: ['name', 'company', 'email', 'phone', 'receivables', 'unusedCredits'],
      invoices: ['date', 'number', 'customer', 'status', 'dueDate', 'amount', 'balance'],
      vendors: ['name', 'company', 'email', 'phone', 'payables', 'unusedCredits'],
      expenses: ['date', 'vendor', 'category', 'status', 'amount'],
      bills: ['date', 'billNumber', 'vendor', 'status', 'dueDate', 'amount', 'balance'],
      'manual-journals': ['date', 'journalNumber', 'referenceNumber', 'status', 'notes'],
      'chart-of-accounts': ['accountName', 'type', 'code', 'currency', 'balance'],
    }

    const columns = templates[leaf] || ['id', 'name', 'createdAt']
    const csv = `${columns.join(',')}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <header className="shrink-0">
      <BooksPageHeader
        title={pageTitle}
        subtitle={resolvedSubtitle}
        breadcrumb={breadcrumb}
        showSearch={!isSalesPurchasesAccountant && !isThreadsRoute}
        searchPlaceholder="Search anything..."
        showActions={isSalesPurchasesAccountant && !isAddPage}
        onAddClick={
          isSalesPurchasesAccountant
            ? moduleAddHref
              ? () => router.push(moduleAddHref)
              : () => setShowAddModal(true)
            : undefined
        }
        onFilterClick={
          isSalesPurchasesAccountant
            ? () => {
                setDraftFilters(appliedFilters)
                setShowFilterModal(true)
              }
            : undefined
        }
        onImportClick={isSalesPurchasesAccountant ? () => setShowImportModal(true) : undefined}
        onExportClick={isSalesPurchasesAccountant ? exportTemplate : undefined}
        hasActiveFilters={isSalesPurchasesAccountant ? hasActiveFilters : false}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            This module doesn’t have a create page wired yet. The header action is working; we can connect it once the
            “new” route exists for this section.
          </p>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="muted" onClick={() => setShowAddModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title={`Filter ${filterTargetLabel}`}
        size="xl"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Refine your {filterTargetLabel.toLowerCase()} search</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <Select
                value={draftFilters.status}
                onChange={(value: string) => setDraftFilters((prev) => ({ ...prev, status: value }))}
                placeholder="Select status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'overdue', label: 'Overdue' },
                ]}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Source</span>
              <Select
                value={draftFilters.source}
                onChange={(value: string) => setDraftFilters((prev) => ({ ...prev, source: value }))}
                placeholder="Select source"
                options={[
                  { value: 'web', label: 'Web' },
                  { value: 'referral', label: 'Referral' },
                  { value: 'ads', label: 'Ads' },
                  { value: 'partner', label: 'Partner' },
                ]}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Company Type</span>
              <Select
                value={draftFilters.type}
                onChange={(value: string) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    type: value,
                    subType: '',
                  }))
                }
                placeholder="Select company type"
                options={[
                  { value: 'primary', label: 'Primary' },
                  { value: 'secondary', label: 'Secondary' },
                  { value: 'standard', label: 'Standard' },
                ]}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Sub-Type</span>
              <Select
                value={draftFilters.subType}
                onChange={(value: string) => setDraftFilters((prev) => ({ ...prev, subType: value }))}
                placeholder={draftFilters.type ? 'Select sub-type' : 'Select company type first'}
                options={[
                  { value: 'a', label: 'Option A' },
                  { value: 'b', label: 'Option B' },
                  { value: 'c', label: 'Option C' },
                ]}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Assigned To</span>
              <Select
                value={draftFilters.assignedToId}
                onChange={(value: string) => setDraftFilters((prev) => ({ ...prev, assignedToId: value }))}
                placeholder="Select assignee"
                options={[
                  { value: 'me', label: 'Assigned to me' },
                  { value: 'team', label: 'Assigned to team' },
                ]}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Company</span>
              <Input
                value={draftFilters.companyQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDraftFilters((prev) => ({ ...prev, companyQuery: e.target.value }))
                }
                placeholder="Filter by company..."
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Date Range</span>
              <Select
                value={draftFilters.dateRange}
                onChange={(value: string) => setDraftFilters((prev) => ({ ...prev, dateRange: value }))}
                placeholder="Select date range"
                options={[
                  { value: 'last7', label: 'Last 7 days' },
                  { value: 'last30', label: 'Last 30 days' },
                  { value: 'last90', label: 'Last 90 days' },
                  { value: 'thisYear', label: 'This year' },
                ]}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">Value Range</span>
              <Select
                value={draftFilters.valueRange}
                onChange={(value: string) => setDraftFilters((prev) => ({ ...prev, valueRange: value }))}
                placeholder="Select value range"
                options={[
                  { value: 'lt100k', label: 'Below 1 lakh' },
                  { value: '100k_1m', label: '1 lakh to 10 lakh' },
                  { value: '1m_5m', label: '10 lakh to 50 lakh' },
                  { value: 'gt5m', label: 'Above 50 lakh' },
                ]}
              />
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftFilters(initialFilters)
                setAppliedFilters(initialFilters)
                setShowFilterModal(false)
              }}
            >
              Clear All
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="muted" onClick={() => setShowFilterModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setAppliedFilters(draftFilters)
                  setShowFilterModal(false)
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>

          {hasActiveFilters ? <p className="text-xs text-orange-700">Active filters are applied to results.</p> : null}
        </div>
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Upload a CSV file to import. Backend wiring can be added per module.</p>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
            onChange={() => {
              // keep it simple for now: confirm handler works and close
              setShowImportModal(false)
            }}
          />
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                importInputRef.current?.click()
              }}
            >
              Choose file
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  )
}
