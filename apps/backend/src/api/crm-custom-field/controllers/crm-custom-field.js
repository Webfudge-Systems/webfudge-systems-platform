'use strict';

/**
 * crm-custom-field controller (G1). Read: any signed-in member of the org (fields show on records
 * they can already read). Write: CRM settings manage.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const { requireAppSettingsManage } = require('../../../utils/rbac');
const {
  FIELD_UID,
  ENTITIES,
  FIELD_TYPES,
  MAX_FIELDS_PER_ENTITY,
  normalizeDefinition,
  listFields,
} = require('../../../utils/crm-custom-fields');

function serialize(row) {
  if (!row) return row;
  const { organization, ...rest } = row;
  return { ...rest, options: Array.isArray(row.options) ? row.options : [] };
}

async function loadOwned(strapi, ctx) {
  const id = parseInt(String(ctx.params.id), 10);
  if (Number.isNaN(id)) return null;
  const row = await strapi.entityService.findOne(FIELD_UID, id, { populate: ['organization'] });
  if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId) return null;
  return row;
}

module.exports = createCoreController(FIELD_UID, ({ strapi }) => ({
  /** GET /crm-custom-fields?entity=lead|contact|account|deal (omit entity for all). */
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const entity = ctx.query?.entity;
    let rows;
    if (entity) {
      if (!ENTITIES.includes(entity)) return ctx.badRequest(`Entity must be one of: ${ENTITIES.join(', ')}`);
      rows = await listFields(strapi, ctx.state.orgId, entity);
    } else {
      rows = await strapi.entityService.findMany(FIELD_UID, {
        filters: { organization: ctx.state.orgId },
        sort: [{ entity: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
        limit: 500,
      });
    }
    ctx.set('Cache-Control', 'no-store');
    return { data: rows.map(serialize), meta: { types: FIELD_TYPES, entities: ENTITIES } };
  },

  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const { data, error } = normalizeDefinition(body, { creating: true });
    if (error) return ctx.badRequest(error);
    if (['select', 'multiselect'].includes(data.type) && !(data.options || []).length) {
      return ctx.badRequest('Add at least one option for a dropdown field');
    }
    const existing = await listFields(strapi, ctx.state.orgId, data.entity);
    if (existing.length >= MAX_FIELDS_PER_ENTITY) {
      return ctx.badRequest(`At most ${MAX_FIELDS_PER_ENTITY} custom fields per record type`);
    }
    if (existing.some((f) => f.key === data.key)) return ctx.badRequest(`A field named "${data.label}" already exists`);
    const entry = await strapi.entityService.create(FIELD_UID, {
      data: { ...data, sortOrder: data.sortOrder ?? existing.length, organization: ctx.state.orgId },
    });
    return { data: serialize(entry) };
  },

  /** PUT /crm-custom-fields/:id — label, options, required, showInTable, sortOrder (type and key are fixed). */
  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx);
    if (!row) return ctx.notFound('Field not found');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const { data, error } = normalizeDefinition(body, { creating: false });
    if (error) return ctx.badRequest(error);
    if (['select', 'multiselect'].includes(row.type) && data.options && !data.options.length) {
      return ctx.badRequest('A dropdown field needs at least one option');
    }
    if (!Object.keys(data).length) return ctx.badRequest('Nothing to update');
    const entry = await strapi.entityService.update(FIELD_UID, row.id, { data });
    return { data: serialize(entry) };
  },

  /** DELETE removes the definition; stored values stay on records but are no longer shown. */
  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx);
    if (!row) return ctx.notFound('Field not found');
    await strapi.entityService.delete(FIELD_UID, row.id);
    return { data: { id: row.id } };
  },
}));
