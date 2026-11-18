/**
 * GST helpers for the browser (G13). Mirrors apps/backend/src/utils/gst.js — the server
 * recomputes on save; this is for live previews.
 */

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function stateCodeFromGstin(gstin) {
  const m = String(gstin || '').trim().match(/^(\d{2})[A-Z0-9]{13}$/i);
  return m ? m[1] : null;
}

export function isValidGstin(gstin) {
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i.test(String(gstin || '').trim());
}

/** lines: { qty, unitPrice, discountPct, gstRate } → per-line taxable/tax and totals with CGST/SGST or IGST. */
export function calculateQuote(lines, sellerGstin, buyerGstin) {
  const rows = (lines || []).map((l) => {
    const qty = Number(l.qty) || 0;
    const price = Number(l.unitPrice) || 0;
    const disc = Math.min(100, Math.max(0, Number(l.discountPct) || 0));
    const taxable = r2(qty * price * (1 - disc / 100));
    const tax = r2((taxable * (Number(l.gstRate) || 0)) / 100);
    return { ...l, taxable, tax, amount: r2(taxable + tax) };
  });
  const s = stateCodeFromGstin(sellerGstin);
  const b = stateCodeFromGstin(buyerGstin);
  const intra = Boolean(s && (!b || b === s));
  const subtotal = r2(rows.reduce((a, r) => a + r.taxable, 0));
  const tax = r2(rows.reduce((a, r) => a + r.tax, 0));
  return { rows, intra, subtotal, tax, total: r2(subtotal + tax) };
}

/**
 * Invoices raised from catalogue quotes carry gstRate (+ tax) per line. Returns null for classic invoices.
 * rows: labelled CGST/SGST or IGST amounts per rate.
 */
export function gstBreakup(invoice, lineItems) {
  const lines = (lineItems || []).filter((l) => l && l.name && l.gstRate != null);
  if (!lines.length) return null;
  const intra = !/IGST/i.test(invoice?.taxLabel || '');
  const byRate = new Map();
  for (const l of lines) {
    const taxable = (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0);
    const t = l.tax != null ? Number(l.tax) : (taxable * Number(l.gstRate)) / 100;
    byRate.set(Number(l.gstRate), (byRate.get(Number(l.gstRate)) || 0) + t);
  }
  const rows = [];
  for (const [rate, amount] of [...byRate.entries()].sort((a, b) => a[0] - b[0])) {
    if (!amount) continue;
    if (intra) {
      const half = r2(amount / 2);
      rows.push({ label: `CGST @ ${rate / 2}%`, amount: half }, { label: `SGST @ ${rate / 2}%`, amount: r2(amount - half) });
    } else {
      rows.push({ label: `IGST @ ${rate}%`, amount: r2(amount) });
    }
  }
  return { rows, tax: r2([...byRate.values()].reduce((a, b) => a + b, 0)) };
}
