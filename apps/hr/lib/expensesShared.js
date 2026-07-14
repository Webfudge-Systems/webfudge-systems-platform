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
  { value: 'salaries', label: 'Salaries' },
  { value: 'other', label: 'Other' },
]

export const EXPENSE_CATEGORY_LABELS = Object.fromEntries(
  EXPENSE_API_CATEGORIES.map((item) => [item.value, item.label]),
)

export const EXPENSE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Paid']

export const EXPENSE_PAYMENT_METHODS = ['Bank Transfer', 'Payroll', 'Cash', 'UPI']

export const EXPENSE_PAYOUT_STATUSES = ['Scheduled', 'Completed', 'Failed']

const API_STATUS_TO_UI = {
  draft: 'Pending',
  submitted: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  reimbursed: 'Paid',
}

const UI_STATUS_TO_API = {
  Pending: 'submitted',
  Approved: 'approved',
  Rejected: 'rejected',
  Paid: 'reimbursed',
}

const PAYMENT_MODE_TO_UI = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  other: 'Other',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
}

const UI_PAYMENT_TO_API = {
  'Bank Transfer': 'bank_transfer',
  Payroll: 'bank_transfer',
  Cash: 'cash',
  UPI: 'upi',
  Card: 'card',
  Other: 'other',
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

export function mapUiStatusToApi(status) {
  return UI_STATUS_TO_API[status] || 'submitted'
}

export function mapPaymentModeToUi(mode) {
  return PAYMENT_MODE_TO_UI[String(mode || '').toLowerCase()] || mode || 'Bank Transfer'
}

export function mapUiPaymentToApi(method) {
  return UI_PAYMENT_TO_API[method] || 'bank_transfer'
}

export function formatExpenseAmount(amount) {
  const n = Number(amount) || 0
  return `₹${n.toLocaleString('en-IN')}`
}

export function formatExpenseAmountK(amount) {
  const n = Number(amount) || 0
  return n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : formatExpenseAmount(n)
}

function userDisplayName(user = {}) {
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  return full || user.username || user.email || 'Employee'
}

function normalizeRelation(rel) {
  if (rel == null) return {}
  if (typeof rel !== 'object') return { id: rel }
  if (rel.data) {
    const data = rel.data
    if (data.attributes) return { id: data.id, ...data.attributes }
    return data
  }
  if (rel.attributes) return { id: rel.id, ...rel.attributes }
  return rel
}

export function notifyHrExpensesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hr-expenses-updated'))
  }
}

export function hasReceiptFlag(referenceNumber) {
  return String(referenceNumber || '').startsWith('receipt:')
}

export function buildReceiptReference(hasReceipt, existingReference = '') {
  const base = String(existingReference || '').replace(/^receipt:(yes|no)\|?/, '')
  return `${hasReceipt ? 'receipt:yes' : 'receipt:no'}${base ? `|${base}` : ''}`
}

export function mapExpenseClaimFromApi(row = {}) {
  const submitter = normalizeRelation(row.submittedBy)
  const rawSubmitterId =
    submitter.id ??
    (typeof row.submittedBy === 'number' || typeof row.submittedBy === 'string'
      ? row.submittedBy
      : null)
  return {
    id: row.id,
    expenseNumber: row.expenseNumber || '',
    employee: userDisplayName(submitter) || (rawSubmitterId ? `User #${rawSubmitterId}` : 'Employee'),
    submittedById: rawSubmitterId,
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

export function mapExpenseClaimToApi(form, { submittedById } = {}) {
  return {
    expenseDate: form.submitted,
    amount: Math.round(Number(form.amount) || 0),
    category: form.category,
    description: form.description,
    reimbursable: true,
    referenceNumber: buildReceiptReference(form.receipt, form.referenceNumber),
    paymentMode: mapUiPaymentToApi(form.paymentMode),
    ...(submittedById ? { submittedBy: submittedById } : {}),
    ...(form.status && form.status !== 'Pending' ? { status: mapUiStatusToApi(form.status) } : {}),
  }
}

export function mapPayoutFromClaim(claim) {
  const isPaid = claim.status === 'Paid' || claim.statusRaw === 'reimbursed'
  return {
    id: `payout-${claim.id}`,
    expenseId: claim.id,
    expenseNumber: claim.expenseNumber || '',
    employee: claim.employee,
    amount: claim.amount,
    method: mapPaymentModeToUi(claim.paymentMode),
    scheduled: claim.submitted,
    paidDate: isPaid ? String(claim.createdAt || '').slice(0, 10) || claim.submitted : '',
    status: isPaid ? 'Completed' : 'Scheduled',
    reference: claim.expenseNumber || claim.referenceNumber || '',
    description: claim.description || '',
    category: claim.category,
    categoryLabel: claim.categoryLabel || getExpenseCategoryLabel(claim.category),
  }
}

export function expenseClaimToForm(claim) {
  if (!claim) {
    return {
      employeeId: '',
      employee: '',
      category: '',
      amount: '',
      submitted: new Date().toISOString().slice(0, 10),
      description: '',
      receipt: false,
      status: 'Pending',
      paymentMode: 'Bank Transfer',
      referenceNumber: '',
    }
  }
  return {
    employeeId: claim.submittedById ? String(claim.submittedById) : '',
    employee: claim.employee || '',
    category: claim.category || '',
    amount: String(claim.amount ?? ''),
    submitted: claim.submitted || '',
    description: claim.description || '',
    receipt: Boolean(claim.receipt),
    status: claim.status || 'Pending',
    paymentMode: mapPaymentModeToUi(claim.paymentMode),
    referenceNumber: claim.referenceNumber || '',
  }
}

export function expensePayoutToForm(payout) {
  if (!payout) {
    return {
      employee: '',
      amount: '',
      method: 'Bank Transfer',
      scheduled: new Date().toISOString().slice(0, 10),
      status: 'Scheduled',
      reference: '',
    }
  }
  return {
    employee: payout.employee || '',
    amount: String(payout.amount ?? ''),
    method: payout.method || 'Bank Transfer',
    scheduled: payout.scheduled || '',
    status: payout.status || 'Scheduled',
    reference: payout.reference || '',
  }
}

export function parseClaimForm(form) {
  return {
    employeeId: form.employeeId ? Number(form.employeeId) : null,
    employee: (form.employee || '').trim(),
    category: form.category || '',
    amount: Number(form.amount) || 0,
    submitted: form.submitted || '',
    description: (form.description || '').trim(),
    receipt: Boolean(form.receipt),
    status: form.status || 'Pending',
    paymentMode: form.paymentMode || 'Bank Transfer',
    referenceNumber: form.referenceNumber || '',
  }
}

export function parsePayoutForm(form) {
  return {
    employee: (form.employee || '').trim(),
    amount: Number(form.amount) || 0,
    method: form.method || 'Bank Transfer',
    scheduled: form.scheduled || '',
    status: form.status || 'Scheduled',
    reference: (form.reference || '').trim(),
  }
}

export function buildCategoryChart(claims = []) {
  const byCategory = {}
  for (const claim of claims) {
    const cat = claim.categoryLabel || getExpenseCategoryLabel(claim.category)
    byCategory[cat] = (byCategory[cat] || 0) + (claim.amount || 0)
  }
  return Object.entries(byCategory)
    .map(([cat, amount]) => ({ cat, amount, name: cat, value: amount }))
    .sort((a, b) => b.amount - a.amount)
}
