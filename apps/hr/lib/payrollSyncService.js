'use client'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338')

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth-token')
}

function getOrgId() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('current-org-id')
}

function buildQueryString(params = {}) {
  const parts = []
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    parts.push(`${key}=${encodeURIComponent(value)}`)
  })
  return parts.join('&')
}

async function request(endpoint, options = {}) {
  const token = getToken()
  const orgId = getOrgId()

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { 'X-Organization-Id': orgId } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const err = data?.error || data
    const error = new Error(err?.message || (typeof err === 'string' ? err : `HTTP ${response.status}`))
    error.details = err?.details || data?.details || data
    throw error
  }

  return response.json()
}

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

function mapSalaryStructure(row) {
  return {
    id: row.id,
    name: row.name || '',
    ctc: Number(row.ctc || 0),
    basicPercent: Number(row.basicPercent || 0),
    hraPercent: Number(row.hraPercent || 0),
    specialAllowancePercent: Number(row.specialAllowancePercent || 0),
    fbpPercent: Number(row.fbpPercent || 0),
    isActive: row.isActive !== false,
    components: row.components || [],
    headcount: Number(row.headcount || 0),
  }
}

function relationId(value) {
  if (value == null) return null
  if (typeof value === 'object') return value.id ?? value.documentId ?? null
  return value
}

function mapPayrollRun(row) {
  const month = Number(row.month || 1)
  const year = Number(row.year || new Date().getFullYear())
  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  return {
    id: row.id,
    runNumber: row.runNumber,
    month,
    year,
    monthLabel,
    status: row.status || 'draft',
    totalEmployees: Number(row.totalEmployees || 0),
    totalGross: Number(row.totalGross || 0),
    totalDeductions: Number(row.totalDeductions || 0),
    totalNet: Number(row.totalNet || 0),
    pfLiability: Number(row.pfLiability || 0),
    createdAt: row.createdAt,
    lockedAt: row.lockedAt || null,
    disbursedAt: row.disbursedAt || null,
    lineItems: Array.isArray(row.lineItems) ? row.lineItems : [],
  }
}

export async function listSalaryStructures() {
  const [structureRows, profileRows] = await Promise.all([
    request('/salary-structures', { method: 'GET' }),
    request('/employee-profiles', { method: 'GET' }).catch(() => ({ data: [] })),
  ])
  const headcountByStructureId = new Map()
  normalizeRows(profileRows).forEach((profile) => {
    const structureId = relationId(profile.salaryStructure)
    if (structureId == null) return
    const key = String(structureId)
    headcountByStructureId.set(key, (headcountByStructureId.get(key) || 0) + 1)
  })
  return normalizeRows(structureRows).map((row) => ({
    ...mapSalaryStructure(row),
    headcount: headcountByStructureId.get(String(row.id)) || 0,
  }))
}

export async function createSalaryStructure(payload) {
  const response = await request('/salary-structures', { method: 'POST', body: payload })
  return response?.data ? mapSalaryStructure(response.data) : null
}

export async function getSalaryStructureById(id) {
  const response = await request(`/salary-structures/${id}`, { method: 'GET' })
  return response?.data ? mapSalaryStructure(response.data) : null
}

export async function updateSalaryStructure(id, payload) {
  const response = await request(`/salary-structures/${id}`, { method: 'PUT', body: payload })
  return response?.data ? mapSalaryStructure(response.data) : null
}

export async function deleteSalaryStructure(id) {
  await request(`/salary-structures/${id}`, { method: 'DELETE' })
}

export async function duplicateSalaryStructure(id) {
  const list = await listSalaryStructures()
  const source = list.find((s) => String(s.id) === String(id))
  if (!source) throw new Error('Salary structure not found')
  return createSalaryStructure({
    name: `${source.name} Copy`,
    ctc: source.ctc,
    basicPercent: source.basicPercent,
    hraPercent: source.hraPercent,
    specialAllowancePercent: source.specialAllowancePercent,
    fbpPercent: source.fbpPercent,
    isActive: source.isActive,
  })
}

export async function listPayrollRuns() {
  const rows = normalizeRows(await request('/payroll-runs', { method: 'GET' }))
  return rows.map(mapPayrollRun).sort((a, b) => (b.year - a.year) || (b.month - a.month))
}

export async function getPayrollRunById(id) {
  const response = await request(`/payroll-runs/${id}`, { method: 'GET' })
  if (!response?.data) return null
  return mapPayrollRun(response.data)
}

export async function createPayrollRun({ month, year }) {
  const response = await request('/payroll-runs', { method: 'POST', body: { month, year } })
  return response?.data ? mapPayrollRun(response.data) : null
}

export async function recalculatePayrollRun(id) {
  const response = await request(`/payroll-runs/${id}/recalculate`, { method: 'POST' })
  return response?.data ? mapPayrollRun(response.data) : null
}

export async function transitionPayrollRun(id, action) {
  const response = await request(`/payroll-runs/${id}/${action}`, { method: 'POST' })
  return response?.data ? mapPayrollRun(response.data) : null
}

export async function listPayrollLineItems(runId) {
  const query = buildQueryString({ payrollRun: runId, limit: 1000 })
  const rows = normalizeRows(await request(`/payroll-line-items?${query}`, { method: 'GET' }))
  return rows
}

export async function deletePayrollLineItem(id) {
  await request(`/payroll-line-items/${id}`, { method: 'DELETE' })
}

export async function getPayrollLineItemById(id) {
  const response = await request(`/payroll-line-items/${id}`, { method: 'GET' })
  return response?.data || null
}

export async function updatePayrollLineItem(id, payload) {
  const response = await request(`/payroll-line-items/${id}`, { method: 'PUT', body: payload })
  return response?.data || null
}

export async function createPayrollLineItem(payload) {
  const response = await request('/payroll-line-items', { method: 'POST', body: payload })
  return response?.data || null
}

export async function listPayslips({ payrollRunId } = {}) {
  const query = buildQueryString({ payrollRun: payrollRunId, limit: 1000 })
  const rows = normalizeRows(await request(`/payslips?${query}`, { method: 'GET' }))
  return rows
}

export async function generatePayslip({ payrollRunId, payrollLineItemId }) {
  const response = await request('/payslips/generate', {
    method: 'POST',
    body: { payrollRunId, payrollLineItemId },
  })
  return response?.data || null
}

export function getPayslipDownloadUrl(payslipId) {
  return `${API_BASE_URL}/api/payslips/${payslipId}/download`
}

export async function listEmployeeProfiles() {
  const rows = normalizeRows(await request('/employee-profiles', { method: 'GET' }))
  return rows
}

export async function upsertEmployeeProfileByMembership(membershipId, payload) {
  const profiles = await listEmployeeProfiles()
  const existing = profiles.find((p) => String(p?.organizationUser?.id || p?.organizationUser) === String(membershipId))
  if (existing?.id) {
    const response = await request(`/employee-profiles/${existing.id}`, { method: 'PUT', body: payload })
    return response?.data || null
  }
  const response = await request('/employee-profiles', {
    method: 'POST',
    body: {
      employeeCode: payload.employeeCode || `WF-${1000 + Number(membershipId || 0)}`,
      ...payload,
      organizationUser: membershipId,
    },
  })
  return response?.data || null
}
