'use strict';

/**
 * GET /crm-analytics?from=YYYY-MM-DD&to=YYYY-MM-DD&ownerId=&departmentId=
 * Needs CRM analytics read. Analytics / deals managers see the whole org and can filter by rep or
 * department; everyone else only gets their own numbers.
 */

const { requireModuleAccess, canAccess } = require('../../../utils/rbac');
const { buildAnalytics, departmentMemberIds } = require('../../../utils/crm-analytics');

const DAY = 86400000;
const MAX_RANGE_DAYS = 731;

function parseDay(v, endOfDay) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return null;
  const d = new Date(`${v}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = {
  async report(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'analytics', 'read');
    if (denied) return denied;

    const q = ctx.query || {};
    const to = parseDay(q.to, true) || new Date();
    const from = parseDay(q.from, false) || new Date(to.getTime() - 30 * DAY);
    if (from > to) return ctx.badRequest('"from" must be before "to"');
    if ((to - from) / DAY > MAX_RANGE_DAYS) return ctx.badRequest('Pick a range of two years or less');

    const teamView = canAccess(ctx, 'crm', 'analytics', 'manage') || canAccess(ctx, 'crm', 'deals', 'manage');
    let ownerIds = null;
    if (!teamView) {
      ownerIds = [Number(ctx.state.user.id)];
    } else if (q.ownerId) {
      const id = parseInt(q.ownerId, 10);
      if (Number.isNaN(id)) return ctx.badRequest('Invalid ownerId');
      ownerIds = [id];
    } else if (q.departmentId) {
      const id = parseInt(q.departmentId, 10);
      if (Number.isNaN(id)) return ctx.badRequest('Invalid departmentId');
      ownerIds = await departmentMemberIds(strapi, ctx.state.orgId, id);
    }

    const data = await buildAnalytics(strapi, { orgId: ctx.state.orgId, from, to, ownerIds });
    ctx.set('Cache-Control', 'no-store');
    return { data, meta: { teamView, scope: ownerIds ? (teamView ? 'filtered' : 'own') : 'org' } };
  },
};
