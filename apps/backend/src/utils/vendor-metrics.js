'use strict';

/**
 * Vendor (platform staff) metrics: every organization, subscription, payment and user on this
 * deployment, shaped for the Vendor dashboard. Pure functions over loaded rows, so they can be
 * tested without Strapi.
 *
 *   MRR — monthly value of paid, running subscriptions: plan price × seats (annual plans spread
 *         over 12 months with their discount). Free plans and trials count as 0. Excludes GST.
 *   Revenue — paid billing payments. "Net" excludes GST, "gross" includes it.
 */

const { computeAccess, DAY } = require('./saas-access');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const time = (v) => (v ? new Date(v).getTime() : null);
const relId = (v) => (v && typeof v === 'object' ? v.id : v ?? null);
const fullName = (u) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.username || (u?.email || '').split('@')[0] || '';

/** Monthly recurring value of one subscription (0 unless paid and running). */
function monthlyValue(sub, access, now = Date.now()) {
  if (!sub || sub.status !== 'active') return 0;
  if (!sub.planCode || ['free', 'trial'].includes(sub.planCode)) return 0;
  if (access && access.access !== 'full') return 0;
  const end = time(sub.currentPeriodEnd);
  if (end != null && end < now) return 0;
  const seats = Math.max(1, Number(sub.totalUsers) || 1);
  const plan = sub.plan;
  if (plan && Number(plan.pricePerUserMonthly) > 0) {
    const monthly = Number(plan.pricePerUserMonthly);
    if (sub.billingCycle === 'annual') {
      const discount = Number(plan.yearlyDiscountPercent ?? 15) / 100;
      return round2(monthly * (1 - discount) * seats);
    }
    return round2(monthly * seats);
  }
  const calculated = Number(sub.calculatedPrice) || 0;
  return round2(sub.billingCycle === 'annual' ? calculated / 12 : calculated);
}

function serializeSubscription(sub, orgName, now) {
  const access = computeAccess(sub, now);
  return {
    id: sub.id,
    organization: { id: relId(sub.organization), name: orgName || '' },
    app: sub.app ? { slug: sub.app.slug, name: sub.app.name, color: sub.app.color || null } : null,
    planCode: sub.planCode || null,
    planName: sub.plan?.name || (sub.planCode === 'trial' ? 'Trial' : sub.planCode || null),
    status: sub.status,
    state: access.state,
    access: access.access,
    billingCycle: sub.billingCycle || 'monthly',
    users: sub.totalUsers || 1,
    mrr: monthlyValue(sub, access, now),
    trialEndsAt: sub.trialEndsAt || null,
    currentPeriodStart: sub.currentPeriodStart || null,
    currentPeriodEnd: sub.currentPeriodEnd || null,
    endsAt: access.endsAt || null,
    lockAt: access.lockAt || null,
    daysLeft: access.daysLeft ?? null,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    autoRenew: sub.autoRenew !== false,
    startDate: sub.startDate || sub.createdAt || null,
    lastPaymentDate: sub.lastPaymentDate || null,
    createdAt: sub.createdAt || null,
  };
}

function serializePayment(p, orgName) {
  return {
    id: p.id,
    invoiceNumber: p.invoiceNumber || null,
    organization: { id: relId(p.organization), name: orgName || '' },
    subscriptionId: relId(p.subscription),
    app: p.app ? { slug: p.app.slug, name: p.app.name, color: p.app.color || null } : null,
    planCode: p.planCode || null,
    billingCycle: p.billingCycle || null,
    users: p.users || null,
    kind: p.kind || 'new',
    subtotal: round2(p.amountSubtotal),
    tax: round2(p.taxAmount),
    total: round2(p.amountTotal),
    currency: p.currency || 'INR',
    status: p.status,
    paidAt: p.paidAt || null,
    createdAt: p.createdAt || null,
    razorpayPaymentId: p.razorpayPaymentId || null,
  };
}

/** Where an organization is in its life cycle, from its subscriptions. */
function orgStage(org, subs) {
  if (org.status === 'suspended' || (subs.length && subs.every((s) => s.state === 'suspended'))) return 'suspended';
  if (!subs.length) return 'no_apps';
  if (subs.some((s) => s.mrr > 0)) return 'paying';
  if (subs.some((s) => s.state === 'trial' && s.access === 'full')) return 'trial';
  if (subs.some((s) => s.planCode === 'free' && s.access === 'full')) return 'free';
  if (subs.some((s) => s.access === 'read_only')) return 'at_risk';
  return 'churned';
}

function subNeedsAttention(s) {
  return (
    s.access === 'read_only' ||
    s.status === 'past_due' ||
    (s.cancelAtPeriodEnd && s.access === 'full') ||
    (s.state === 'trial' && s.daysLeft != null && s.daysLeft <= 3)
  );
}

/**
 * Builds the whole dataset from raw rows.
 * @param {{ orgs, subs, payments, memberships, users, invitations }} raw
 */
function buildDataset(raw, now = Date.now()) {
  const orgName = new Map(raw.orgs.map((o) => [String(o.id), o.name]));
  const subscriptions = raw.subs
    .filter((s) => relId(s.organization) != null)
    .map((s) => serializeSubscription(s, orgName.get(String(relId(s.organization))), now));
  const payments = raw.payments.map((p) => serializePayment(p, orgName.get(String(relId(p.organization)))));

  const byOrg = (rows, key = (r) => r.organization.id) => {
    const map = new Map();
    for (const row of rows) {
      const k = String(key(row));
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(row);
    }
    return map;
  };
  const subsByOrg = byOrg(subscriptions);
  const paymentsByOrg = byOrg(payments);
  const membersByOrg = byOrg(raw.memberships.filter((m) => relId(m.organization) != null), (m) => relId(m.organization));
  const invitesByOrg = byOrg(raw.invitations.filter((i) => relId(i.organization) != null), (i) => relId(i.organization));

  const organizations = raw.orgs.map((org) => {
    const key = String(org.id);
    const subs = subsByOrg.get(key) || [];
    const pays = paymentsByOrg.get(key) || [];
    const members = (membersByOrg.get(key) || []).filter((m) => m.isActive !== false);
    const paid = pays.filter((p) => p.status === 'paid');
    const lastActive = members.reduce((max, m) => Math.max(max, time(m.lastAccessAt) || 0), 0);
    const owner = org.owner && typeof org.owner === 'object' ? org.owner : null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      companyEmail: org.companyEmail || null,
      companyPhone: org.companyPhone || null,
      website: org.website || null,
      industry: org.industry || null,
      size: org.size || null,
      status: org.status || 'trial',
      onboardingCompleted: Boolean(org.onboardingCompleted),
      createdAt: org.createdAt || null,
      owner: owner ? { id: owner.id, name: fullName(owner), email: owner.email || '' } : null,
      memberCount: members.length,
      pendingInvites: (invitesByOrg.get(key) || []).filter(
        (i) => i.status === 'pending' && (!i.expiresAt || time(i.expiresAt) > now)
      ).length,
      apps: subs.map((s) => ({
        subscriptionId: s.id,
        slug: s.app?.slug,
        name: s.app?.name,
        color: s.app?.color,
        planCode: s.planCode,
        planName: s.planName,
        state: s.state,
        access: s.access,
        users: s.users,
        daysLeft: s.daysLeft,
        mrr: s.mrr,
      })),
      mrr: round2(subs.reduce((sum, s) => sum + s.mrr, 0)),
      seats: subs.filter((s) => s.mrr > 0).reduce((sum, s) => sum + s.users, 0),
      lifetimeRevenue: round2(paid.reduce((sum, p) => sum + p.subtotal, 0)),
      lastPaymentAt: paid.reduce((max, p) => Math.max(max, time(p.paidAt) || 0), 0) || null,
      lastActiveAt: lastActive ? new Date(lastActive).toISOString() : null,
      stage: orgStage(org, subs),
      atRisk: subs.some(subNeedsAttention),
    };
  });

  const orgsByUser = new Map();
  const orgOwner = new Map(raw.orgs.map((o) => [String(o.id), String(relId(o.owner) ?? '')]));
  for (const m of raw.memberships) {
    const uid = relId(m.user);
    const oid = relId(m.organization);
    if (uid == null || oid == null) continue;
    const k = String(uid);
    if (!orgsByUser.has(k)) orgsByUser.set(k, []);
    orgsByUser.get(k).push({
      id: oid,
      name: orgName.get(String(oid)) || '',
      role: m.role?.name || null,
      isOwner: orgOwner.get(String(oid)) === k,
      isActive: m.isActive !== false,
      lastAccessAt: m.lastAccessAt || null,
      joinedAt: m.joinedAt || null,
    });
  }

  const users = raw.users.map((u) => {
    const orgs = orgsByUser.get(String(u.id)) || [];
    const lastAccess = orgs.reduce((max, o) => Math.max(max, time(o.lastAccessAt) || 0), 0);
    return {
      id: u.id,
      name: fullName(u),
      email: u.email || '',
      confirmed: Boolean(u.confirmed),
      blocked: Boolean(u.blocked),
      provider: u.provider || 'local',
      createdAt: u.createdAt || null,
      lastAccessAt: lastAccess ? new Date(lastAccess).toISOString() : null,
      organizations: orgs,
    };
  });

  return { organizations, subscriptions, payments, users };
}

/* ───────────────────────── time buckets ───────────────────────── */

const RANGES = {
  '30d': { days: 30, unit: 'day' },
  '90d': { days: 90, unit: 'week' },
  '6m': { months: 6, unit: 'month' },
  '12m': { months: 12, unit: 'month' },
  all: { unit: 'month' },
};

function startOfUnit(ms, unit) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  if (unit === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (unit === 'month') d.setDate(1);
  return d;
}

function nextUnit(d, unit) {
  const n = new Date(d);
  if (unit === 'day') n.setDate(n.getDate() + 1);
  else if (unit === 'week') n.setDate(n.getDate() + 7);
  else n.setMonth(n.getMonth() + 1);
  return n;
}

function bucketLabel(d, unit) {
  if (unit === 'month') return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Resolves a range key into { from, to, unit, buckets[] }. */
function resolveRange(key, earliest, now = Date.now()) {
  const def = RANGES[key] || RANGES['12m'];
  let from;
  if (def.days) from = now - def.days * DAY;
  else if (def.months) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - def.months + 1);
    from = d.getTime();
  } else from = earliest || now - 365 * DAY;
  const unit = def.unit;
  const buckets = [];
  for (let d = startOfUnit(from, unit); d.getTime() <= now; d = nextUnit(d, unit)) {
    buckets.push({ start: d.getTime(), end: nextUnit(d, unit).getTime(), label: bucketLabel(d, unit) });
  }
  return { key: RANGES[key] ? key : '12m', from: buckets[0]?.start ?? from, to: now, unit, buckets };
}

function bucketIndex(buckets, ms) {
  if (ms == null) return -1;
  for (let i = buckets.length - 1; i >= 0; i -= 1) {
    if (ms >= buckets[i].start && ms < buckets[i].end) return i;
  }
  return -1;
}

const countBy = (rows, fn) =>
  rows.reduce((acc, row) => {
    const k = fn(row);
    if (k == null) return acc;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

const sumBy = (rows, keyFn, valFn) =>
  rows.reduce((acc, row) => {
    const k = keyFn(row);
    if (k == null) return acc;
    acc[k] = round2((acc[k] || 0) + valFn(row));
    return acc;
  }, {});

/* ───────────────────────── overview ───────────────────────── */

function pctChange(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Trial → paid conversion over subscriptions whose trial is over. */
function conversion(subscriptions, payments) {
  const converted = new Set(
    payments.filter((p) => p.status === 'paid' && p.subscriptionId != null).map((p) => String(p.subscriptionId))
  );
  const now = Date.now();
  let eligible = 0;
  let won = 0;
  for (const s of subscriptions) {
    if (s.planCode === 'free') continue;
    const paid = converted.has(String(s.id));
    const trialOver = s.state !== 'trial' && (time(s.trialEndsAt) || 0) < now;
    if (paid || trialOver) eligible += 1;
    if (paid) won += 1;
  }
  return { eligible, converted: won, rate: eligible ? Math.round((won / eligible) * 1000) / 10 : null };
}

function overview(ds, apps, now = Date.now()) {
  const { organizations, subscriptions, payments, users } = ds;
  const d30 = now - 30 * DAY;
  const d60 = now - 60 * DAY;
  const inWindow = (v, from, to = now) => {
    const t = time(v);
    return t != null && t >= from && t < to;
  };
  const paid = payments.filter((p) => p.status === 'paid');
  const revenue30 = paid.filter((p) => inWindow(p.paidAt, d30)).reduce((s, p) => s + p.subtotal, 0);
  const revenuePrev = paid.filter((p) => inWindow(p.paidAt, d60, d30)).reduce((s, p) => s + p.subtotal, 0);
  const newOrgs = organizations.filter((o) => inWindow(o.createdAt, d30)).length;
  const newOrgsPrev = organizations.filter((o) => inWindow(o.createdAt, d60, d30)).length;
  const newUsers = users.filter((u) => inWindow(u.createdAt, d30)).length;
  const mrr = round2(subscriptions.reduce((s, x) => s + x.mrr, 0));
  const payingOrgs = organizations.filter((o) => o.stage === 'paying').length;

  const range = resolveRange('12m', null, now);
  const revenueByMonth = range.buckets.map((b) => ({ label: b.label, total: 0 }));
  for (const p of paid) {
    const i = bucketIndex(range.buckets, time(p.paidAt));
    if (i < 0) continue;
    const slug = p.app?.slug || 'other';
    revenueByMonth[i][slug] = round2((revenueByMonth[i][slug] || 0) + p.subtotal);
    revenueByMonth[i].total = round2(revenueByMonth[i].total + p.subtotal);
  }
  const growthByMonth = range.buckets.map((b) => ({ label: b.label, organizations: 0, users: 0 }));
  for (const o of organizations) {
    const i = bucketIndex(range.buckets, time(o.createdAt));
    if (i >= 0) growthByMonth[i].organizations += 1;
  }
  for (const u of users) {
    const i = bucketIndex(range.buckets, time(u.createdAt));
    if (i >= 0) growthByMonth[i].users += 1;
  }

  const appAdoption = apps.map((app) => {
    const subs = subscriptions.filter((s) => s.app?.slug === app.slug);
    return {
      slug: app.slug,
      name: app.name,
      color: app.color,
      availability: app.availability,
      total: subs.length,
      paying: subs.filter((s) => s.mrr > 0).length,
      trial: subs.filter((s) => s.state === 'trial' && s.access === 'full').length,
      free: subs.filter((s) => s.planCode === 'free' && s.access === 'full').length,
      readOnly: subs.filter((s) => s.access === 'read_only').length,
      locked: subs.filter((s) => s.access === 'locked').length,
      mrr: round2(subs.reduce((sum, s) => sum + s.mrr, 0)),
      seats: subs.filter((s) => s.mrr > 0).reduce((sum, s) => sum + s.users, 0),
    };
  });

  const planMix = Object.entries(
    countBy(
      subscriptions.filter((s) => s.access === 'full'),
      (s) => (s.state === 'trial' ? 'Trial' : s.planName || s.planCode)
    )
  ).map(([name, value]) => ({ name, value }));

  const stageCounts = countBy(organizations, (o) => o.stage);

  return {
    generatedAt: new Date(now).toISOString(),
    kpis: {
      organizations: organizations.length,
      newOrganizations30d: newOrgs,
      newOrganizationsChange: pctChange(newOrgs, newOrgsPrev),
      payingOrganizations: payingOrgs,
      activeTrials: subscriptions.filter((s) => s.state === 'trial' && s.access === 'full').length,
      mrr,
      arr: round2(mrr * 12),
      arpa: payingOrgs ? round2(mrr / payingOrgs) : 0,
      revenue30d: round2(revenue30),
      revenueChange: pctChange(revenue30, revenuePrev),
      users: users.length,
      newUsers30d: newUsers,
      paidSeats: subscriptions.filter((s) => s.mrr > 0).reduce((sum, s) => sum + s.users, 0),
      atRiskOrganizations: organizations.filter((o) => o.atRisk).length,
      lifetimeRevenue: round2(paid.reduce((s, p) => s + p.subtotal, 0)),
      conversion: conversion(subscriptions, payments),
    },
    stageCounts,
    revenueByMonth,
    growthByMonth,
    appAdoption,
    planMix,
    trialsEndingSoon: subscriptions
      .filter((s) => s.state === 'trial' && s.access === 'full' && s.daysLeft != null && s.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8),
    attention: subscriptions
      .filter(subNeedsAttention)
      .filter((s) => !(s.state === 'trial' && s.access === 'full'))
      .sort((a, b) => (time(a.lockAt || a.endsAt) || 0) - (time(b.lockAt || b.endsAt) || 0))
      .slice(0, 8),
    recentOrganizations: [...organizations]
      .sort((a, b) => (time(b.createdAt) || 0) - (time(a.createdAt) || 0))
      .slice(0, 6),
    recentPayments: [...payments]
      .filter((p) => p.status !== 'created')
      .sort((a, b) => (time(b.paidAt || b.createdAt) || 0) - (time(a.paidAt || a.createdAt) || 0))
      .slice(0, 6),
  };
}

/* ───────────────────────── reports ───────────────────────── */

function report(ds, apps, rangeKey, now = Date.now()) {
  const { organizations, subscriptions, payments, users } = ds;
  const earliest = Math.min(
    ...[...organizations.map((o) => time(o.createdAt)), ...payments.map((p) => time(p.createdAt))].filter(Boolean),
    now
  );
  const range = resolveRange(rangeKey, earliest, now);
  const inRange = (v) => {
    const t = time(v);
    return t != null && t >= range.from && t <= range.to;
  };

  const paidInRange = payments.filter((p) => p.status === 'paid' && inRange(p.paidAt));
  const failedInRange = payments.filter((p) => p.status === 'failed' && inRange(p.createdAt));
  const orgsInRange = organizations.filter((o) => inRange(o.createdAt));
  const usersInRange = users.filter((u) => inRange(u.createdAt));
  const trialsInRange = subscriptions.filter((s) => s.planCode !== 'free' && inRange(s.startDate));

  // First paid "new" payment per subscription = a conversion.
  const firstPaid = new Map();
  for (const p of payments.filter((x) => x.status === 'paid' && x.subscriptionId != null)) {
    const k = String(p.subscriptionId);
    const prev = firstPaid.get(k);
    if (!prev || time(p.paidAt) < time(prev.paidAt)) firstPaid.set(k, p);
  }
  const conversions = [...firstPaid.values()].filter((p) => inRange(p.paidAt));

  const churned = subscriptions.filter(
    (s) => ['expired', 'cancelled', 'trial_ended'].includes(s.state) && s.access === 'locked' && inRange(s.lockAt)
  );
  const churnedPaid = churned.filter((s) => s.state !== 'trial_ended');

  const series = range.buckets.map((b) => ({
    label: b.label,
    revenue: 0,
    gst: 0,
    organizations: 0,
    users: 0,
    trials: 0,
    conversions: 0,
    churned: 0,
  }));
  const add = (rows, getTime, field, value = () => 1) => {
    for (const row of rows) {
      const i = bucketIndex(range.buckets, time(getTime(row)));
      if (i >= 0) series[i][field] = round2(series[i][field] + value(row));
    }
  };
  add(paidInRange, (p) => p.paidAt, 'revenue', (p) => p.subtotal);
  add(paidInRange, (p) => p.paidAt, 'gst', (p) => p.tax);
  add(orgsInRange, (o) => o.createdAt, 'organizations');
  add(usersInRange, (u) => u.createdAt, 'users');
  add(trialsInRange, (s) => s.startDate, 'trials');
  add(conversions, (p) => p.paidAt, 'conversions');
  add(churned, (s) => s.lockAt, 'churned');
  for (const p of paidInRange) {
    const i = bucketIndex(range.buckets, time(p.paidAt));
    const slug = p.app?.slug || 'other';
    if (i >= 0) series[i][`app_${slug}`] = round2((series[i][`app_${slug}`] || 0) + p.subtotal);
  }

  const net = paidInRange.reduce((s, p) => s + p.subtotal, 0);
  const gst = paidInRange.reduce((s, p) => s + p.tax, 0);
  const mrr = subscriptions.reduce((s, x) => s + x.mrr, 0);
  const payingOrgs = organizations.filter((o) => o.stage === 'paying').length;
  const revenueByOrg = sumBy(paidInRange, (p) => p.organization.id, (p) => p.subtotal);
  const orgById = new Map(organizations.map((o) => [String(o.id), o]));
  const appName = (slug) => apps.find((a) => a.slug === slug)?.name || slug;

  const toRows = (obj, labelFn = (k) => k) =>
    Object.entries(obj)
      .map(([key, value]) => ({ key, name: labelFn(key), value }))
      .sort((a, b) => b.value - a.value);

  return {
    range: { key: range.key, from: new Date(range.from).toISOString(), to: new Date(range.to).toISOString(), unit: range.unit },
    apps: apps.map((a) => ({ slug: a.slug, name: a.name, color: a.color })),
    totals: {
      netRevenue: round2(net),
      gst: round2(gst),
      grossRevenue: round2(net + gst),
      payments: paidInRange.length,
      failedPayments: failedInRange.length,
      averageOrderValue: paidInRange.length ? round2(net / paidInRange.length) : 0,
      newOrganizations: orgsInRange.length,
      newUsers: usersInRange.length,
      trialsStarted: trialsInRange.length,
      conversions: conversions.length,
      conversionRate: trialsInRange.length ? Math.round((conversions.length / trialsInRange.length) * 1000) / 10 : null,
      churnedSubscriptions: churned.length,
      churnedPaidSubscriptions: churnedPaid.length,
      mrr: round2(mrr),
      arr: round2(mrr * 12),
      arpa: payingOrgs ? round2(mrr / payingOrgs) : 0,
      payingOrganizations: payingOrgs,
    },
    series,
    revenueByApp: toRows(sumBy(paidInRange, (p) => p.app?.slug || 'other', (p) => p.subtotal), appName),
    revenueByPlan: toRows(sumBy(paidInRange, (p) => p.planCode || 'other', (p) => p.subtotal)),
    revenueByCycle: toRows(sumBy(paidInRange, (p) => p.billingCycle || 'monthly', (p) => p.subtotal)),
    revenueByKind: toRows(sumBy(paidInRange, (p) => p.kind || 'new', (p) => p.subtotal)),
    mrrByApp: toRows(sumBy(subscriptions.filter((s) => s.mrr > 0), (s) => s.app?.slug || 'other', (s) => s.mrr), appName),
    organizationsByIndustry: toRows(countBy(organizations, (o) => o.industry || 'unspecified')),
    organizationsBySize: toRows(countBy(organizations, (o) => o.size || 'unspecified')),
    organizationsByStage: toRows(countBy(organizations, (o) => o.stage)),
    topOrganizations: Object.entries(revenueByOrg)
      .map(([id, value]) => {
        const org = orgById.get(String(id));
        return {
          id: Number(id),
          name: org?.name || `#${id}`,
          stage: org?.stage || null,
          apps: (org?.apps || []).map((a) => a.name).filter(Boolean),
          seats: org?.seats || 0,
          mrr: org?.mrr || 0,
          revenue: value,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
  };
}

module.exports = {
  RANGES,
  monthlyValue,
  orgStage,
  buildDataset,
  resolveRange,
  overview,
  report,
};
