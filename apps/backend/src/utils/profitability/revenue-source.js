'use strict';

/**
 * Revenue source for project profitability (W22).
 *
 * Today: Fudge Grow invoices (api::invoice.invoice) on the project's client account or source deal.
 * When Fudge Invoice ships, replace `invoicesFor` with a reader of its invoices; the attribution
 * rules in ./index.js stay the same.
 *
 * Contract:
 *   invoicesFor(strapi, orgId, { clientAccountIds, dealIds })
 *     → [{ id, date: 'YYYY-MM-DD', amount, dealId, clientAccountId }]
 *
 * Amount is revenue before tax: subtotal − discount (credit notes count negative). Drafts,
 * cancelled invoices, proformas and receipts are ignored.
 */

const INVOICE_UID = 'api::invoice.invoice';
const relId = (v) => (v == null ? null : typeof v === 'object' ? v.id ?? null : Number(v));

function netAmount(inv) {
  const subtotal = Number(inv.subtotal) || 0;
  const base = subtotal > 0 ? subtotal - (Number(inv.discount) || 0) : Number(inv.total) || 0;
  const amount = Math.max(0, base);
  return inv.documentType === 'CREDIT_NOTE' ? -amount : amount;
}

async function invoicesFor(strapi, orgId, { clientAccountIds = [], dealIds = [] }) {
  const or = [];
  if (clientAccountIds.length) or.push({ clientAccount: { id: { $in: clientAccountIds } } });
  if (dealIds.length) or.push({ deal: { id: { $in: dealIds } } });
  if (!or.length) return [];
  const rows = await strapi.entityService.findMany(INVOICE_UID, {
    filters: {
      organization: orgId,
      documentType: { $in: ['INVOICE', 'CREDIT_NOTE'] },
      status: { $notIn: ['DRAFT', 'CANCELLED'] },
      $or: or,
    },
    fields: ['invoiceDate', 'createdAt', 'documentType', 'subtotal', 'discount', 'total'],
    populate: { deal: { fields: ['id'] }, clientAccount: { fields: ['id'] } },
    limit: 20000,
  });
  return rows.map((inv) => ({
    id: inv.id,
    date: String(inv.invoiceDate || inv.createdAt || '').slice(0, 10),
    amount: netAmount(inv),
    dealId: relId(inv.deal),
    clientAccountId: relId(inv.clientAccount),
  }));
}

module.exports = { name: 'grow-invoices', invoicesFor, netAmount };
