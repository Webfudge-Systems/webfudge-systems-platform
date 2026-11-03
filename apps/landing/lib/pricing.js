/**
 * Plans come from the API (editable in the Strapi admin), refreshed hourly.
 * The defaults below are used when the API can't be reached at build time.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_STRAPI_URL || '').replace(/\/$/, '')

export const DEFAULT_PLANS = [
  { code: 'free', name: 'Free', pricePerUserMonthly: 0, yearlyDiscountPercent: 15, maxUsers: 3, isPopular: false, description: 'Try an app with a very small team.', features: ['Up to 3 users', 'Core features', 'Email support'] },
  { code: 'standard', name: 'Standard', pricePerUserMonthly: 499, yearlyDiscountPercent: 15, isPopular: false, description: 'For small teams getting organised.', features: ['Everything in Free', 'Unlimited records', 'Roles and permissions', 'Email and chat support'] },
  { code: 'professional', name: 'Professional', pricePerUserMonthly: 999, yearlyDiscountPercent: 15, isPopular: true, description: 'For growing teams that need control.', features: ['Everything in Standard', 'Automations', 'Reports and dashboards', 'Links between your apps'] },
  { code: 'enterprise', name: 'Enterprise', pricePerUserMonthly: 1499, yearlyDiscountPercent: 15, isPopular: false, description: 'For larger teams with stricter needs.', features: ['Everything in Professional', 'Audit logs and security controls', 'Priority support', 'Onboarding help'] },
]

/** Returns { crm: plans[], pm: plans[] }. */
export async function getPlans() {
  const fallback = { crm: DEFAULT_PLANS, pm: DEFAULT_PLANS }
  if (!API_BASE) return fallback
  try {
    const res = await fetch(`${API_BASE}/api/saas/catalog`, { next: { revalidate: 3600 } })
    if (!res.ok) return fallback
    const data = await res.json()
    const byApp = Object.fromEntries((data.apps || []).filter((a) => a.plans?.length).map((a) => [a.slug, a.plans]))
    return { crm: byApp.crm || DEFAULT_PLANS, pm: byApp.pm || DEFAULT_PLANS }
  } catch {
    return fallback
  }
}
