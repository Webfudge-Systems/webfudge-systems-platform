'use strict';

/**
 * Client retainers (W14). Usage per calendar month:
 *   hours        → timesheet entries (W5) on the retainer's project, or on all the client's projects
 *   deliverables → tasks of type "deliverable" completed that month on those projects
 * Rollover "carry_forward": last month's unused allowance is added to this month (capped by
 * rolloverCap, default one month's allowance). Alerts go to the account manager at 80% and 100%,
 * once per threshold per month (tracked in alertsSent).
 */

const RETAINER_UID = 'api::retainer.retainer';
const ENTRY_UID = 'api::timesheet.time-entry';
const TASK_UID = 'api::task.task';
const PROJECT_UID = 'api::project.project';
const THRESHOLDS = [80, 100];
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
function monthBounds(key) {
  const [y, m] = key.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10), fromIso: first.toISOString(), toIso: new Date(Date.UTC(y, m, 1)).toISOString() };
}
function prevMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 2, 1));
}
const relId = (v) => (v == null ? null : typeof v === 'object' ? v.id ?? null : Number(v));

async function projectIdsFor(strapi, retainer) {
  const pid = relId(retainer.project);
  if (pid) return [pid];
  const cid = relId(retainer.clientAccount);
  if (!cid) return [];
  const rows = await strapi.entityService.findMany(PROJECT_UID, {
    filters: { organization: relId(retainer.organization), clientAccount: { id: cid } },
    fields: ['id'],
    limit: 500,
  });
  return rows.map((r) => r.id);
}

async function usedInMonth(strapi, retainer, key, projectIds) {
  const ids = projectIds ?? (await projectIdsFor(strapi, retainer));
  if (!ids.length) return { used: 0, approved: 0 };
  const b = monthBounds(key);
  if (retainer.unit === 'deliverables') {
    const n = await strapi.db.query(TASK_UID).count({
      where: { projects: { id: { $in: ids } }, taskType: 'deliverable', status: 'COMPLETED', updatedAt: { $gte: b.fromIso, $lt: b.toIso } },
    });
    return { used: n, approved: n };
  }
  if (!strapi.contentTypes[ENTRY_UID]) return { used: 0, approved: 0 };
  const entries = await strapi.entityService.findMany(ENTRY_UID, {
    filters: { project: { id: { $in: ids } }, date: { $gte: b.from, $lte: b.to } },
    fields: ['hours'],
    populate: { timesheet: { fields: ['status'] } },
    limit: 20000,
  });
  const used = entries.reduce((a, e) => a + (Number(e.hours) || 0), 0);
  const approved = entries.filter((e) => e.timesheet?.status === 'approved').reduce((a, e) => a + (Number(e.hours) || 0), 0);
  return { used: r1(used), approved: r1(approved) };
}

const activeIn = (retainer, key) => {
  const start = String(retainer.startMonth || '').slice(0, 7);
  const end = retainer.endMonth ? String(retainer.endMonth).slice(0, 7) : null;
  return start <= key && (!end || key <= end);
};

/** Status of a retainer for a month (default: current). */
async function retainerStatus(strapi, retainer, key = monthKey()) {
  const allowance = Number(retainer.monthlyAllowance) || 0;
  const projectIds = await projectIdsFor(strapi, retainer);
  const { used, approved } = await usedInMonth(strapi, retainer, key, projectIds);
  let carried = 0;
  if (retainer.rollover === 'carry_forward') {
    const prev = prevMonth(key);
    if (activeIn(retainer, prev)) {
      const prevUsed = (await usedInMonth(strapi, retainer, prev, projectIds)).used;
      const cap = retainer.rolloverCap != null ? Number(retainer.rolloverCap) : allowance;
      carried = r1(Math.min(cap, Math.max(0, allowance - prevUsed)));
    }
  }
  const available = r1(allowance + carried);
  const pct = available > 0 ? Math.round((used / available) * 100) : used > 0 ? 100 : 0;
  return {
    month: key,
    allowance,
    carried,
    available,
    used,
    approved,
    remaining: r1(available - used),
    pct,
    state: pct >= 100 ? 'over' : pct >= 80 ? 'warning' : 'ok',
    projectCount: projectIds.length,
  };
}

/** Cron: notify account managers when a retainer crosses 80% / 100% this month (once each). */
async function checkRetainerAlerts(strapi, { orgId } = {}) {
  const { notifyUsers } = require('./notification-emitter');
  const key = monthKey();
  const rows = await strapi.entityService.findMany(RETAINER_UID, {
    filters: { active: true, ...(orgId ? { organization: orgId } : {}) },
    populate: {
      organization: { fields: ['id'] },
      accountManager: { fields: ['id'] },
      clientAccount: { fields: ['id', 'companyName'] },
      project: { fields: ['id', 'name'] },
    },
    limit: 2000,
  });
  let sent = 0;
  for (const r of rows) {
    if (!activeIn(r, key) || !r.accountManager?.id || !r.organization?.id) continue;
    const s = await retainerStatus(strapi, r, key);
    const already = (r.alertsSent && r.alertsSent[key]) || [];
    const due = THRESHOLDS.filter((t) => s.pct >= t && !already.includes(t));
    if (!due.length) continue;
    const top = Math.max(...due);
    const who = r.clientAccount?.companyName || r.project?.name || r.name;
    const unit = r.unit === 'deliverables' ? 'deliverables' : 'h';
    await notifyUsers(strapi, {
      userIds: [r.accountManager.id],
      organizationId: r.organization.id,
      type: 'warning',
      title: top >= 100 ? `Retainer used up: ${who}` : `Retainer at ${s.pct}%: ${who}`,
      message: `${s.used} of ${s.available} ${unit} used this month (${r.name}).`,
      data: { href: '/retainers', retainerId: r.id, month: key },
    });
    await strapi.entityService.update(RETAINER_UID, r.id, { data: { alertsSent: { ...(r.alertsSent || {}), [key]: [...already, ...due] } } });
    sent += 1;
  }
  return sent;
}

module.exports = { RETAINER_UID, monthKey, prevMonth, activeIn, retainerStatus, checkRetainerAlerts };
