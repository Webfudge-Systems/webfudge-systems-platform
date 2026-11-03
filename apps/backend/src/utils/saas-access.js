'use strict';

/**
 * Works out what an organization may do in each app, from its subscriptions.
 *
 *   trial     — full access until trialEndsAt (14 days)
 *   then      — read-only for 7 days, then locked
 *   paid      — full access until currentPeriodEnd, then read-only for 7 days, then locked
 *   free plan — full access, no end date
 *   locked    — data is kept for 90 days after locking
 */

const DAY = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;
const READ_ONLY_DAYS = 7;
const RETENTION_DAYS = 90;

const SUB_UID = 'api::subscription.subscription';

const time = (value) => (value ? new Date(value).getTime() : null);
const daysUntil = (ms, now) => Math.max(0, Math.ceil((ms - now) / DAY));

function computeAccess(sub, now = Date.now()) {
  const base = {
    subscriptionId: sub.id,
    app: sub.app?.slug || null,
    status: sub.status,
    planCode: sub.planCode || null,
    billingCycle: sub.billingCycle || 'monthly',
    users: sub.totalUsers || 1,
    trialEndsAt: sub.trialEndsAt || null,
    currentPeriodEnd: sub.currentPeriodEnd || null,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
  };

  if (sub.status === 'suspended') return { ...base, state: 'suspended', access: 'locked' };

  let endsAt = null;
  let stateWhileOpen = 'active';
  let stateAfter = 'expired';
  if (sub.status === 'trial') {
    endsAt = time(sub.trialEndsAt) ?? time(sub.startDate) + TRIAL_DAYS * DAY;
    stateWhileOpen = 'trial';
    stateAfter = 'trial_ended';
  } else if (sub.planCode === 'free' && sub.status === 'active') {
    return { ...base, state: 'active', access: 'full', daysLeft: null };
  } else {
    endsAt = time(sub.currentPeriodEnd);
    if (sub.status === 'cancelled') stateAfter = 'cancelled';
    if (endsAt == null) return { ...base, state: sub.status === 'active' ? 'active' : 'expired', access: sub.status === 'active' ? 'full' : 'locked' };
  }

  const readOnlyUntil = endsAt + READ_ONLY_DAYS * DAY;
  if (now < endsAt) {
    return { ...base, state: stateWhileOpen, access: 'full', endsAt: new Date(endsAt), daysLeft: daysUntil(endsAt, now) };
  }
  if (now < readOnlyUntil) {
    return { ...base, state: stateAfter, access: 'read_only', endsAt: new Date(endsAt), lockAt: new Date(readOnlyUntil), daysLeft: 0, daysUntilLock: daysUntil(readOnlyUntil, now) };
  }
  return { ...base, state: stateAfter, access: 'locked', endsAt: new Date(endsAt), lockAt: new Date(readOnlyUntil), deleteAfter: new Date(readOnlyUntil + RETENTION_DAYS * DAY), daysLeft: 0 };
}

const cache = new Map();
const CACHE_MS = 20 * 1000;

/** Map of app slug → access for one organization (cached briefly). */
async function getOrgAccess(strapi, orgId) {
  const key = String(orgId);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const subs = await strapi.entityService.findMany(SUB_UID, {
    filters: { organization: orgId },
    populate: { app: { fields: ['slug', 'name'] } },
    limit: 50,
  });
  const value = {};
  for (const sub of subs) {
    if (!sub.app?.slug) continue;
    const access = computeAccess(sub);
    const current = value[sub.app.slug];
    // If there are duplicates, prefer the one that grants the most access.
    const rank = { full: 3, read_only: 2, locked: 1 };
    if (!current || rank[access.access] > rank[current.access]) value[sub.app.slug] = access;
  }
  cache.set(key, { value, expires: Date.now() + CACHE_MS });
  return value;
}

function invalidateOrgAccess(orgId) {
  cache.delete(String(orgId));
}

module.exports = {
  DAY,
  TRIAL_DAYS,
  READ_ONLY_DAYS,
  RETENTION_DAYS,
  computeAccess,
  getOrgAccess,
  invalidateOrgAccess,
};
