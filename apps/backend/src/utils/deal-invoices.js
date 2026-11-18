'use strict';

/**
 * Draft invoices raised when a deal is won (ticket G23).
 * plan: 'none' | 'full' (one invoice for the deal value) | 'split50' (50% advance now + 50% on delivery).
 */

const INVOICE_UID = 'api::invoice.invoice';

async function nextInvoiceNumber(strapi, orgId) {
  const count = await strapi.db.query(INVOICE_UID).count({ where: { organization: orgId } });
  for (let n = count + 1; n < count + 1000; n++) {
    const candidate = `INV-${String(n).padStart(5, '0')}`;
    const clash = await strapi.db.query(INVOICE_UID).count({ where: { organization: orgId, invoiceNumber: candidate } });
    if (!clash) return candidate;
  }
  return `INV-${Date.now()}`;
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {{ orgId, actorId, deal, clientAccount, lead, projectId, plan }} args
 * @returns {Promise<object[]>} created invoices
 */
async function createWonDealInvoices(strapi, { orgId, actorId, deal, clientAccount, lead, plan }) {
  const value = Number(deal.value) || 0;
  if (plan === 'none' || value <= 0) return [];
  const bill = clientAccount || lead || {};
  const parts =
    plan === 'split50'
      ? [
          { label: 'Advance (50%)', amount: Math.round(value * 50) / 100, due: 7 },
          { label: 'On delivery (50%)', amount: Math.round(value * 100 - Math.round(value * 50)) / 100, due: 30 },
        ]
      : [{ label: 'Project fee', amount: value, due: 15 }];

  const created = [];
  for (const part of parts) {
    const invoiceNumber = await nextInvoiceNumber(strapi, orgId);
    const lineItems = [
      { id: 1, name: `${deal.name || 'Project'} - ${part.label}`, description: '', qty: '1', rate: String(part.amount), unit: '' },
    ];
    const entry = await strapi.entityService.create(INVOICE_UID, {
      data: {
        invoiceNumber,
        documentType: 'INVOICE',
        status: 'DRAFT',
        invoiceDate: addDays(0),
        dueDate: addDays(part.due),
        currency: 'INR',
        billToCompany: bill.companyName || null,
        billToEmail: bill.email || null,
        billToPhone: bill.phone || null,
        billToAddress: [bill.address, bill.city, bill.state, bill.zipCode].filter(Boolean).join(', ') || null,
        lineItems,
        subtotal: part.amount,
        total: part.amount,
        balanceDue: part.amount,
        amountPaid: 0,
        notes: `Raised automatically when deal "${deal.name}" was won. Review before sending.`,
        organization: orgId,
        assignedTo: actorId,
        deal: deal.id,
        clientAccount: clientAccount?.id || null,
        leadCompany: lead?.id || null,
      },
    });
    created.push(entry);
  }
  return created;
}

module.exports = { createWonDealInvoices, nextInvoiceNumber };
