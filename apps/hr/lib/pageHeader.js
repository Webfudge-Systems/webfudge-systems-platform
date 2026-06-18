/** Dashboard header helpers — aligned with PM `app/page.js` */

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export function getCurrentDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function resolveDashboardUserName(user) {
  const userAttrs = user?.attributes || user
  const email = userAttrs?.email || user?.email || ''
  return email.split('@')[0] || 'User'
}

export function buildDashboardTitle(user) {
  return `${getGreeting()}, ${resolveDashboardUserName(user)}`
}

/** Root breadcrumb for HR inner pages — mirrors PM `{ label: 'PM', href: '/' }`. */
export const HR_ROOT_BREADCRUMB = { label: 'HR', href: '/dashboard' }
