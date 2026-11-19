'use strict';

/**
 * GST quote / invoice maths (G13).
 * Line: { productId?, name, description?, hsnSac?, unit?, qty, unitPrice, discountPct?, gstRate }
 * Intra-state (seller and buyer GSTIN state codes match, or buyer has no GSTIN and the place of
 * supply is the seller's state) → CGST + SGST (half each); otherwise IGST.
 */

const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** First two digits of a GSTIN = state code. */
function stateCodeFromGstin(gstin) {
  const m = String(gstin || '').trim().match(/^(\d{2})[A-Z0-9]{13}$/i);
  return m ? m[1] : null;
}

function cleanLine(raw) {
  const qty = Number(raw.qty);
  const unitPrice = Number(raw.unitPrice);
  const discountPct = Math.min(100, Math.max(0, Number(raw.discountPct) || 0));
  const gstRate = Number(raw.gstRate);
  if (!String(raw.name || '').trim()) return { error: 'Every line needs a name' };
  if (!Number.isFinite(qty) || qty <= 0) return { error: `Quantity must be more than 0 (${raw.name})` };
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return { error: `Price can't be negative (${raw.name})` };
  if (!GST_RATES.includes(gstRate)) return { error: `GST rate must be one of ${GST_RATES.join(', ')}% (${raw.name})` };
  return {
    line: {
      productId: raw.productId ? Number(raw.productId) : null,
      name: String(raw.name).trim().slice(0, 200),
      description: String(raw.description || '').slice(0, 1000),
      hsnSac: String(raw.hsnSac || '').trim().slice(0, 12),
      unit: String(raw.unit || 'Nos').slice(0, 20),
      qty,
      unitPrice: r2(unitPrice),
      discountPct,
      gstRate,
    },
  };
}

/**
 * @param {object[]} rawLines
 * @param {{ sellerGstin?: string, buyerGstin?: string, placeOfSupply?: string }} parties
 */
function calculate(rawLines, parties = {}) {
  if (!Array.isArray(rawLines) || !rawLines.length) return { error: 'Add at least one line' };
  if (rawLines.length > 200) return { error: 'At most 200 lines' };
  const lines = [];
  for (const raw of rawLines) {
    const { line, error } = cleanLine(raw || {});
    if (error) return { error };
    const gross = line.qty * line.unitPrice;
    const discount = (gross * line.discountPct) / 100;
    const taxable = r2(gross - discount);
    const tax = r2((taxable * line.gstRate) / 100);
    lines.push({ ...line, taxable, tax, amount: r2(taxable + tax) });
  }
  const sellerState = stateCodeFromGstin(parties.sellerGstin);
  const buyerState = stateCodeFromGstin(parties.buyerGstin) || (parties.placeOfSupply ? String(parties.placeOfSupply).slice(0, 2) : null);
  const intraState = Boolean(sellerState && (!buyerState || buyerState === sellerState));

  const byRate = new Map();
  for (const l of lines) {
    const row = byRate.get(l.gstRate) || { rate: l.gstRate, taxable: 0, tax: 0 };
    row.taxable += l.taxable;
    row.tax += l.tax;
    byRate.set(l.gstRate, row);
  }
  const taxSummary = [...byRate.values()]
    .sort((a, b) => a.rate - b.rate)
    .map((r) => ({
      rate: r.rate,
      taxable: r2(r.taxable),
      cgst: intraState ? r2(r.tax / 2) : 0,
      sgst: intraState ? r2(r.tax - r2(r.tax / 2)) : 0,
      igst: intraState ? 0 : r2(r.tax),
    }));
  const subtotal = r2(lines.reduce((a, l) => a + l.taxable, 0));
  const taxTotal = r2(lines.reduce((a, l) => a + l.tax, 0));
  return {
    lines,
    taxSummary,
    supply: intraState ? 'intra' : 'inter',
    subtotal,
    cgst: r2(taxSummary.reduce((a, r) => a + r.cgst, 0)),
    sgst: r2(taxSummary.reduce((a, r) => a + r.sgst, 0)),
    igst: r2(taxSummary.reduce((a, r) => a + r.igst, 0)),
    taxTotal,
    total: r2(subtotal + taxTotal),
  };
}

module.exports = { GST_RATES, stateCodeFromGstin, calculate, r2 };
