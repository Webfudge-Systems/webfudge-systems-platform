'use strict';

const { isHrAdmin } = require('../../../utils/hr-self-scope');

const UID = 'api::hr-performance-workspace.hr-performance-workspace';

const EMPTY_PAYLOAD = {
  goals: [],
  reviewCycles: [],
  feedbackPending: [],
  feedbackReceived: [],
  appraisals: [],
  pips: [],
};

function normalizePayload(raw = {}) {
  return {
    goals: Array.isArray(raw.goals) ? raw.goals : [],
    reviewCycles: Array.isArray(raw.reviewCycles) ? raw.reviewCycles : [],
    feedbackPending: Array.isArray(raw.feedbackPending) ? raw.feedbackPending : [],
    feedbackReceived: Array.isArray(raw.feedbackReceived) ? raw.feedbackReceived : [],
    appraisals: Array.isArray(raw.appraisals) ? raw.appraisals : [],
    pips: Array.isArray(raw.pips) ? raw.pips : [],
  };
}

async function findWorkspaceForOrg(strapi, orgId) {
  const rows = await strapi.entityService.findMany(UID, {
    filters: { organization: orgId },
    limit: 1,
    sort: { updatedAt: 'desc' },
  });
  return rows?.[0] || null;
}

module.exports = {
  async getCurrent(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const existing = await findWorkspaceForOrg(strapi, ctx.state.orgId);
    const payload = normalizePayload(existing?.payload || EMPTY_PAYLOAD);
    return {
      data: {
        id: existing?.id || null,
        payload,
      },
    };
  },

  async upsertCurrent(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    if (!isHrAdmin(ctx)) {
      return ctx.forbidden('Only HR admins can update performance workspace data');
    }

    const body = ctx.request?.body || {};
    const payload = normalizePayload(body.payload || body.data?.payload || body);

    const existing = await findWorkspaceForOrg(strapi, ctx.state.orgId);
    if (existing) {
      const entry = await strapi.entityService.update(UID, existing.id, {
        data: { payload },
      });
      return { data: { id: entry.id, payload: normalizePayload(entry.payload) } };
    }

    const entry = await strapi.entityService.create(UID, {
      data: {
        organization: ctx.state.orgId,
        payload,
      },
    });
    return { data: { id: entry.id, payload: normalizePayload(entry.payload) } };
  },
};
