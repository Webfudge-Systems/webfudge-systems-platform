'use strict';

/**
 * Org-scoped CRUD controller factory for the invest-* content types.
 * Every handler runs the invest access guard, pins `organization` to the active org,
 * and refuses rows that belong to another organization.
 */

const { requireInvestAccess } = require('./access');
const { orgIdFromRelation, readListQuery, safeCount } = require('../content-api-helpers');

function payloadFrom(ctx) {
  const body = ctx.request?.body || {};
  const payload = body.data || body;
  const data = payload && typeof payload === 'object' ? { ...payload } : {};
  delete data.id;
  delete data.documentId;
  delete data.organization;
  delete data.createdByUser;
  delete data.createdAt;
  delete data.updatedAt;
  return data;
}

class InvestValidationError extends Error {}

/**
 * @param {string} uid
 * @param {{
 *   populate: string[],
 *   defaultSort: string,
 *   listFilters?: (extra: Record<string, unknown>) => Record<string, unknown>,
 *   prepare?: (strapi: any, ctx: any, data: Record<string, any>, existing: any|null) => Promise<Record<string, any>>,
 *   beforeDelete?: (strapi: any, ctx: any, existing: any) => Promise<string|null>,
 * }} opts
 */
function createInvestCrud(uid, opts) {
  return ({ strapi }) => {
    async function loadOwned(ctx, id) {
      const entry = await strapi.entityService.findOne(uid, id, { populate: [...new Set(['organization', ...opts.populate])] });
      if (!entry) {
        ctx.notFound();
        return null;
      }
      if (orgIdFromRelation(entry.organization) !== ctx.state.orgId) {
        ctx.forbidden('Access denied');
        return null;
      }
      return entry;
    }

    async function handleWrite(ctx, fn) {
      try {
        return await fn();
      } catch (err) {
        if (err instanceof InvestValidationError) return ctx.badRequest(err.message);
        throw err;
      }
    }

    return {
      async find(ctx) {
        if (!requireInvestAccess(ctx)) return;
        const { query, page, pageSize, sort } = readListQuery(ctx, {
          defaultSort: opts.defaultSort,
          defaultPageSize: 500,
          maxPageSize: 5000,
        });
        const extra = query.filters && typeof query.filters === 'object' && !Array.isArray(query.filters) ? query.filters : {};
        const filters = { organization: ctx.state.orgId, ...(opts.listFilters ? opts.listFilters(extra) : {}) };
        const results = await strapi.entityService.findMany(uid, {
          filters,
          start: (page - 1) * pageSize,
          limit: pageSize,
          sort,
          populate: opts.populate,
        });
        const total = await safeCount(strapi, uid, filters, results.length);
        return { data: results, meta: { pagination: { page, pageSize, pageCount: Math.ceil(Math.max(total, 1) / pageSize), total } } };
      },

      async findOne(ctx) {
        if (!requireInvestAccess(ctx)) return;
        const entry = await loadOwned(ctx, ctx.params.id);
        if (!entry) return;
        return { data: entry };
      },

      async create(ctx) {
        if (!requireInvestAccess(ctx)) return;
        return handleWrite(ctx, async () => {
          let data = payloadFrom(ctx);
          if (opts.prepare) data = await opts.prepare(strapi, ctx, data, null);
          if (data.__existing) return { data: data.__existing };
          data.organization = ctx.state.orgId;
          data.createdByUser = ctx.state.user.id;
          const entry = await strapi.entityService.create(uid, { data, populate: opts.populate });
          return { data: entry };
        });
      },

      async update(ctx) {
        if (!requireInvestAccess(ctx)) return;
        const existing = await loadOwned(ctx, ctx.params.id);
        if (!existing) return;
        return handleWrite(ctx, async () => {
          let data = payloadFrom(ctx);
          if (opts.prepare) data = await opts.prepare(strapi, ctx, data, existing);
          delete data.__existing;
          const entry = await strapi.entityService.update(uid, existing.id, { data, populate: opts.populate });
          return { data: entry };
        });
      },

      async delete(ctx) {
        if (!requireInvestAccess(ctx)) return;
        const existing = await loadOwned(ctx, ctx.params.id);
        if (!existing) return;
        if (opts.beforeDelete) {
          const reason = await opts.beforeDelete(strapi, ctx, existing);
          if (reason) return ctx.conflict ? ctx.conflict(reason) : ctx.badRequest(reason);
        }
        const entry = await strapi.entityService.delete(uid, existing.id);
        return { data: entry };
      },
    };
  };
}

/** Load a related invest row and make sure it belongs to the active org. */
async function ownedRelation(strapi, ctx, uid, value, label) {
  if (value == null || value === '') return null;
  const id = typeof value === 'object' ? value.id : value;
  const n = parseInt(String(id), 10);
  if (!Number.isFinite(n)) throw new InvestValidationError(`Invalid ${label}`);
  const row = await strapi.entityService.findOne(uid, n, { populate: ['organization'] });
  if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId) {
    throw new InvestValidationError(`${label} not found`);
  }
  return row;
}

function num(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

module.exports = { createInvestCrud, ownedRelation, InvestValidationError, num };
