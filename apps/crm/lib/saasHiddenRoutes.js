import { IS_SAAS_PLATFORM } from '@webfudge/ui'

/**
 * Placeholder / fake screens hidden from paying SaaS customers until the real feature ships (ticket GF3).
 * Internal deployment is unchanged. Remove an entry when its feature ticket lands:
 * /analytics + Reports → G15, /automations → P6, /settings → GF4, Log Call → G17, Send WhatsApp → Connect.
 */
const HIDDEN_PREFIXES = ['/coming-soon', '/analytics', '/automations', '/settings']

/** Exact paths that should send SaaS users somewhere useful instead. */
const REDIRECTS = { '/clients': '/clients/accounts' }

function pathOf(href) {
  return String(href || '').split('?')[0].split('#')[0]
}

/** True when this link/route must not be shown in the SaaS build. */
export function isHiddenInSaas(href) {
  if (!IS_SAAS_PLATFORM || !href) return false
  const path = pathOf(href)
  return HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

/** Where to send a SaaS user who lands on a hidden route, or null to stay. */
export function saasRedirectFor(pathname) {
  if (!IS_SAAS_PLATFORM) return null
  const path = pathOf(pathname)
  if (REDIRECTS[path]) return REDIRECTS[path]
  return isHiddenInSaas(path) ? '/' : null
}
