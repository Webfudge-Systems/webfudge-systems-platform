'use strict';

/**
 * Product catalogue + price books (G13). Read: CRM proposals or invoices read. Write: CRM settings manage.
 * Price book `prices` = { [productId]: price }; products without an entry use their list price.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const { canAccess, requireAppSettingsManage } = require('../../../utils/rbac');
const { GST_RATES, calculate, r2 } = require('../../../utils/gst');
const { checkDiscount, expandBundleLines, loadPolicy, loadBook, POLICY_UID } = require('../../../utils/cpq-quote');

/** G27: '' / null clears an override; otherwise 0–100. */
function pctOrNull(v) {
  if (v === null || v === '' || v === undefined) return { value: null };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) return { error: 'Max discount must be between 0 and 100%' };
  return { value: r2(n) };
}

const PRODUCT_UID = 'api::crm-product.crm-product';
const BOOK_UID = 'api::crm-product.crm-price-book';
const MAX_PRODUCTS = 2000;

function guard(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  return true;
}

function canRead(ctx) {
  return canAccess(ctx, 'crm', 'proposals', 'read') || canAccess(ctx, 'crm', 'client_invoices', 'read') || canAccess(ctx, 'crm', 'settings', 'read');
}

function normalizeProduct(body, creating) {
  const data = {};
  if (creating || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return { error: 'Product name is required' };
    data.name = name.slice(0, 200);
  }
  for (const k of ['sku', 'description', 'hsnSac', 'unit']) {
    if (body[k] !== undefined) data[k] = String(body[k] ?? '').trim().slice(0, k === 'description' ? 2000 : 60) || null;
  }
  if (data.hsnSac && !/^\d{4,8}$/.test(data.hsnSac)) return { error: 'HSN/SAC must be 4 to 8 digits' };
  if (body.kind !== undefined) {
    if (!['product', 'service'].includes(body.kind)) return { error: 'Type must be product or service' };
    data.kind = body.kind;
  }
  if (body.unitPrice !== undefined) {
    const p = Number(body.unitPrice);
    if (!Number.isFinite(p) || p < 0) return { error: "Price can't be negative" };
    data.unitPrice = r2(p);
  }
  if (body.gstRate !== undefined) {
    const g = Number(body.gstRate);
    if (!GST_RATES.includes(g)) return { error: `GST rate must be one of ${GST_RATES.join(', ')}%` };
    data.gstRate = g;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.maxDiscountPct !== undefined) {
    const { value, error } = pctOrNull(body.maxDiscountPct);
    if (error) return { error };
    data.maxDiscountPct = value;
  }
  if (body.bundleItems !== undefined) {
    const items = Array.isArray(body.bundleItems) ? body.bundleItems : [];
    data.bundleItems = items
      .map((i) => ({ productId: Number(i?.productId), qty: Math.max(1, Number(i?.qty) || 1), optional: Boolean(i?.optional) }))
      .filter((i) => i.productId > 0)
      .slice(0, 50);
    if (!data.bundleItems.length) data.bundleItems = null;
  }
  return { data };
}

const serializeProduct = (p) => ({
  id: p.id,
  name: p.name,
  sku: p.sku || '',
  description: p.description || '',
  kind: p.kind || 'service',
  hsnSac: p.hsnSac || '',
  unit: p.unit || 'Nos',
  unitPrice: Number(p.unitPrice) || 0,
  gstRate: Number(p.gstRate) || 0,
  active: p.active !== false,
  bundleItems: Array.isArray(p.bundleItems) ? p.bundleItems : [],
  maxDiscountPct: p.maxDiscountPct === null || p.maxDiscountPct === undefined ? null : Number(p.maxDiscountPct),
});

const serializeBook = (b) => ({
  id: b.id,
  name: b.name,
  description: b.description || '',
  isDefault: Boolean(b.isDefault),
  prices: b.prices || {},
  maxDiscountPct: b.maxDiscountPct === null || b.maxDiscountPct === undefined ? null : Number(b.maxDiscountPct),
});

async function loadOwned(strapi, ctx, uid) {
  const id = parseInt(String(ctx.params.id), 10);
  if (Number.isNaN(id)) return null;
  const row = await strapi.entityService.findOne(uid, id, { populate: { organization: { fields: ['id'] } } });
  if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId) return null;
  return row;
}

async function cleanPrices(strapi, orgId, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const ids = Object.keys(raw).map(Number).filter((n) => n > 0);
  if (!ids.length) return {};
  const own = await strapi.entityService.findMany(PRODUCT_UID, { filters: { organization: orgId, id: { $in: ids } }, fields: ['id'], limit: ids.length });
  const ok = new Set(own.map((p) => p.id));
  const out = {};
  for (const id of ids) {
    const v = Number(raw[id]);
    if (ok.has(id) && Number.isFinite(v) && v >= 0) out[id] = r2(v);
  }
  return out;
}

async function clearDefaultBook(strapi, orgId, exceptId) {
  const rows = await strapi.entityService.findMany(BOOK_UID, { filters: { organization: orgId, isDefault: true }, limit: 50 });
  for (const r of rows) if (r.id !== exceptId) await strapi.entityService.update(BOOK_UID, r.id, { data: { isDefault: false } });
}

module.exports = createCoreController(PRODUCT_UID, ({ strapi }) => ({
  /** GET /crm-products?active=true&q= */
  async find(ctx) {
    if (!guard(ctx)) return;
    if (!canRead(ctx)) return ctx.forbidden('You need access to proposals or invoices');
    const q = ctx.query || {};
    const filters = { organization: ctx.state.orgId };
    if (q.active === 'true') filters.active = true;
    if (q.q) filters.$or = [{ name: { $containsi: String(q.q) } }, { sku: { $containsi: String(q.q) } }, { hsnSac: { $startsWith: String(q.q) } }];
    const rows = await strapi.entityService.findMany(PRODUCT_UID, { filters, sort: [{ name: 'asc' }], limit: MAX_PRODUCTS });
    ctx.set('Cache-Control', 'no-store');
    return { data: rows.map(serializeProduct), meta: { gstRates: GST_RATES } };
  },

  async create(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const { data, error } = normalizeProduct(ctx.request?.body?.data || ctx.request?.body || {}, true);
    if (error) return ctx.badRequest(error);
    const count = await strapi.db.query(PRODUCT_UID).count({ where: { organization: ctx.state.orgId } });
    if (count >= MAX_PRODUCTS) return ctx.badRequest(`At most ${MAX_PRODUCTS} products`);
    const entry = await strapi.entityService.create(PRODUCT_UID, { data: { ...data, organization: ctx.state.orgId } });
    return { data: serializeProduct(entry) };
  },

  async update(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx, PRODUCT_UID);
    if (!row) return ctx.notFound('Product not found');
    const { data, error } = normalizeProduct(ctx.request?.body?.data || ctx.request?.body || {}, false);
    if (error) return ctx.badRequest(error);
    if (data.bundleItems?.some((i) => i.productId === row.id)) return ctx.badRequest("A bundle can't contain itself");
    const entry = await strapi.entityService.update(PRODUCT_UID, row.id, { data });
    return { data: serializeProduct(entry) };
  },

  /** Deleting keeps existing quotes/invoices intact (they store a copy of each line). */
  async delete(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx, PRODUCT_UID);
    if (!row) return ctx.notFound('Product not found');
    await strapi.entityService.delete(PRODUCT_UID, row.id);
    return { data: { id: row.id } };
  },

  async listPriceBooks(ctx) {
    if (!guard(ctx)) return;
    if (!canRead(ctx)) return ctx.forbidden('You need access to proposals or invoices');
    const rows = await strapi.entityService.findMany(BOOK_UID, { filters: { organization: ctx.state.orgId }, sort: [{ name: 'asc' }], limit: 100 });
    ctx.set('Cache-Control', 'no-store');
    return { data: rows.map(serializeBook) };
  },

  async createPriceBook(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const name = String(body.name || '').trim().slice(0, 100);
    if (!name) return ctx.badRequest('Price book name is required');
    const entry = await strapi.entityService.create(BOOK_UID, {
      data: {
        name,
        description: String(body.description || '').slice(0, 250),
        isDefault: Boolean(body.isDefault),
        prices: await cleanPrices(strapi, ctx.state.orgId, body.prices),
        maxDiscountPct: pctOrNull(body.maxDiscountPct).value ?? null,
        organization: ctx.state.orgId,
      },
    });
    if (entry.isDefault) await clearDefaultBook(strapi, ctx.state.orgId, entry.id);
    return { data: serializeBook(entry) };
  },

  async updatePriceBook(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx, BOOK_UID);
    if (!row) return ctx.notFound('Price book not found');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const data = {};
    if (body.name !== undefined) {
      const name = String(body.name || '').trim().slice(0, 100);
      if (!name) return ctx.badRequest('Price book name is required');
      data.name = name;
    }
    if (body.description !== undefined) data.description = String(body.description || '').slice(0, 250);
    if (body.isDefault !== undefined) data.isDefault = Boolean(body.isDefault);
    if (body.prices !== undefined) data.prices = await cleanPrices(strapi, ctx.state.orgId, body.prices);
    if (body.maxDiscountPct !== undefined) {
      const { value, error } = pctOrNull(body.maxDiscountPct);
      if (error) return ctx.badRequest(error);
      data.maxDiscountPct = value;
    }
    const entry = await strapi.entityService.update(BOOK_UID, row.id, { data });
    if (data.isDefault) await clearDefaultBook(strapi, ctx.state.orgId, row.id);
    return { data: serializeBook(entry) };
  },

  async deletePriceBook(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const row = await loadOwned(strapi, ctx, BOOK_UID);
    if (!row) return ctx.notFound('Price book not found');
    await strapi.entityService.delete(BOOK_UID, row.id);
    return { data: { id: row.id } };
  },

  /** POST /crm-quotes/calculate { lines, sellerGstin, buyerGstin } → GST totals (preview in the quote builder). */
  async calculate(ctx) {
    if (!guard(ctx)) return;
    if (!canRead(ctx)) return ctx.forbidden('You need access to proposals or invoices');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const book = await loadBook(strapi, ctx.state.orgId, body.priceBookId);
    const lines = await expandBundleLines(strapi, ctx.state.orgId, body.lines, book?.prices || {});
    const result = calculate(lines, { sellerGstin: body.sellerGstin, buyerGstin: body.buyerGstin });
    if (result.error) return ctx.badRequest(result.error);
    const discount = await checkDiscount(strapi, ctx.state.orgId, result.lines, body.priceBookId); // G27
    return { data: { ...result, discount } };
  },

  /** GET /crm-quote-policy — org max discount before approval (G27). */
  async getQuotePolicy(ctx) {
    if (!guard(ctx)) return;
    if (!canRead(ctx)) return ctx.forbidden('You need access to proposals or invoices');
    const policy = await loadPolicy(strapi, ctx.state.orgId);
    ctx.set('Cache-Control', 'no-store');
    return { data: { maxDiscountPct: policy.maxDiscountPct } };
  },

  /** PUT /crm-quote-policy { maxDiscountPct: number | null } — CRM settings manage. */
  async updateQuotePolicy(ctx) {
    if (!guard(ctx)) return;
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const { value, error } = pctOrNull(body.maxDiscountPct);
    if (error) return ctx.badRequest(error);
    const policy = await loadPolicy(strapi, ctx.state.orgId);
    if (policy.id) await strapi.entityService.update(POLICY_UID, policy.id, { data: { maxDiscountPct: value } });
    else await strapi.entityService.create(POLICY_UID, { data: { maxDiscountPct: value, organization: ctx.state.orgId } });
    return { data: { maxDiscountPct: value } };
  },
}));
