import { IS_SAAS_PLATFORM } from '@webfudge/ui'

/**
 * Placeholder screens hidden from paying SaaS customers until the real feature ships (ticket WF2).
 * Internal deployment is unchanged. Remove an entry when its feature ticket lands:
 * /analytics + Reports → W11 (dashboards), Documents → W8 (docs/wiki).
 */
const HIDDEN_PREFIXES = ['/coming-soon', '/analytics']

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
  return isHiddenInSaas(pathname) ? '/' : null
}
