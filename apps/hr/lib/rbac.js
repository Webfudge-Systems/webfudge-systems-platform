/** Mock-phase RBAC: allow all HR routes until backend wiring. */

export function canReadHR() {
  return true
}

export function canReadCurrentHRPath() {
  return true
}
