import { authService } from '@webfudge/auth'

export type REModuleKey =
  | 'dashboard'
  | 'leads'
  | 'pipeline'
  | 'projects'
  | 'site_visits'
  | 'settings'

export const RE_ROUTE_MODULES: Array<{ prefix: string; module: REModuleKey }> = [
  { prefix: '/leads', module: 'leads' },
  { prefix: '/pipeline', module: 'pipeline' },
  { prefix: '/projects', module: 'projects' },
  { prefix: '/site-visits', module: 'site_visits' },
  { prefix: '/settings', module: 'settings' },
]

const APP_KEY = 'realestate'

export function canReadRE(moduleKey: REModuleKey): boolean {
  return authService.canRead(APP_KEY, moduleKey)
}

export function canWriteRE(moduleKey: REModuleKey): boolean {
  return authService.canWrite(APP_KEY, moduleKey)
}

export function canManageRE(moduleKey: REModuleKey): boolean {
  return authService.canManage(APP_KEY, moduleKey)
}

/** Whether the current org role is manager or admin (team oversight views). */
export function isReManagerOrAdmin(): boolean {
  const role = authService.getCurrentOrgRole()
  const code = String(role?.code || role?.name || '').toLowerCase().trim()
  if (code === 'admin' || code.endsWith('-admin') || code === 'administrator') return true
  if (code === 'manager' || code.includes('manager')) return true
  return false
}

export function reModuleForPath(pathname: string = '/'): REModuleKey {
  if (pathname === '/') return 'dashboard'
  return RE_ROUTE_MODULES.find((item) => pathname.startsWith(item.prefix))?.module || 'dashboard'
}

export function canReadCurrentREPath(pathname: string = '/'): boolean {
  return canReadRE(reModuleForPath(pathname))
}
