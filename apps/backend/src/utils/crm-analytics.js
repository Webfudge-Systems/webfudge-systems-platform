'use strict';

/**
 * Grow analytics (ticket G15): funnel, source ROI, rep leaderboard, pipeline forecast, lost reasons, SLA.
 * All numbers are scoped to one org and optionally to a set of owners (a rep, or a department's members).
 *
 * Date range rules:
 *   - leads / deals "created" in range use createdAt
 *   - won / lost in range use closedAt (falls back to updatedAt for deals closed before closedAt existed)
 *   - forecast and open pipeline are "as of now" (open deals, not range-bound)
 */

const LEAD_UID = 'api::lead-company.lead-company';
const DEAL_UID = 'api::deal.deal';
const MAX_ROWS = 20000;
const QUALIFIED = new Set(['QUALIFIED', 'CONVERTED', 'CLIENT']);

const relId = (v) => (v == null ? null : typeof v === 'object' ? v.id ?? null : Number(v));
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ts = (v) => (v ? new Date(v).getTime() : NaN);
const round2 = (n) => Math.round(n * 100) / 100;

/** Owner ids for a department (members linked to it), or null when no team filter. */
async function departmentMemberIds(strapi, orgId, departmentId) {
  const rows = await strapi.db.query('api::organization-user.organization-user').findMany({
    where: { organization: orgId, departments: { id: departmentId } },
    populate: { user: { select: ['id'] } },
    limit: 2000,
  });
  return rows.map((r) => r.user?.id).filter(Boolean).map(Number);
}

async function userNames(strapi, ids) {
  if (!ids.length) return new Map();
  const users = await strapi.db.query('plugin::users-permissions.user').findMany({
    where: { id: { $in: ids } },
    select: ['id', 'username', 'email', 'firstName', 'lastName'],
  });
  return new Map(
    users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || `User #${u.id}`])
  );
}

/**
 * @param {{ orgId: number, from: Date, to: Date, ownerIds: number[]|null }} opts
 */
async function buildAnalytics(strapi, { orgId, from, to, ownerIds }) {
  const fromT = from.getTime();
  const toT = to.getTime();
  const inRange = (v) => {
    const t = ts(v);
    return Number.isFinite(t) && t >= fromT && t <= toT;
  };
  const ownerWhere = ownerIds ? { assignedTo: { id: { $in: ownerIds.length ? ownerIds : [-1] } } } : {};

  const [leads, deals] = await Promise.all([
    strapi.db.query(LEAD_UID).findMany({
      where: { organization: orgId, ...ownerWhere },
      select: ['id', 'source', 'status', 'createdAt', 'firstContactDueAt', 'firstContactedAt', 'slaBreachedAt'],
      populate: { assignedTo: { select: ['id'] } },
      limit: MAX_ROWS,
    }),
    strapi.db.query(DEAL_UID).findMany({
      where: { organization: orgId, ...ownerWhere },
      select: ['id', 'name', 'value', 'stage', 'probability', 'source', 'createdAt', 'updatedAt', 'closedAt', 'lostReason', 'expectedCloseDate'],
      populate: { assignedTo: { select: ['id'] }, leadCompany: { select: ['id', 'source'] } },
      limit: MAX_ROWS,
    }),
  ]);

  const closedAt = (d) => d.closedAt || d.updatedAt;
  const isWon = (d) => d.stage === 'won';
  const isLost = (d) => d.stage === 'lost';
  const isOpen = (d) => !isWon(d) && !isLost(d);
  const dealSource = (d) => d.leadCompany?.source || d.source || 'OTHER';

  const leadsInRange = leads.filter((l) => inRange(l.createdAt));
  const dealsInRange = deals.filter((d) => inRange(d.createdAt));
  const wonInRange = deals.filter((d) => isWon(d) && inRange(closedAt(d)));
  const lostInRange = deals.filter((d) => isLost(d) && inRange(closedAt(d)));
  const openDeals = deals.filter(isOpen);
  const sum = (rows, f = (d) => num(d.value)) => rows.reduce((a, r) => a + f(r), 0);

  // ---- Funnel (a lead with a deal counts as contacted and qualified, so the funnel never widens)
  const leadsWithDeal = new Set(deals.map((d) => d.leadCompany?.id).filter(Boolean));
  const contacted = leadsInRange.filter(
    (l) => l.firstContactedAt || String(l.status || 'NEW').toUpperCase() !== 'NEW' || leadsWithDeal.has(l.id)
  );
  const qualified = leadsInRange.filter((l) => QUALIFIED.has(String(l.status || '').toUpperCase()) || leadsWithDeal.has(l.id));
  const funnel = [
    { key: 'leads', label: 'Leads created', count: leadsInRange.length },
    { key: 'contacted', label: 'Contacted', count: contacted.length },
    { key: 'qualified', label: 'Qualified', count: qualified.length },
    { key: 'deals', label: 'Deals created', count: dealsInRange.length, value: round2(sum(dealsInRange)) },
    { key: 'won', label: 'Deals won', count: wonInRange.length, value: round2(sum(wonInRange)) },
  ];
  const stageMap = new Map();
  for (const d of openDeals) {
    const k = d.stage || 'discovery';
    const row = stageMap.get(k) || { stage: k, count: 0, value: 0 };
    row.count += 1;
    row.value += num(d.value);
    stageMap.set(k, row);
  }
  const openByStage = [...stageMap.values()].map((r) => ({ ...r, value: round2(r.value) }));

  // ---- Source ROI
  const src = new Map();
  const srcRow = (k) => {
    const key = k || 'OTHER';
    if (!src.has(key)) src.set(key, { source: key, leads: 0, deals: 0, won: 0, revenue: 0, pipeline: 0 });
    return src.get(key);
  };
  for (const l of leadsInRange) srcRow(l.source).leads += 1;
  for (const d of dealsInRange) srcRow(dealSource(d)).deals += 1;
  for (const d of wonInRange) {
    const r = srcRow(dealSource(d));
    r.won += 1;
    r.revenue += num(d.value);
  }
  for (const d of openDeals) srcRow(dealSource(d)).pipeline += num(d.value);
  const sources = [...src.values()]
    .map((r) => ({
      ...r,
      revenue: round2(r.revenue),
      pipeline: round2(r.pipeline),
      leadToWonRate: r.leads ? round2((r.won / r.leads) * 100) : null,
      avgDealSize: r.won ? round2(r.revenue / r.won) : null,
    }))
    .filter((r) => r.leads || r.deals || r.won || r.pipeline)
    .sort((a, b) => b.revenue - a.revenue || b.won - a.won || b.leads - a.leads);

  // ---- Leaderboard
  const reps = new Map();
  const repRow = (id) => {
    const key = id || 0;
    if (!reps.has(key)) reps.set(key, { userId: id || null, leads: 0, deals: 0, won: 0, lost: 0, revenue: 0, openPipeline: 0, contacted: 0, slaBreaches: 0 });
    return reps.get(key);
  };
  for (const l of leadsInRange) {
    const r = repRow(relId(l.assignedTo));
    r.leads += 1;
    if (l.firstContactedAt || String(l.status || 'NEW').toUpperCase() !== 'NEW' || leadsWithDeal.has(l.id)) r.contacted += 1;
  }
  for (const d of dealsInRange) repRow(relId(d.assignedTo)).deals += 1;
  for (const d of wonInRange) {
    const r = repRow(relId(d.assignedTo));
    r.won += 1;
    r.revenue += num(d.value);
  }
  for (const d of lostInRange) repRow(relId(d.assignedTo)).lost += 1;
  for (const d of openDeals) repRow(relId(d.assignedTo)).openPipeline += num(d.value);

  // ---- SLA
  const now = Date.now();
  const tracked = leadsInRange.filter((l) => l.firstContactDueAt);
  let onTime = 0;
  let late = 0;
  let openBreached = 0;
  let pending = 0;
  const contactMins = [];
  for (const l of tracked) {
    const due = ts(l.firstContactDueAt);
    const c = ts(l.firstContactedAt);
    if (Number.isFinite(c)) {
      contactMins.push((c - ts(l.createdAt)) / 60000);
      if (c <= due) onTime += 1;
      else {
        late += 1;
        repRow(relId(l.assignedTo)).slaBreaches += 1;
      }
    } else if (due < now) {
      openBreached += 1;
      repRow(relId(l.assignedTo)).slaBreaches += 1;
    } else pending += 1;
  }
  const decided = onTime + late + openBreached;
  const sla = {
    tracked: tracked.length,
    onTime,
    late,
    openBreached,
    pending,
    onTimeRate: decided ? round2((onTime / decided) * 100) : null,
    avgFirstContactMinutes: contactMins.length ? Math.round(contactMins.reduce((a, b) => a + b, 0) / contactMins.length) : null,
  };

  const names = await userNames(strapi, [...reps.keys()].filter(Boolean));
  const leaderboard = [...reps.values()]
    .map((r) => ({
      ...r,
      name: r.userId ? names.get(r.userId) || `User #${r.userId}` : 'Unassigned',
      revenue: round2(r.revenue),
      openPipeline: round2(r.openPipeline),
      winRate: r.won + r.lost ? round2((r.won / (r.won + r.lost)) * 100) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.won - a.won || b.leads - a.leads);

  // ---- Forecast (open deals, as of now)
  const months = new Map();
  const monthKey = (d) => {
    if (!d.expectedCloseDate) return 'no-date';
    const dt = new Date(`${String(d.expectedCloseDate).slice(0, 10)}T00:00:00`);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    if (dt < startOfMonth) return 'overdue';
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  };
  for (const d of openDeals) {
    const k = monthKey(d);
    const row = months.get(k) || { month: k, count: 0, value: 0, weighted: 0 };
    row.count += 1;
    row.value += num(d.value);
    row.weighted += (num(d.value) * Math.min(100, Math.max(0, num(d.probability)))) / 100;
    months.set(k, row);
  }
  const order = (k) => (k === 'overdue' ? '0' : k === 'no-date' ? '9' : `1${k}`);
  const forecast = {
    openDeals: openDeals.length,
    pipelineValue: round2(sum(openDeals)),
    weightedValue: round2(sum(openDeals, (d) => (num(d.value) * Math.min(100, Math.max(0, num(d.probability)))) / 100)),
    byMonth: [...months.values()]
      .sort((a, b) => order(a.month).localeCompare(order(b.month)))
      .map((r) => ({ ...r, value: round2(r.value), weighted: round2(r.weighted) })),
  };

  // ---- Lost reasons
  const lost = new Map();
  for (const d of lostInRange) {
    const k = (d.lostReason && String(d.lostReason).trim()) || 'Not recorded';
    const row = lost.get(k) || { reason: k, count: 0, value: 0 };
    row.count += 1;
    row.value += num(d.value);
    lost.set(k, row);
  }
  const lostReasons = [...lost.values()].map((r) => ({ ...r, value: round2(r.value) })).sort((a, b) => b.count - a.count || b.value - a.value);

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      leads: leadsInRange.length,
      dealsCreated: dealsInRange.length,
      won: wonInRange.length,
      lost: lostInRange.length,
      revenue: round2(sum(wonInRange)),
      winRate: wonInRange.length + lostInRange.length ? round2((wonInRange.length / (wonInRange.length + lostInRange.length)) * 100) : null,
      pipelineValue: forecast.pipelineValue,
      weightedValue: forecast.weightedValue,
      topSource: sources.find((s) => s.revenue > 0)?.source || null,
    },
    funnel,
    openByStage,
    sources,
    leaderboard,
    forecast,
    lostReasons,
    sla,
  };
}

/** Deal close bookkeeping: closedAt when the stage becomes won/lost; lostReason only kept on lost deals. */
function applyDealClosure(data, existing) {
  delete data.closedAt;
  const prev = existing?.stage;
  const changed = data.stage !== undefined && data.stage !== prev;
  const next = data.stage !== undefined ? data.stage : prev;
  if (changed) data.closedAt = next === 'won' || next === 'lost' ? new Date().toISOString() : null;
  if (next === 'lost') {
    if (data.lostReason !== undefined) {
      const r = String(data.lostReason ?? '').trim().slice(0, 120);
      data.lostReason = r || null;
    }
  } else if (changed && prev === 'lost') {
    data.lostReason = null;
  } else {
    delete data.lostReason;
  }
}

module.exports = { buildAnalytics, departmentMemberIds, applyDealClosure };
