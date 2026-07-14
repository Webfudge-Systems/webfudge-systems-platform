'use strict'

/**
 * Default CRM / PM permission matrix persisted on organization-role.permissions.
 * access: none | read | write | manage
 * manage = full CRUD + configuration where applicable (mirrors CRM/PM admins)
 */

const ACCESS = {
  NONE: 'none',
  READ: 'read',
  WRITE: 'write',
  MANAGE: 'manage',
}

const CRM_MODULES = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  companies: 'Lead companies',
  contacts: 'Contacts',
  deals: 'Deals & pipeline',
  client_accounts: 'Client accounts',
  client_projects: 'Client projects',
  client_invoices: 'Invoices',
  proposals: 'Proposals',
  meetings: 'Meetings',
  calendar: 'Calendar',
  analytics: 'Analytics',
  settings: 'Settings',
}

const PM_MODULES = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  tasks: 'Tasks',
  my_tasks: 'My tasks',
  inbox: 'Inbox & messages',
  calendar: 'Calendar',
  analytics: 'Analytics',
  settings: 'Settings',
}

const HR_MODULES = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  attendance: 'Attendance',
  leave: 'Leave',
  payroll: 'Payroll',
  settings: 'Settings',
}

const REALESTATE_MODULES = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  pipeline: 'Pipeline',
  projects: 'Projects',
  site_visits: 'Site visits',
  settings: 'Settings',
}

function moduleEntry(access) {
  return { access }
}

function matrixFromCrmPmHr(crmMap, pmMap, hrMap, realestateMap = {}) {
  const crm = { modules: {} }
  Object.keys(CRM_MODULES).forEach((key) => {
    crm.modules[key] = moduleEntry(crmMap[key] || ACCESS.NONE)
  })
  const pm = { modules: {} }
  Object.keys(PM_MODULES).forEach((key) => {
    pm.modules[key] = moduleEntry(pmMap[key] || ACCESS.NONE)
  })
  const hr = { modules: {} }
  Object.keys(HR_MODULES).forEach((key) => {
    hr.modules[key] = moduleEntry(hrMap[key] || ACCESS.NONE)
  })
  const realestate = { modules: {} }
  Object.keys(REALESTATE_MODULES).forEach((key) => {
    realestate.modules[key] = moduleEntry(realestateMap[key] || ACCESS.NONE)
  })
  return { crm, pm, hr, realestate }
}

const ALL_MANAGE_CRM = Object.fromEntries(Object.keys(CRM_MODULES).map((k) => [k, ACCESS.MANAGE]))
const ALL_MANAGE_PM = Object.fromEntries(Object.keys(PM_MODULES).map((k) => [k, ACCESS.MANAGE]))
const ALL_MANAGE_HR = Object.fromEntries(Object.keys(HR_MODULES).map((k) => [k, ACCESS.MANAGE]))
const ALL_MANAGE_REALESTATE = Object.fromEntries(
  Object.keys(REALESTATE_MODULES).map((k) => [k, ACCESS.MANAGE])
)

/** Admin: full CRM + PM */
const ADMIN = matrixFromCrmPmHr(ALL_MANAGE_CRM, ALL_MANAGE_PM, ALL_MANAGE_HR, ALL_MANAGE_REALESTATE)

/** Manager: operate CRM / PM except org-level CRM & PM settings (read-only) */
const MANAGER_CRM = {
  ...ALL_MANAGE_CRM,
  settings: ACCESS.READ,
}
const MANAGER_PM = {
  ...ALL_MANAGE_PM,
  settings: ACCESS.READ,
}
const MANAGER_HR = {
  ...ALL_MANAGE_HR,
  settings: ACCESS.READ,
}
const MANAGER_REALESTATE = {
  ...ALL_MANAGE_REALESTATE,
  settings: ACCESS.READ,
}
const MANAGER = matrixFromCrmPmHr(MANAGER_CRM, MANAGER_PM, MANAGER_HR, MANAGER_REALESTATE)

/** Member: contribute to pipeline; limited financials; operational PM */
const MEMBER_CRM = {
  dashboard: ACCESS.READ,
  leads: ACCESS.WRITE,
  companies: ACCESS.WRITE,
  contacts: ACCESS.WRITE,
  deals: ACCESS.READ,
  client_accounts: ACCESS.READ,
  client_projects: ACCESS.READ,
  client_invoices: ACCESS.NONE,
  proposals: ACCESS.NONE,
  meetings: ACCESS.WRITE,
  calendar: ACCESS.WRITE,
  analytics: ACCESS.READ,
  settings: ACCESS.NONE,
}
const MEMBER_PM = {
  dashboard: ACCESS.READ,
  projects: ACCESS.WRITE,
  tasks: ACCESS.WRITE,
  my_tasks: ACCESS.WRITE,
  inbox: ACCESS.READ,
  calendar: ACCESS.WRITE,
  analytics: ACCESS.READ,
  settings: ACCESS.NONE,
}
const MEMBER_HR = {
  dashboard: ACCESS.READ,
  employees: ACCESS.READ,
  attendance: ACCESS.READ,
  leave: ACCESS.READ,
  payroll: ACCESS.NONE,
  settings: ACCESS.NONE,
}
const MEMBER_REALESTATE = {
  dashboard: ACCESS.READ,
  leads: ACCESS.WRITE,
  pipeline: ACCESS.WRITE,
  projects: ACCESS.READ,
  site_visits: ACCESS.WRITE,
  settings: ACCESS.NONE,
}
const MEMBER = matrixFromCrmPmHr(MEMBER_CRM, MEMBER_PM, MEMBER_HR, MEMBER_REALESTATE)

function emptyMatrix() {
  const crm = { modules: {} }
  Object.keys(CRM_MODULES).forEach((k) => {
    crm.modules[k] = moduleEntry(ACCESS.READ)
  })
  const pm = { modules: {} }
  Object.keys(PM_MODULES).forEach((k) => {
    pm.modules[k] = moduleEntry(ACCESS.READ)
  })
  const hr = { modules: {} }
  Object.keys(HR_MODULES).forEach((k) => {
    hr.modules[k] = moduleEntry(ACCESS.READ)
  })
  const realestate = { modules: {} }
  Object.keys(REALESTATE_MODULES).forEach((k) => {
    realestate.modules[k] = moduleEntry(ACCESS.READ)
  })
  return { crm, pm, hr, realestate }
}

function coerceAccess(raw) {
  const v = String(raw || '').toLowerCase()
  if (v === ACCESS.MANAGE || v === ACCESS.WRITE || v === ACCESS.READ || v === ACCESS.NONE) return v
  return ACCESS.READ
}

/**
 * Merge stored JSON with schema defaults (fills missing modules).
 */
function normalizePermissions(raw) {
  const base = emptyMatrix()
  if (!raw || typeof raw !== 'object') return base
  Object.keys(CRM_MODULES).forEach((k) => {
    const mod = raw.crm?.modules?.[k]
    base.crm.modules[k] = moduleEntry(coerceAccess(mod?.access ?? mod?.level))
  })
  Object.keys(PM_MODULES).forEach((k) => {
    const mod = raw.pm?.modules?.[k]
    base.pm.modules[k] = moduleEntry(coerceAccess(mod?.access ?? mod?.level))
  })
  Object.keys(HR_MODULES).forEach((k) => {
    const mod = raw.hr?.modules?.[k]
    base.hr.modules[k] = moduleEntry(coerceAccess(mod?.access ?? mod?.level))
  })
  Object.keys(REALESTATE_MODULES).forEach((k) => {
    const mod = raw.realestate?.modules?.[k]
    base.realestate.modules[k] = moduleEntry(coerceAccess(mod?.access ?? mod?.level))
  })
  return base
}

function defaultPermissionsForSystemCode(code) {
  const c = String(code || '').toLowerCase()
  if (c === 'admin') return JSON.parse(JSON.stringify(ADMIN))
  if (c === 'manager') return JSON.parse(JSON.stringify(MANAGER))
  return JSON.parse(JSON.stringify(MEMBER))
}

/**
 * Highest access determines organization-role.accessLevel (legacy field).
 */
function deriveAccessLevel(permissions) {
  const normalized = normalizePermissions(permissions)
  let best = 0

  const rank = (a) =>
    ({
      none: 0,
      read: 1,
      write: 2,
      manage: 3,
    }[coerceAccess(a)] ?? 0)

  const scan = (modules) => {
    Object.values(modules || {}).forEach((m) => {
      const r = rank(m?.access)
      if (r > best) best = r
    })
  }

  scan(normalized.crm?.modules)
  scan(normalized.pm?.modules)
  scan(normalized.hr?.modules)
  scan(normalized.realestate?.modules)

  if (best >= 3) return 'high'
  if (best >= 2) return 'high'
  if (best >= 1) return 'medium'
  return 'basic'
}

module.exports = {
  ACCESS,
  CRM_MODULES,
  PM_MODULES,
  HR_MODULES,
  REALESTATE_MODULES,
  emptyMatrix,
  normalizePermissions,
  defaultPermissionsForSystemCode,
  deriveAccessLevel,
}
