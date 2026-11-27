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
const { createInvoiceFromQuote } = require('../../../utils/quote-invoice');
const { prepareQuoteSave, notifyApprovers, notifyRequester } = require('../../../utils/cpq-quote');
const { sendBlockReason } = require('../../../utils/cpq');
const { getEsignProvider } = require('../../../utils/esign');

const UID = 'api::proposal.proposal';
const conflict = (ctx, msg) => (ctx.conflict ? ctx.conflict(msg) : ctx.badRequest(msg));

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
    // G13 GST maths + G27 bundles / discount approval
    const prep = await prepareQuoteSave(strapi, { orgId: ctx.state.orgId, actorId: ctx.state.user.id, data, existing: null });
    if (prep.error) return prep.blocked ? conflict(ctx, prep.error) : ctx.badRequest(prep.error);

    const entry = await strapi.entityService.create(UID, { data: prep.data });
    if (prep.newlyPending) await notifyApprovers(strapi, { orgId: ctx.state.orgId, actorId: ctx.state.user.id, quote: entry });
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
    // G13 GST maths + G27 bundles / discount approval / versions
    const prep = await prepareQuoteSave(strapi, { orgId: ctx.state.orgId, actorId: ctx.state.user.id, data, existing });
    if (prep.error) return prep.blocked ? conflict(ctx, prep.error) : ctx.badRequest(prep.error);

    const entry = await strapi.entityService.update(UID, pk, { data: prep.data });
    if (prep.newlyPending) await notifyApprovers(strapi, { orgId: ctx.state.orgId, actorId: ctx.state.user.id, quote: entry });
    return { data: entry, meta: { versioned: Boolean(prep.versioned) } };
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
    const blocked = sendBlockReason(quote); // G27
    if (blocked) return conflict(ctx, blocked);
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

  /** POST /proposals/:id/approval { decision: 'approve' | 'reject', note? } — CRM proposals manage (G27). */
  async decideApproval(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'proposals', 'manage');
    if (denied) return denied;
    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();
    const quote = await strapi.entityService.findOne(UID, pk, { populate: ['organization', 'assignedTo'] });
    if (!quote) return ctx.notFound();
    if (orgIdFromRelation(quote.organization) !== ctx.state.orgId) return ctx.forbidden('Access denied');
    if (quote.approval?.state !== 'pending') return ctx.badRequest('This quote is not waiting for approval');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const approved = body.decision === 'approve';
    if (!approved && body.decision !== 'reject') return ctx.badRequest('decision must be approve or reject');
    const now = new Date().toISOString();
    const approval = {
      ...quote.approval,
      state: approved ? 'approved' : 'rejected',
      approvedDiscountPct: approved ? quote.approval.maxPct : undefined,
      decidedBy: ctx.state.user.id,
      decidedAt: now,
      note: String(body.note || '').slice(0, 500) || undefined,
    };
    const entry = await strapi.entityService.update(UID, pk, { data: { approval, status: 'DRAFT' } });
    await notifyRequester(strapi, { orgId: ctx.state.orgId, quote, approved, actorId: ctx.state.user.id });
    return { data: entry };
  },

  /** POST /proposals/:id/send-for-signature — e-sign hand-off; provider not configured yet (G27). */
  async sendForSignature(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'crm', 'proposals', 'write');
    if (denied) return denied;
    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();
    const quote = await strapi.entityService.findOne(UID, pk, { populate: ['organization'] });
    if (!quote) return ctx.notFound();
    if (orgIdFromRelation(quote.organization) !== ctx.state.orgId) return ctx.forbidden('Access denied');
    const blocked = sendBlockReason(quote);
    if (blocked) return conflict(ctx, blocked);
    const provider = getEsignProvider();
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const signer = { name: body.signerName || quote.clientContactName || '', email: body.signerEmail || quote.clientEmail || '' };
    if (!provider.configured) {
      const esign = { state: 'not_configured', requestedAt: new Date().toISOString(), requestedBy: ctx.state.user.id, signer };
      await strapi.entityService.update(UID, pk, { data: { esign } });
      return { data: esign, meta: { configured: false, message: 'E-signature is not set up yet. Download the PDF and send it for signature manually.' } };
    }
    const result = await provider.send({ quote, pdfBase64: body.pdfBase64 || null, signer });
    const esign = { state: 'sent', provider: provider.name, envelopeId: result.envelopeId, url: result.url || null, requestedAt: new Date().toISOString(), requestedBy: ctx.state.user.id, signer };
    await strapi.entityService.update(UID, pk, { data: { esign, ...(quote.status === 'DRAFT' ? { status: 'SENT' } : {}) } });
    return { data: esign, meta: { configured: true } };
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
