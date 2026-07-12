const STORAGE_KEY = 'hr.payroll.compliance.filings'

function readAll() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeAll(data) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadComplianceFilings(runId) {
  if (!runId) return {}
  const all = readAll()
  return all[String(runId)] || {}
}

export function saveComplianceFiling(runId, obligationId, payload) {
  if (!runId || !obligationId) return loadComplianceFilings(runId)
  const all = readAll()
  const runKey = String(runId)
  const runFilings = { ...(all[runKey] || {}) }
  runFilings[String(obligationId)] = {
    status: 'Filed',
    reference: payload.reference || '',
    notes: payload.notes || '',
    filedAt: payload.filedAt || new Date().toISOString(),
  }
  all[runKey] = runFilings
  writeAll(all)
  return runFilings
}
