import type {
  BankAccount,
  BankTransaction,
  Bill,
  Customer,
  Document,
  Expense,
  Invoice,
  Item,
  ManualJournal,
  Project,
  TimeEntry,
  Vendor,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'

type ListParams = Record<string, string | number | boolean | undefined>

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('strapi_token') || localStorage.getItem('auth-token') : null
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('current-org-id') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { 'X-Organization-Id': orgId } : {}),
    ...(process.env.STRAPI_API_TOKEN ? { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` } : {}),
  }
}

function qs(params?: ListParams) {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) searchParams.set(k, String(v))
  })
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers ?? {}) },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Request failed (${response.status}): ${text}`)
  }

  return response.json()
}

export function getList<T>(path: string, params?: ListParams) {
  return request<T>(`${path}${qs(params)}`)
}

export function getById<T>(path: string, id: number | string, params?: ListParams) {
  return request<T>(`${path}/${id}${qs(params)}`)
}

export function createEntity<T, P>(path: string, payload: P) {
  return request<T>(path, { method: 'POST', body: JSON.stringify({ data: payload }) })
}

export function updateEntity<T, P>(path: string, id: number | string, payload: P) {
  return request<T>(`${path}/${id}`, { method: 'PUT', body: JSON.stringify({ data: payload }) })
}

export function removeEntity(path: string, id: number | string) {
  return request(`${path}/${id}`, { method: 'DELETE' })
}

// Expected Strapi collection routes:
// /api/books-customers, /api/books-vendors, /api/books-items, /api/books-invoices, /api/books-expenses
// /api/books-projects, /api/books-time-entries, /api/books-bills, /api/books-manual-journals
// /api/books-bank-accounts, /api/books-bank-transactions, /api/books-documents

export const booksApi = {
  fetchCustomers: (params?: ListParams) => getList<{ data: Customer[] }>('/books-customers', params),
  fetchCustomerById: (id: number | string) => getById<{ data: Customer }>('/books-customers', id),
  createCustomer: (payload: Partial<Customer>) => createEntity<{ data: Customer }, Partial<Customer>>('/books-customers', payload),
  updateCustomer: (id: number | string, payload: Partial<Customer>) => updateEntity<{ data: Customer }, Partial<Customer>>('/books-customers', id, payload),

  fetchVendors: (params?: ListParams) => getList<{ data: Vendor[] }>('/books-vendors', params),
  fetchItems: (params?: ListParams) => getList<{ data: Item[] }>('/books-items', params),
  fetchInvoices: (params?: ListParams) => getList<{ data: Invoice[] }>('/books-invoices', params),
  fetchInvoiceById: (id: number | string) => getById<{ data: Invoice }>('/books-invoices', id),
  createInvoice: (payload: Partial<Invoice>) => createEntity<{ data: Invoice }, Partial<Invoice>>('/books-invoices', payload),
  updateInvoice: (id: number | string, payload: Partial<Invoice>) => updateEntity<{ data: Invoice }, Partial<Invoice>>('/books-invoices', id, payload),

  fetchExpenses: (params?: ListParams) => getList<{ data: Expense[] }>('/books-expenses', params),
  fetchProjects: (params?: ListParams) => getList<{ data: Project[] }>('/books-projects', params),
  fetchTimeEntries: (params?: ListParams) => getList<{ data: TimeEntry[] }>('/books-time-entries', params),
  fetchBills: (params?: ListParams) => getList<{ data: Bill[] }>('/books-bills', params),
  fetchManualJournals: (params?: ListParams) => getList<{ data: ManualJournal[] }>('/books-manual-journals', params),
  fetchBankAccounts: (params?: ListParams) => getList<{ data: BankAccount[] }>('/books-bank-accounts', params),
  fetchBankTransactions: (params?: ListParams) => getList<{ data: BankTransaction[] }>('/books-bank-transactions', params),
  fetchDocuments: (params?: ListParams) => getList<{ data: Document[] }>('/books-documents', params),
}
