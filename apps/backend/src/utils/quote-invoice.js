'use strict';

/**
 * Catalogue quotes (G13): proposals with documentType QUOTE carry GST line items. On save the server
 * recomputes every line and the totals (never trusts client maths). A quote converts once into a
 * DRAFT GST invoice with the same lines, HSN/SAC and CGST/SGST or IGST split.
 */

const { calculate, r2 } = require('./gst');

const INVOICE_UID = 'api::invoice.invoice';

/** Mutates `data`: recomputes lineItems / quoteTotals / totalValue. Returns an error string or null. */
function applyQuoteLines(data, existing) {
  delete data.quoteTotals;
  delete data.convertedInvoice;
  if (data.lineItems === undefined) return null;
  if (data.lineItems === null || (Array.isArray(data.lineItems) && !data.lineItems.length)) {
    data.lineItems = null;
    data.quoteTotals = null;
    return null;
  }
  const result = calculate(data.lineItems, {
    sellerGstin: data.sellerGstin !== undefined ? data.sellerGstin : existing?.sellerGstin,
    buyerGstin: data.buyerGstin !== undefined ? data.buyerGstin : existing?.buyerGstin,
  });
  if (result.error) return result.error;
  data.lineItems = result.lines;
  const { lines, ...totals } = result;
  data.quoteTotals = totals;
  data.totalValue = result.total;
  return null;
}

async function nextInvoiceNumber(strapi, orgId) {
  const n = await strapi.db.query(INVOICE_UID).count({ where: { organization: orgId } });
  for (let i = n + 1; i < n + 500; i++) {
    const candidate = `INV-${String(i).padStart(5, '0')}`;
    const clash = await strapi.db.query(INVOICE_UID).count({ where: { organization: orgId, invoiceNumber: candidate } });
    if (!clash) return candidate;
  }
  return `INV-${Date.now()}`;
}

const relId = (v) => (v == null ? null : typeof v === 'object' ? v.id ?? null : Number(v));

/** Create the draft invoice for a quote (caller checked org + permissions). */
async function createInvoiceFromQuote(strapi, { orgId, actorId, quote }) {
  const recalc = calculate(quote.lineItems, { sellerGstin: quote.sellerGstin, buyerGstin: quote.buyerGstin });
  if (recalc.error) return { error: recalc.error };
  const today = new Date();
  const due = new Date(today.getTime() + 15 * 86400000);
  const lineItems = recalc.lines.map((l, i) => ({
    id: i + 1,
    name: l.name,
    description: l.description || '',
    qty: String(l.qty),
    // invoice pages compute qty × rate, so the rate carries the line discount
    rate: String(Math.round((l.taxable / l.qty) * 10000) / 10000),
    unit: l.unit,
    hsnSac: l.hsnSac,
    gstRate: l.gstRate,
    discountPct: l.discountPct,
    listPrice: l.unitPrice,
    taxable: l.taxable,
    tax: l.tax,
    productId: l.productId,
  }));
  const effectiveRate = recalc.subtotal ? Math.round((recalc.taxTotal / recalc.subtotal) * 100 * 10000) / 10000 : 0;
  const invoice = await strapi.entityService.create(INVOICE_UID, {
    data: {
      invoiceNumber: await nextInvoiceNumber(strapi, orgId),
      documentType: 'INVOICE',
      status: 'DRAFT',
      invoiceDate: today.toISOString().slice(0, 10),
      dueDate: due.toISOString().slice(0, 10),
      terms: 'Net 15',
      currency: quote.currency || 'INR',
      fromOrgName: quote.preparedByCompany || null,
      fromOrgEmail: quote.preparedByEmail || null,
      fromOrgPhone: quote.preparedByPhone || null,
      fromOrgGstin: quote.sellerGstin || null,
      billToName: quote.clientContactName || null,
      billToCompany: quote.clientCompanyName || null,
      billToEmail: quote.clientEmail || null,
      billToPhone: quote.clientPhone || null,
      billToAddress: quote.clientAddress || null,
      billToGstin: quote.buyerGstin || null,
      sameAsShipTo: true,
      lineItems,
      taxRate: effectiveRate,
      taxLabel: recalc.supply === 'intra' ? 'GST (CGST + SGST)' : 'IGST',
      discount: 0,
      amountPaid: 0,
      subtotal: recalc.subtotal,
      total: recalc.total,
      balanceDue: recalc.total,
      notes: `Raised from quote ${quote.proposalNumber || `#${quote.id}`}.`,
      organization: orgId,
      assignedTo: relId(quote.assignedTo) || actorId,
      leadCompany: relId(quote.leadCompany),
      clientAccount: relId(quote.clientAccount),
      deal: relId(quote.deal),
    },
  });
  return { invoice, totals: { ...recalc, lines: undefined } };
}

module.exports = { applyQuoteLines, createInvoiceFromQuote, r2 };
