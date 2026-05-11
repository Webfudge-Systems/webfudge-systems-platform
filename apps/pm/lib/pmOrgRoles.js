import { authService } from '@webfudge/auth'

/**
 * Organization-role kind for PM row-level rules (from active org membership).
 * Admin / Manager / Member templates use codes admin / manager / member.
 */
export function getPmOrgRoleKind() {
  const r = authService.getCurrentOrgRole()
  const code = String(r.code || '').trim().toLowerCase()
  const name = String(r.name || '').trim().toLowerCase()
  if (code === 'admin' || code.endsWith('-admin') || name === 'admin') return 'admin'
  if (code === 'manager' || name === 'manager') return 'manager'
  return 'member'
}

export function canCreateProjectsInPm() {
  return getPmOrgRoleKind() !== 'member'
}

/**
 * Admin: always. Manager: only when assigned as project manager. Member: never.
 */
export function canEditProjectInPm(project, userId) {
  if (!project || userId == null) return false
  const kind = getPmOrgRoleKind()
  if (kind === 'admin') return true
  if (kind === 'member') return false
  if (kind === 'manager') {
    const pm = project.projectManager
    const pmId = typeof pm === 'object' && pm ? pm.id : pm
    return pmId != null && Number(pmId) === Number(userId)
  }
  return false
}
