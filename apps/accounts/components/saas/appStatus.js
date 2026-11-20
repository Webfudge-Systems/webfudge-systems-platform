import { formatDate } from '../../lib/saas'

// Plan codes are kept from the first catalogue: standard = Pro, professional = Business (G16 / W15).
export const PLAN_LABEL = { trial: 'Free trial', free: 'Free plan', standard: 'Pro', professional: 'Business', enterprise: 'Enterprise' }

export function appStatus(app) {
  if (app.access === 'locked') return { tone: 'red', label: 'Locked' }
  if (app.access === 'read_only') return { tone: 'red', label: 'Read-only' }
  if (app.state === 'trial') return { tone: 'orange', label: 'Trial' }
  if (app.cancelAtPeriodEnd) return { tone: 'neutral', label: 'Ending' }
  return { tone: 'green', label: 'Active' }
}

export function appMeta(app) {
  if (app.state === 'trial') return `${app.daysLeft} day${app.daysLeft === 1 ? '' : 's'} left · ends ${formatDate(app.endsAt)}`
  if (app.access === 'read_only') return `Locks on ${formatDate(app.lockAt)} unless you choose a plan`
  if (app.access === 'locked') return `Data kept until ${formatDate(app.deleteAfter)}`
  if (app.planCode === 'free') {
    const limits = [app.limits?.users && `${app.limits.users} users`, app.limits?.contacts && `${app.limits.contacts} contacts`].filter(Boolean)
    return limits.length ? `Free forever, up to ${limits.join(' and ')}` : 'Free forever'
  }
  if (app.cancelAtPeriodEnd) return `${app.users} users · ends ${formatDate(app.endsAt)}`
  return `${app.users} users · paid until ${formatDate(app.endsAt)}`
}
