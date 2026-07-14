import { paymentsMadeApi } from '@/lib/api'
import type { PurchaseDocRow } from '@/lib/mock-data/purchases/seeds'

type ApiPaymentMade = {
  id: number
  paymentNumber?: string
  paymentDate?: string
  amount?: number
  paymentMode?: string
  referenceNumber?: string
  notes?: string
  vendor?: { name?: string; companyName?: string } | null
  createdAt?: string
  updatedAt?: string
}

function normalizeVendor(row: ApiPaymentMade) {
  const vendor = row.vendor
  if (vendor && typeof vendor === 'object') {
    return vendor.name || vendor.companyName || 'Vendor'
  }
  if (String(row.notes || '').toLowerCase().includes('reimbursement')) {
    return 'Employee reimbursement'
  }
  return '—'
}

function formatAmount(amount = 0) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

export function mapPaymentMadeFromApi(row: ApiPaymentMade): PurchaseDocRow {
  return {
    id: row.id,
    date: row.paymentDate || '',
    number: row.paymentNumber || `PMADE-${row.id}`,
    vendor: normalizeVendor(row),
    status: 'Paid',
    amount: formatAmount(row.amount),
    createdAt: row.createdAt || row.paymentDate || '',
    updatedAt: row.updatedAt,
  }
}

export async function listPaymentsMade(params: Record<string, string | number | boolean | undefined> = {}) {
  const response = await paymentsMadeApi.list({ limit: 200, sort: 'createdAt:desc', ...params })
  const rows = Array.isArray((response as { data?: ApiPaymentMade[] })?.data)
    ? (response as { data: ApiPaymentMade[] }).data
    : Array.isArray(response)
      ? (response as ApiPaymentMade[])
      : []
  return rows.map(mapPaymentMadeFromApi)
}

export async function deletePaymentMade(id: number | string) {
  await paymentsMadeApi.delete(id)
}
