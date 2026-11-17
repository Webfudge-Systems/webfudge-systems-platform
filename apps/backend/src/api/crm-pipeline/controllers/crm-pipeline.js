'use strict';

/**
 * crm-pipeline controller — per-org deal pipelines and lead statuses (ticket G2).
 * Read: anyone with CRM deals/leads read. Write: users who can manage CRM settings.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const { requireModuleAccess, requireAppSettingsManage } = require('../../../utils/rbac');
const {
  PIPELINE_UID,
  STAGE_COLORS,
  DEAL_REQUIRED_FIELD_OPTIONS,
  normalizeStages,
  ensurePipelines,
} = require('../../../utils/crm-pipeline');

const DEAL_UID = 'api::deal.deal';

function readEntity(value) {
  return value === 'lead' ? 'lead' : 'deal';
}

async function loadOwned(strapi, ctx) {
  const id = parseInt(String(ctx.params.id), 10);
  if (Number.isNaN(id)) return null;
  const row = await strapi.entityService.findOne(PIPELINE_UID, id, { populate: ['organization'] });
  if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId) return null;
  return row;
}

function serialize(row) {
  if (!row) return row;
  const { organization, ...rest } = row;
  return { ...rest, stages: Array.isArray(row.stages) ? row.stages : [] };
}

module.exports = createCoreController(PIPELINE_UID, ({ strapi }) => ({
  /** GET /crm-pipelines?entity=deal|lead — creates the default pipeline on first read. */
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const entity = readEntity(ctx.query?.entity);
    const denied = requireModuleAccess(ctx, 'crm', entity === 'lead' ? 'leads' : 'deals', 'read');
    if (denied) return denied;
    const rows = await ensurePipelines(strapi, ctx.state.orgId, entity);
    ctx.set('Cache-Control', 'no-store');
    return {
      data: rows.map(serialize),
      meta: { colors: STAGE_COLORS, requiredFieldOptions: entity === 'deal' ? DEAL_REQUIRED_FIELD_OPTIONS : [] },
    };
  },

  /** POST /crm-pipelines — new deal pipeline (the lead status list is a single list, not created here). */
  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;

    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) return ctx.badRequest('Pipeline name is required');
    const existing = await ensurePipelines(strapi, ctx.state.orgId, 'deal');
    if (existing.length >= 20) return ctx.badRequest('An organization can have at most 20 pipelines');
    if (existing.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return ctx.badRequest(`A pipeline named "${name}" already exists`);
    }
    const stagesInput = body.stages || [
      { label: 'New', kind: 'open', color: 'blue', probability: 10 },
      { label: 'In progress', kind: 'open', color: 'amber', probability: 50 },
      { label: 'Won', kind: 'won', color: 'emerald', probability: 100 },
      { label: 'Lost', kind: 'lost', color: 'red', probability: 0 },
    ];
    const { stages, error } = normalizeStages(stagesInput, 'deal');
    if (error) return ctx.badRequest(error);

    const entry = await strapi.entityService.create(PIPELINE_UID, {
      data: {
        name,
        entity: 'deal',
        isDefault: false,
        sortOrder: existing.length,
        stages,
        organization: ctx.state.orgId,
      },
    });
    return { data: serialize(entry) };
  },

  /** PUT /crm-pipelines/:id — rename, reorder, edit stages, or make default. */
  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx);
    if (!row) return ctx.notFound('Pipeline not found');

    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const data = {};
    if (body.name != null) {
      const name = String(body.name).trim().slice(0, 80);
      if (!name) return ctx.badRequest('Pipeline name is required');
      data.name = name;
    }
    if (body.sortOrder != null && Number.isFinite(Number(body.sortOrder))) data.sortOrder = Number(body.sortOrder);
    if (body.stages != null) {
      const { stages, error } = normalizeStages(body.stages, row.entity, row.stages);
      if (error) return ctx.badRequest(error);
      if (row.entity === 'deal') {
        // Don't strand deals: a stage that still has deals can't be removed.
        const removed = (row.stages || []).map((s) => s.key).filter((k) => !stages.some((s) => s.key === k));
        for (const key of removed) {
          const filters = row.isDefault
            ? { organization: ctx.state.orgId, $or: [{ pipelineStageKey: key, pipeline: row.id }, { pipeline: { id: { $null: true } }, stage: key }] }
            : { organization: ctx.state.orgId, pipeline: row.id, pipelineStageKey: key };
          const count = await strapi.db.query(DEAL_UID).count({ where: filters });
          if (count > 0) {
            const label = (row.stages || []).find((s) => s.key === key)?.label || key;
            return ctx.badRequest(`Move the ${count} deal(s) out of "${label}" before removing it`);
          }
        }
      }
      data.stages = stages;
    }
    if (body.isDefault === true && row.entity === 'deal' && !row.isDefault) {
      const others = await strapi.entityService.findMany(PIPELINE_UID, {
        filters: { organization: ctx.state.orgId, entity: 'deal', isDefault: true },
        limit: 50,
      });
      for (const o of others) await strapi.entityService.update(PIPELINE_UID, o.id, { data: { isDefault: false } });
      data.isDefault = true;
    }
    if (!Object.keys(data).length) return ctx.badRequest('Nothing to update');
    const entry = await strapi.entityService.update(PIPELINE_UID, row.id, { data });
    return { data: serialize(entry) };
  },

  /** DELETE /crm-pipelines/:id — only non-default deal pipelines with no deals. */
  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx);
    if (!row) return ctx.notFound('Pipeline not found');
    if (row.entity !== 'deal') return ctx.badRequest('The lead status list cannot be deleted');
    if (row.isDefault) return ctx.badRequest('Make another pipeline the default before deleting this one');
    const count = await strapi.db.query(DEAL_UID).count({ where: { organization: ctx.state.orgId, pipeline: row.id } });
    if (count > 0) return ctx.badRequest(`Move the ${count} deal(s) in this pipeline elsewhere before deleting it`);
    await strapi.entityService.delete(PIPELINE_UID, row.id);
    return { data: { id: row.id } };
  },
}));
