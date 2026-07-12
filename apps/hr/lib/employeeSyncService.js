'use client'

import { readShiftConfigFromProfile } from './shiftShared'
import { listDepartmentCatalog as listDepartmentsFromApi } from './api/departmentsService'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338')

const EMPLOYEE_META_STORAGE_KEY = 'hr.employee.sync.meta.v1'

function readOrgId() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('current-org-id')
}

function readToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth-token')
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
  const token = readToken()
  const orgId = readOrgId()
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
    const errorData = await response.json().catch(() => ({}))
    const err = errorData?.error || errorData
    const message =
      err?.message ||
      (Array.isArray(err?.details?.errors) && err.details.errors[0]?.message) ||
      (typeof err === 'string' ? err : null) ||
      `HTTP ${response.status}`
    throw new Error(message)
  }
  return response.json()
}

function get(path, params = {}) {
  const qs = buildQueryString(params)
  return request(qs ? `${path}?${qs}` : path)
}

function post(path, body = {}) {
  return request(path, { method: 'POST', body })
}

function patch(path, body = {}) {
  return request(path, { method: 'PATCH', body })
}

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

function readField(row, key) {
  if (row == null) return undefined
  if (row[key] !== undefined) return row[key]
  if (row?.attributes && row.attributes[key] !== undefined) return row.attributes[key]
  return undefined
}

function formatRoleName(roleLike = '') {
  const raw = String(roleLike || '').trim()
  if (!raw) return ''
  return raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((s) => `${s.charAt(0).toUpperCase()}${s.slice(1).toLowerCase()}`)
    .join(' ')
}

function resolveStatusFromMembership(user, metaStatus = '') {
  if (metaStatus) return metaStatus
  if (user?.blocked) return 'Exited'
  if (user?.confirmed === false) return 'Probation'
  return 'Active'
}

function readEmployeeMetaMap() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(EMPLOYEE_META_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

function writeEmployeeMetaMap(metaMap) {
  if (typeof window === 'undefined') return
  localStorage.setItem(EMPLOYEE_META_STORAGE_KEY, JSON.stringify(metaMap || {}))
}

function deriveDepartmentLabel(user, departmentsById) {
  const primary = user?.primaryDepartmentId
  if (primary != null && departmentsById.has(Number(primary))) return departmentsById.get(Number(primary))

  if (Array.isArray(user?.departments) && user.departments.length) {
    const first = user.departments[0]
    if (first && typeof first === 'object' && first.name) return first.name
  }

  if (Array.isArray(user?.departmentIds) && user.departmentIds.length) {
    const firstId = Number(user.departmentIds[0])
    if (departmentsById.has(firstId)) return departmentsById.get(firstId)
  }

  return ''
}

function normalizeEmployeeId(user, fallbackIndex) {
  if (user?.employeeId) return user.employeeId
  const idSource = Number.parseInt(String(user?.id || user?.membershipId || fallbackIndex || 0), 10)
  if (Number.isFinite(idSource) && idSource > 0) return `WF-${1000 + idSource}`
  return `WF-${1000 + fallbackIndex}`
}

function profileShiftFields(profile) {
  const config = readShiftConfigFromProfile(profile)
  return {
    primaryShift: config.primaryShift,
    assignedShifts: config.assignedShifts,
    flexibleShift: config.flexibleShift,
    shift: config.flexibleShift
      ? `${config.assignedShifts.length} flexible shift(s)`
      : config.primaryShift,
  }
}

function userDisplayName(user) {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  if (full) return full
  if (user?.username) return user.username
  return user?.email || 'Unknown User'
}

function toEmployeeRow(user, index, departmentsById, metaMap, profileByOrgUserId = new Map()) {
  const key = String(user?.membershipId || user?.id || user?.email || index)
  const meta = metaMap[key] || {}
  const profile = profileByOrgUserId.get(Number(user?.membershipId)) || null
  const roleCode = String(user?.roleCode || user?.role?.code || user?.role || '').toLowerCase()
  const roleLabel = formatRoleName(user?.role?.name || roleCode || 'member')
  const department = meta.department || deriveDepartmentLabel(user, departmentsById)
  const name = userDisplayName(user)
  return {
    id: key,
    membershipId: user?.membershipId,
    userId: user?.id,
    employeeId: meta.employeeId || normalizeEmployeeId(user, index + 1),
    name,
    email: user?.email || '',
    phone: meta.phone || '',
    department,
    designation: meta.designation || roleLabel || 'Team Member',
    manager: meta.manager || formatRoleName(roleCode || 'manager'),
    reportingRole: meta.reportingRole || (roleCode === 'admin' ? 'admin' : 'manager'),
    salaryStructureId:
      profile?.salaryStructure?.id ||
      profile?.salaryStructure ||
      (meta.salaryStructureId ? Number(meta.salaryStructureId) : null),
    annualCtc: Number(profile?.annualCtc || meta.annualCtc || 0) || '',
    bankAccountNumber: profile?.bankAccountNumber || meta.bankAccountNumber || '',
    bankIfsc: profile?.bankIfsc || meta.bankIfsc || '',
    bankName: profile?.bankName || meta.bankName || '',
    employmentType: meta.employmentType || 'Full-time',
    status: resolveStatusFromMembership(user, meta.status),
    location: meta.location || '',
    workLocation: meta.workLocation || meta.location || '',
    joinDate: meta.joinDate || (user?.createdAt ? String(user.createdAt).slice(0, 10) : ''),
    ...profileShiftFields(profile),
    userRaw: user,
  }
}

function splitName(fullName) {
  const raw = String(fullName || '').trim()
  if (!raw) return { firstName: '', lastName: '' }
  const parts = raw.split(/\s+/)
  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' '),
  }
}

function accountStatusFromEmployeeStatus(status) {
  return status === 'Exited' ? 'suspended' : 'active'
}

function roleCodeFromReportingRole(reportingRole) {
  const value = String(reportingRole || '').toLowerCase()
  if (value === 'admin' || value === 'manager') return value
  return 'manager'
}

export async function listDepartmentCatalog() {
  return listDepartmentsFromApi()
}

export async function listRoleCatalog() {
  const orgId = readOrgId()
  if (!orgId) return []
  const rows = normalizeRows(await get(`/organizations/${orgId}/roles`))
  if (rows.length) return rows
  return [
    { code: 'admin', name: 'Admin' },
    { code: 'manager', name: 'Manager' },
    { code: 'member', name: 'Member' },
  ]
}

export async function listSyncedEmployees() {
  const orgId = readOrgId()
  if (!orgId) return { employees: [], departments: [], roles: [] }

  const [userRows, departments, roles, profileRows] = await Promise.all([
    normalizeRows(await get(`/organizations/${orgId}/users`, { sort: 'updatedAt:desc' })),
    listDepartmentCatalog(),
    listRoleCatalog(),
    normalizeRows(await get('/employee-profiles', { sort: 'updatedAt:desc' })),
  ])
  const departmentsById = new Map(departments.map((d) => [Number(d.id), d.name]))
  const metaMap = readEmployeeMetaMap()
  const profileByOrgUserId = new Map()
  for (const profile of profileRows) {
    const orgUserId =
      Number(
        profile?.organizationUser?.id ||
          profile?.organizationUser?.documentId ||
          profile?.organizationUser,
      ) || null
    if (orgUserId != null) profileByOrgUserId.set(orgUserId, profile)
  }
  const employees = userRows.map((user, index) =>
    toEmployeeRow(user, index, departmentsById, metaMap, profileByOrgUserId),
  )
  return { employees, departments, roles }
}

export async function getSyncedEmployeeById(employeeId) {
  const { employees, departments, roles } = await listSyncedEmployees()
  return {
    employee: employees.find((row) => String(row.id) === String(employeeId)) || null,
    departments,
    roles,
  }
}

export async function createEmployeeFromForm(form, departments = []) {
  const orgId = readOrgId()
  if (!orgId) throw new Error('No active organization selected')
  const email = String(form.email || '').trim().toLowerCase()
  if (!email) throw new Error('Work email is required')

  const roleCode = roleCodeFromReportingRole(form.reportingRole)
  const targetDepartment = departments.find((d) => d.name === form.department) || null
  const payload = {
    emails: [email],
    role: roleCode,
    permissions: {},
    directAdd: true,
    directPassword: String(form.initialPassword || '').trim() || undefined,
    sendWelcomeEmail: form.sendLoginEmail !== false,
    departmentIds: targetDepartment ? [targetDepartment.id] : [],
    primaryDepartmentId: targetDepartment?.id || null,
  }

  await post(`/organizations/${orgId}/invite-users`, payload)

  // Refresh users and bind metadata to the newly created membership.
  const refreshed = normalizeRows(await get(`/organizations/${orgId}/users`, { sort: 'updatedAt:desc' }))
  const user = refreshed.find((u) => String(u?.email || '').toLowerCase() === email)
  if (!user) return null

  const key = String(user.membershipId || user.id || email)
  const metaMap = readEmployeeMetaMap()
  metaMap[key] = {
    employeeId: metaMap[key]?.employeeId || normalizeEmployeeId(user, refreshed.length + 1),
    designation: form.designation || '',
    manager: formatRoleName(form.manager || roleCode),
    reportingRole: roleCode,
    employmentType: form.employmentType || 'Full-time',
    status: form.status || 'Probation',
    phone: form.phone || '',
    joinDate: form.joinDate || '',
    location: form.location || '',
    workLocation: form.location || '',
    department: form.department || '',
    salaryStructureId: form.salaryStructureId ? Number(form.salaryStructureId) : null,
    annualCtc: Number(form.annualCtc || 0) || 0,
    bankAccountNumber: form.bankAccountNumber || '',
    bankIfsc: form.bankIfsc || '',
    bankName: form.bankName || '',
  }
  writeEmployeeMetaMap(metaMap)

  const { firstName, lastName } = splitName(form.fullName)
  await patch(`/organizations/${orgId}/users/${user.membershipId}`, {
    username: String(form.fullName || '').trim() || email,
    email,
    roleCode,
    status: accountStatusFromEmployeeStatus(form.status),
    firstName,
    lastName,
    departmentIds: targetDepartment ? [targetDepartment.id] : [],
    primaryDepartmentId: targetDepartment?.id || null,
  })
  return {
    membershipId: user.membershipId,
    userId: user.id,
    employeeKey: key,
  }
}

export async function updateEmployeeFromForm(employee, form, departments = []) {
  const orgId = readOrgId()
  const membershipId = employee?.membershipId
  if (!orgId || !membershipId) throw new Error('Unable to update employee membership')

  const roleCode = roleCodeFromReportingRole(form.reportingRole)
  const email = String(form.email || '').trim().toLowerCase()
  const targetDepartment = departments.find((d) => d.name === form.department) || null
  const { firstName, lastName } = splitName(form.fullName)

  await patch(`/organizations/${orgId}/users/${membershipId}`, {
    username: String(form.fullName || '').trim(),
    email,
    roleCode,
    status: accountStatusFromEmployeeStatus(form.status),
    firstName,
    lastName,
    departmentIds: targetDepartment ? [targetDepartment.id] : [],
    primaryDepartmentId: targetDepartment?.id || null,
  })

  const key = String(employee.id)
  const metaMap = readEmployeeMetaMap()
  metaMap[key] = {
    employeeId: employee.employeeId,
    designation: form.designation || '',
    manager: formatRoleName(form.manager || roleCode),
    reportingRole: roleCode,
    employmentType: form.employmentType || 'Full-time',
    status: form.status || 'Active',
    phone: form.phone || '',
    joinDate: form.joinDate || '',
    location: form.location || '',
    workLocation: form.location || '',
    department: form.department || '',
    salaryStructureId: form.salaryStructureId ? Number(form.salaryStructureId) : null,
    annualCtc: Number(form.annualCtc || 0) || 0,
    bankAccountNumber: form.bankAccountNumber || '',
    bankIfsc: form.bankIfsc || '',
    bankName: form.bankName || '',
  }
  writeEmployeeMetaMap(metaMap)
  return {
    membershipId,
    employeeKey: key,
  }
}

export async function softDeleteEmployee(employee) {
  const orgId = readOrgId()
  const membershipId = employee?.membershipId
  if (!orgId || !membershipId) throw new Error('Unable to remove employee')

  await patch(`/organizations/${orgId}/users/${membershipId}`, {
    status: 'suspended',
    roleCode: roleCodeFromReportingRole(employee.reportingRole),
  })

  const key = String(employee.id)
  const metaMap = readEmployeeMetaMap()
  metaMap[key] = {
    ...(metaMap[key] || {}),
    status: 'Exited',
  }
  writeEmployeeMetaMap(metaMap)
}
