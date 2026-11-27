'use strict';

/**
 * Quote save pipeline for CPQ (G27), around G13's applyQuoteLines:
 * strip server-owned fields → expand bundle lines → version a sent/approved quote on line edits →
 * GST maths → discount check → approval state → block SENT/ACCEPTED while approval is pending.
 */

const { applyQuoteLines } = require('./quote-invoice');
const { canAccessPermissions } = require('./rbac');
const { notifyUsers } = require('./notification-emitter');
const cpq = require('./cpq');

const PRODUCT_UID = 'api::crm-product.crm-product';
const BOOK_UID = 'api::crm-product.crm-price-book';
const POLICY_UID = 'api::crm-product.crm-quote-policy';

async function loadPolicy(strapi, orgId) {
  const rows = await strapi.entityService.findMany(POLICY_UID, { filters: { organization: orgId }, limit: 1 });
  const p = rows[0];
  const n = p?.maxDiscountPct;
  return { id: p?.id ?? null, maxDiscountPct: n === null || n === undefined || n === '' ? null : Number(n) };
}

async function loadBook(strapi, orgId, bookId) {
  const filters = bookId ? { organization: orgId, id: Number(bookId) } : { organization: orgId, isDefault: true };
  const rows = await strapi.entityService.findMany(BOOK_UID, { filters, limit: 1 });
  return rows[0] || null;
}

async function loadProducts(strapi, orgId, ids) {
  const clean = [...new Set(ids.map(Number).filter((n) => n > 0))];
  if (!clean.length) return {};
  const rows = await strapi.entityService.findMany(PRODUCT_UID, { filters: { organization: orgId, id: { $in: clean } }, limit: clean.length });
  return Object.fromEntries(rows.map((p) => [p.id, p]));
}

/** Lines with { isBundle: true, productId, addOnIds? } become their component lines. */
async function expandBundleLines(strapi, orgId, lines, bookPrices) {
  if (!Array.isArray(lines) || !lines.some((l) => l?.isBundle)) return lines;
  const bundles = await loadProducts(strapi, orgId, lines.filter((l) => l?.isBundle).map((l) => l.productId));
  const compIds = Object.values(bundles).flatMap((b) => (Array.isArray(b.bundleItems) ? b.bundleItems.map((i) => i.productId) : []));
  const comps = await loadProducts(strapi, orgId, compIds);
  const out = [];
  for (const l of lines) {
    const b = l?.isBundle ? bundles[l.productId] : null;
    if (!l?.isBundle) out.push(l);
    else if (b) out.push(...cpq.expandBundle(b, comps, { qty: l.qty, addOnIds: l.addOnIds, prices: bookPrices }));
  }
  return out;
}

/** Discount check for a set of cleaned lines (also used by the builder preview). */
async function checkDiscount(strapi, orgId, lines, priceBookId) {
  const [policy, book, productsById] = await Promise.all([
    loadPolicy(strapi, orgId),
    loadBook(strapi, orgId, priceBookId),
    loadProducts(strapi, orgId, (lines || []).map((l) => l.productId).filter(Boolean)),
  ]);
  return cpq.evaluateDiscount(lines, {
    orgMaxPct: policy.maxDiscountPct,
    bookMaxPct: book?.maxDiscountPct,
    bookPrices: book?.prices || {},
    productsById,
  });
}

/** Members who can approve: org Admin / Manager role, or CRM proposals manage. */
async function approverIds(strapi, orgId, excludeId) {
  const rows = await strapi.entityService.findMany('api::organization-user.organization-user', {
    filters: { organization: orgId, isActive: true },
    populate: { user: { fields: ['id'] }, role: true },
    limit: 2000,
  });
  return rows
    .filter((r) => {
      const code = String(r.role?.code || r.role?.name || '').toLowerCase();
      return code === 'manager' || canAccessPermissions(r.role?.permissions || {}, 'crm', 'proposals', 'manage', r.role);
    })
    .map((r) => Number(r.user?.id))
    .filter((id) => id && id !== Number(excludeId));
}

/**
 * Mutates nothing; returns { data, error, newlyPending, versioned }.
 * `existing` is null on create.
 */
async function prepareQuoteSave(strapi, { orgId, actorId, data: raw, existing }) {
  let data = cpq.stripProtected(raw);
  const requestedStatus = data.status;
  const bookId = data.priceBookId !== undefined ? data.priceBookId : existing?.priceBookId;
  if (Array.isArray(data.lineItems) && data.lineItems.some((l) => l?.isBundle)) {
    const book = await loadBook(strapi, orgId, bookId);
    data.lineItems = await expandBundleLines(strapi, orgId, data.lineItems, book?.prices || {});
  }
  let versioned = false;
  if (existing && cpq.needsNewVersion(existing, data)) {
    data = { ...data, ...cpq.bumpVersion(existing, actorId) };
    versioned = true;
  }
  const quoteError = applyQuoteLines(data, existing);
  if (quoteError) return { error: quoteError };

  let newlyPending = false;
  const lines = data.lineItems !== undefined ? data.lineItems : existing?.lineItems;
  if (data.lineItems !== undefined || data.priceBookId !== undefined) {
    const evaluation = Array.isArray(lines) && lines.length
      ? await checkDiscount(strapi, orgId, lines, bookId)
      : { requiresApproval: false, maxPct: 0, maxAllowedPct: null, violations: [] };
    const status = data.status || existing?.status || 'DRAFT';
    const next = cpq.nextApproval(existing?.approval || null, evaluation, status);
    data.approval = next.approval;
    if (next.status !== status || next.status === 'PENDING_APPROVAL') data.status = next.status;
    newlyPending = next.newlyPending;
  }
  const block = cpq.statusChangeBlock(existing, { ...data, status: requestedStatus });
  if (block) return { error: block, blocked: true };
  return { data, newlyPending, versioned };
}

async function notifyApprovers(strapi, { orgId, actorId, quote }) {
  const userIds = await approverIds(strapi, orgId, actorId);
  await notifyUsers(strapi, {
    userIds,
    organizationId: orgId,
    type: 'warning',
    title: 'Quote needs discount approval',
    message: `${quote.proposalNumber || quote.title || `Quote #${quote.id}`} has a ${quote.approval?.maxPct ?? ''}% discount, above the ${quote.approval?.maxAllowedPct ?? ''}% limit.`,
    data: { entityType: 'proposal', entityId: quote.id, link: `/clients/proposals/${quote.documentId || quote.id}` },
  });
}

async function notifyRequester(strapi, { orgId, quote, approved, actorId }) {
  const owner = Number(quote.assignedTo?.id ?? quote.assignedTo);
  if (!owner || owner === Number(actorId)) return;
  await notifyUsers(strapi, {
    userIds: [owner],
    organizationId: orgId,
    type: approved ? 'success' : 'warning',
    title: approved ? 'Quote discount approved' : 'Quote discount rejected',
    message: `${quote.proposalNumber || quote.title || `Quote #${quote.id}`}${approved ? ' can now be sent.' : ' was not approved.'}`,
    data: { entityType: 'proposal', entityId: quote.id, link: `/clients/proposals/${quote.documentId || quote.id}` },
  });
}

module.exports = { prepareQuoteSave, checkDiscount, expandBundleLines, loadPolicy, loadBook, notifyApprovers, notifyRequester, approverIds, POLICY_UID };
