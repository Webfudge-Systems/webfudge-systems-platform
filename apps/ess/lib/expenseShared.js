export const EXPENSE_API_CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Food & Meals' },
  { value: 'office', label: 'Office Supplies' },
  { value: 'marketing', label: 'Client Entertainment' },
  { value: 'training', label: 'Training' },
  { value: 'software_saas', label: 'Software / SaaS' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'other', label: 'Other' },
]

export const EXPENSE_CATEGORY_LABELS = Object.fromEntries(
  EXPENSE_API_CATEGORIES.map((item) => [item.value, item.label]),
)

const API_STATUS_TO_UI = {
  draft: 'Pending',
  submitted: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  reimbursed: 'Paid',
}

const UI_PAYMENT_TO_API = {
  'Bank Transfer': 'bank_transfer',
  Payroll: 'bank_transfer',
  Cash: 'cash',
  UPI: 'upi',
}

export const EXPENSE_UPDATED_EVENT = 'ess-expenses-updated'

export function notifyExpenseUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EXPENSE_UPDATED_EVENT))
  }
}

export function getExpenseCategoryOptions() {
  return EXPENSE_API_CATEGORIES
}

export function getExpenseCategoryLabel(value) {
  return EXPENSE_CATEGORY_LABELS[value] || value || 'Other'
}

export function mapApiStatusToUi(status) {
  return API_STATUS_TO_UI[String(status || '').toLowerCase()] || 'Pending'
}

export function mapUiPaymentToApi(method) {
  return UI_PAYMENT_TO_API[method] || 'bank_transfer'
}

export function formatExpenseAmount(amount) {
  const n = Number(amount) || 0
  return `₹${n.toLocaleString('en-IN')}`
}

function userDisplayName(user = {}) {
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  return full || user.username || user.email || 'Employee'
}

export function hasReceiptFlag(referenceNumber) {
  return String(referenceNumber || '').startsWith('receipt:')
}

export function buildReceiptReference(hasReceipt, existingReference = '') {
  const base = String(existingReference || '').replace(/^receipt:(yes|no)\|?/, '')
  return `${hasReceipt ? 'receipt:yes' : 'receipt:no'}${base ? `|${base}` : ''}`
}

export function mapExpenseClaimFromApi(row = {}) {
  const submitter = row.submittedBy || {}
  return {
    id: row.id,
    expenseNumber: row.expenseNumber || '',
    employee: userDisplayName(submitter),
    submittedById: submitter.id || row.submittedBy || null,
    category: row.category || 'other',
    categoryLabel: getExpenseCategoryLabel(row.category),
    amount: Number(row.amount) || 0,
    submitted: row.expenseDate || '',
    description: row.description || '',
    receipt: hasReceiptFlag(row.referenceNumber),
    referenceNumber: row.referenceNumber || '',
    status: mapApiStatusToUi(row.status),
    statusRaw: row.status || 'submitted',
    reimbursable: row.reimbursable !== false,
    paymentMode: row.paymentMode || 'bank_transfer',
    createdAt: row.createdAt || '',
  }
}

export function mapExpenseClaimToApi(form) {
  return {
    expenseDate: form.submitted,
    amount: Math.round(Number(form.amount) || 0),
    category: form.category,
    description: form.description,
    reimbursable: true,
    referenceNumber: buildReceiptReference(form.receipt, form.referenceNumber),
    paymentMode: mapUiPaymentToApi(form.paymentMode),
  }
}

export function expenseClaimToForm(claim) {
  if (!claim) {
    return {
      category: '',
      amount: '',
      submitted: new Date().toISOString().slice(0, 10),
      description: '',
      receipt: false,
      paymentMode: 'Bank Transfer',
      referenceNumber: '',
    }
  }
  return {
    category: claim.category || '',
    amount: String(claim.amount ?? ''),
    submitted: claim.submitted || '',
    description: claim.description || '',
    receipt: Boolean(claim.receipt),
    paymentMode: 'Bank Transfer',
    referenceNumber: claim.referenceNumber || '',
  }
}

export function parseClaimForm(form) {
  return {
    category: form.category || '',
    amount: Number(form.amount) || 0,
    submitted: form.submitted || '',
    description: (form.description || '').trim(),
    receipt: Boolean(form.receipt),
    paymentMode: form.paymentMode || 'Bank Transfer',
    referenceNumber: form.referenceNumber || '',
  }
}

export function filterClaimsByTab(claims, tabId) {
  if (!tabId || tabId === 'all') return claims
  const statusMap = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
  }
  const target = statusMap[tabId]
  if (!target) return claims
  return claims.filter((row) => row.status === target)
}
