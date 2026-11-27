'use strict';

/**
 * CPQ rules (G27): bundles, discount limits, approval state, quote versions. Pure functions;
 * GST maths stays in ./gst. Discount per line = drop from the reference price (price book price,
 * else catalogue price, else the line's own price) after the line discount, so lowering the unit
 * price can't bypass the limit. Limit per line: product override → price book → org policy.
 */

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Bundle product → component lines (required + chosen optional add-ons), qty scaled. */
function expandBundle(bundle, productsById, { qty = 1, addOnIds = [], prices = {} } = {}) {
  const chosen = new Set((addOnIds || []).map(Number));
  const out = [];
  for (const item of Array.isArray(bundle?.bundleItems) ? bundle.bundleItems : []) {
    const p = productsById[item.productId];
    if (!p || (item.optional && !chosen.has(Number(item.productId)))) continue;
    out.push({
      productId: p.id,
      name: p.name,
      description: p.description || '',
      hsnSac: p.hsnSac || '',
      unit: p.unit || 'Nos',
      qty: (Number(item.qty) || 1) * (Number(qty) || 1),
      unitPrice: num(prices[p.id]) ?? (Number(p.unitPrice) || 0),
      discountPct: 0,
      gstRate: Number(p.gstRate) || 0,
      bundleId: bundle.id,
      bundleName: bundle.name,
      optional: Boolean(item.optional),
    });
  }
  return out;
}

/** @returns {{ maxPct, maxAllowedPct, violations: {index,name,discountPct,limitPct}[], requiresApproval }} */
function evaluateDiscount(lines, { orgMaxPct = null, bookMaxPct = null, productsById = {}, bookPrices = {} } = {}) {
  let maxPct = 0;
  let maxAllowedPct = null;
  const violations = [];
  (Array.isArray(lines) ? lines : []).forEach((l, index) => {
    const qty = Number(l.qty) || 0;
    const unit = Number(l.unitPrice) || 0;
    const p = l.productId ? productsById[l.productId] : null;
    const ref = Math.max(unit, num(bookPrices[l.productId]) ?? num(p?.unitPrice) ?? unit);
    if (!qty || !ref) return;
    const net = unit * (1 - Math.min(100, Math.max(0, Number(l.discountPct) || 0)) / 100);
    const pct = r2((1 - net / ref) * 100);
    maxPct = Math.max(maxPct, pct);
    const limit = num(p?.maxDiscountPct) ?? num(bookMaxPct) ?? num(orgMaxPct);
    if (limit === null) return;
    maxAllowedPct = maxAllowedPct === null ? limit : Math.min(maxAllowedPct, limit);
    if (pct > limit + 1e-9) violations.push({ index, name: l.name, discountPct: pct, limitPct: limit });
  });
  return { maxPct, maxAllowedPct, violations, requiresApproval: violations.length > 0 };
}

/** Approval after a save. Approved stays approved unless the discount rises past what was approved. */
function nextApproval(prev, evaluation, status) {
  const p = prev || { state: 'none' };
  if (!evaluation.requiresApproval) {
    return { approval: { state: 'none', maxPct: evaluation.maxPct }, status: status === 'PENDING_APPROVAL' ? 'DRAFT' : status, newlyPending: false };
  }
  if (p.state === 'approved' && evaluation.maxPct <= Number(p.approvedDiscountPct || 0) + 1e-9) {
    return { approval: { ...p, maxPct: evaluation.maxPct }, status: status === 'PENDING_APPROVAL' ? 'DRAFT' : status, newlyPending: false };
  }
  return {
    approval: {
      state: 'pending',
      maxPct: evaluation.maxPct,
      maxAllowedPct: evaluation.maxAllowedPct,
      violations: evaluation.violations,
      requestedAt: p.state === 'pending' ? p.requestedAt : new Date().toISOString(),
    },
    status: 'PENDING_APPROVAL',
    newlyPending: p.state !== 'pending',
  };
}

/** Why a quote can't be sent / converted / sent for signature, or null. */
function sendBlockReason(quote) {
  const s = quote?.approval?.state;
  if (s === 'pending') return 'This quote is above the maximum discount and needs manager approval before it can be sent.';
  if (s === 'rejected') return 'The discount on this quote was rejected. Lower the discount or ask for approval again.';
  return null;
}

const LOCKED = new Set(['SENT', 'ACCEPTED']);
const sameLines = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

/** Editing lines of a sent / accepted / approved quote creates a new version. */
function needsNewVersion(existing, data) {
  if (data.lineItems === undefined) return false;
  const locked = LOCKED.has(existing?.status) || existing?.approval?.state === 'approved';
  if (!locked) return false;
  const next = Array.isArray(data.lineItems) && !data.lineItems.length ? null : data.lineItems;
  return !sameLines(existing.lineItems, next);
}

/** Fields to merge into the update: history snapshot, version +1, back to DRAFT. */
function bumpVersion(existing, actorId, now = new Date()) {
  const history = Array.isArray(existing.versionHistory) ? existing.versionHistory : [];
  const version = Number(existing.quoteVersion) || 1;
  return {
    quoteVersion: version + 1,
    status: 'DRAFT',
    versionHistory: [
      ...history,
      {
        version,
        status: existing.status,
        lineItems: existing.lineItems || null,
        quoteTotals: existing.quoteTotals || null,
        approval: existing.approval || null,
        savedBy: actorId ?? null,
        savedAt: now.toISOString(),
      },
    ].slice(-50),
  };
}

/** Moving to SENT / ACCEPTED is blocked while approval is pending or rejected. */
function statusChangeBlock(existing, data) {
  if (!LOCKED.has(data.status)) return null;
  return sendBlockReason({ approval: data.approval !== undefined ? data.approval : existing?.approval });
}

/** Server-owned fields the client may not write. */
function stripProtected(data) {
  const out = { ...data };
  for (const k of ['approval', 'versionHistory', 'quoteVersion', 'esign']) delete out[k];
  if (out.status === 'PENDING_APPROVAL') delete out.status;
  return out;
}

module.exports = {
  expandBundle,
  evaluateDiscount,
  nextApproval,
  sendBlockReason,
  needsNewVersion,
  bumpVersion,
  statusChangeBlock,
  stripProtected,
};
