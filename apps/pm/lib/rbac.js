import { authService } from '@webfudge/auth'

export const PM_ROUTE_MODULES = [
  { prefix: '/projects', module: 'projects' },
  { prefix: '/tasks', module: 'tasks' },
  { prefix: '/my-tasks', module: 'my_tasks' },
  { prefix: '/inbox', module: 'inbox' },
  { prefix: '/message', module: 'inbox' },
  { prefix: '/calendar', module: 'calendar' },
  { prefix: '/analytics', module: 'analytics' },
  { prefix: '/settings', module: 'settings' },
]

export function canReadPM(moduleKey) {
  return authService.canRead('pm', moduleKey)
}

export function canWritePM(moduleKey) {
  return authService.canWrite('pm', moduleKey)
}

export function canManagePM(moduleKey) {
  return authService.canManage('pm', moduleKey)
}

export function pmModuleForPath(pathname = '/') {
  if (pathname === '/') return 'dashboard'
  return PM_ROUTE_MODULES.find((item) => pathname.startsWith(item.prefix))?.module || 'dashboard'
}

export function canReadCurrentPMPath(pathname = '/') {
  return canReadPM(pmModuleForPath(pathname))
}
