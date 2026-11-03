import { formatDate } from '../../lib/saas'

export const PLAN_LABEL = { trial: 'Free trial', free: 'Free plan', standard: 'Standard', professional: 'Professional', enterprise: 'Enterprise' }

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
  if (app.planCode === 'free') return 'Free forever, up to 3 users'
  if (app.cancelAtPeriodEnd) return `${app.users} users · ends ${formatDate(app.endsAt)}`
  return `${app.users} users · paid until ${formatDate(app.endsAt)}`
}
