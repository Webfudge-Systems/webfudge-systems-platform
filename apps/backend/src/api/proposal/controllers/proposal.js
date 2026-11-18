'use strict';

/**
 * Proposal controller — org-scoped CRUD.
 * Follows the same pattern as deal.js / task.js.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  orgIdFromRelation,
  readListQuery,
  createPopulateSanitizer,
  safeCount,
  resolveEntityPkForRouteParam,
} = require('../../../utils/content-api-helpers');
const { requireModuleAccess } = require('../../../utils/rbac');
const { applyQuoteLines, createInvoiceFromQuote } = require('../../../utils/quote-invoice');

const UID = 'api::proposal.proposal';

const ALLOWED_POPULATE = new Set([
  'assignedTo',
  'organization',
  'leadCompany',
  'clientAccount',
  'deal',
]);

const sanitizePopulate = createPopulateSanitizer(ALLOWED_POPULATE, [
  'assignedTo',
  'organization',
  'leadCompany',
  'clientAccount',
  'deal',
]);

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'proposals', 'read');
    if (denied) return denied;

    const { query, page, pageSize, sort } = readListQuery(ctx, {
      defaultSort: 'createdAt:desc',
      defaultPageSize: 25,
      maxPageSize: 200,
    });

    const filters = { organization: ctx.state.orgId };
    const extra = query.filters;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      if (extra.status) filters.status = extra.status;
      if (extra.documentType) filters.documentType = extra.documentType;
      if (extra.deal) filters.deal = extra.deal;
      if (extra.leadCompany) filters.leadCompany = extra.leadCompany;
      if (extra.clientAccount) filters.clientAccount = extra.clientAccount;
    }

    const results = await strapi.entityService.findMany(UID, {
      filters,
      start: (page - 1) * pageSize,
      limit: pageSize,
      sort,
      populate: sanitizePopulate(query.populate),
    });

    const total = await safeCount(strapi, UID, filters, results.length);
    const pageCount = Math.ceil(Math.max(total, 1) / pageSize);
    return { data: results, meta: { pagination: { page, pageSize, pageCount, total } } };
  },

  async findOne(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'proposals', 'read');
    if (denied) return denied;

    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();
    const entry = await strapi.entityService.findOne(UID, pk, {
      populate: sanitizePopulate(ctx.query?.populate),
    });
    if (!entry) return ctx.notFound();
    if (orgIdFromRelation(entry.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    return { data: entry };
  },

  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'proposals', 'write');
    if (denied) return denied;

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};

    data.organization = ctx.state.orgId;
    if (data.assignedTo == null && ctx.state.user?.id) {
      data.assignedTo = ctx.state.user.id;
    }

    delete data.id;
    delete data.documentId;
    const quoteError = applyQuoteLines(data, null); // G13: server-side GST maths
    if (quoteError) return ctx.badRequest(quoteError);

    const entry = await strapi.entityService.create(UID, { data });
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'proposals', 'write');
    if (denied) return denied;

    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();

    const existing = await strapi.entityService.findOne(UID, pk, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};
    delete data.organization;
    const quoteError = applyQuoteLines(data, existing); // G13: server-side GST maths
    if (quoteError) return ctx.badRequest(quoteError);

    const entry = await strapi.entityService.update(UID, pk, { data });
    return { data: entry };
  },

  /**
   * POST /proposals/:id/convert-to-invoice — catalogue quote → DRAFT GST invoice (G13).
   * Idempotent: a quote converts once; later calls return the same invoice (meta.existing).
   */
  async convertToInvoice(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'client_invoices', 'write');
    if (denied) return denied;
    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();
    const quote = await strapi.entityService.findOne(UID, pk, {
      populate: ['organization', 'convertedInvoice', 'assignedTo', 'leadCompany', 'clientAccount', 'deal'],
    });
    if (!quote) return ctx.notFound();
    if (orgIdFromRelation(quote.organization) !== ctx.state.orgId) return ctx.forbidden('Access denied');
    if (quote.convertedInvoice?.id) {
      return { data: quote.convertedInvoice, meta: { existing: true } };
    }
    if (!Array.isArray(quote.lineItems) || !quote.lineItems.length) {
      return ctx.badRequest('Only quotes built from products can be converted. Add line items first.');
    }
    const { invoice, error } = await createInvoiceFromQuote(strapi, { orgId: ctx.state.orgId, actorId: ctx.state.user.id, quote });
    if (error) return ctx.badRequest(error);
    await strapi.entityService.update(UID, pk, {
      data: { convertedInvoice: invoice.id, ...(['DRAFT', 'SENT'].includes(quote.status) ? { status: 'ACCEPTED' } : {}) },
    });
    return { data: invoice, meta: { existing: false } };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'proposals', 'manage');
    if (denied) return denied;

    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();

    const existing = await strapi.entityService.findOne(UID, pk, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const entry = await strapi.entityService.delete(UID, pk);
    return { data: entry };
  },
}));
