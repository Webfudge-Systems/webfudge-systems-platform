'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareQuoteSave } = require('../src/utils/cpq-quote');

function fakeStrapi({ maxDiscountPct = 10, products = [], books = [] } = {}) {
  const tables = {
    'api::crm-product.crm-quote-policy': [{ id: 1, maxDiscountPct }],
    'api::crm-product.crm-product': products,
    'api::crm-product.crm-price-book': books,
  };
  return {
    entityService: {
      async findMany(uid, { filters = {} } = {}) {
        let rows = tables[uid] || [];
        if (filters.id?.$in) rows = rows.filter((r) => filters.id.$in.includes(r.id));
        else if (filters.id) rows = rows.filter((r) => r.id === filters.id);
        if (filters.isDefault) rows = rows.filter((r) => r.isDefault);
        return rows;
      },
    },
  };
}

const laptop = { id: 1, name: 'Laptop', unitPrice: 1000, gstRate: 18 };
const line = (discountPct) => ({ productId: 1, name: 'Laptop', qty: 1, unitPrice: 1000, gstRate: 18, discountPct });

test('acceptance: quote above max discount goes to PENDING_APPROVAL and cannot be sent', async () => {
  const strapi = fakeStrapi({ products: [laptop] });
  const created = await prepareQuoteSave(strapi, { orgId: 1, actorId: 5, existing: null, data: { documentType: 'QUOTE', status: 'SENT', lineItems: [line(20)] } });
  assert.equal(created.blocked, true);

  const draft = await prepareQuoteSave(strapi, { orgId: 1, actorId: 5, existing: null, data: { documentType: 'QUOTE', lineItems: [line(20)] } });
  assert.equal(draft.data.status, 'PENDING_APPROVAL');
  assert.equal(draft.newlyPending, true);
  assert.equal(draft.data.quoteTotals.subtotal, 800);

  const send = await prepareQuoteSave(strapi, { orgId: 1, actorId: 5, existing: { ...draft.data, id: 3 }, data: { status: 'SENT' } });
  assert.match(send.error, /approval/);
});

test('acceptance: approved quote can be sent', async () => {
  const strapi = fakeStrapi({ products: [laptop] });
  const existing = { id: 3, status: 'DRAFT', lineItems: [line(20)], approval: { state: 'approved', approvedDiscountPct: 20 } };
  const send = await prepareQuoteSave(strapi, { orgId: 1, actorId: 5, existing, data: { status: 'SENT' } });
  assert.equal(send.error, undefined);
  assert.equal(send.data.status, 'SENT');
});

test('versioning: raising the discount on a sent approved quote makes v2 and needs approval again', async () => {
  const strapi = fakeStrapi({ products: [laptop] });
  const existing = { id: 3, status: 'SENT', quoteVersion: 1, lineItems: [line(20)], approval: { state: 'approved', approvedDiscountPct: 20 } };
  const r = await prepareQuoteSave(strapi, { orgId: 1, actorId: 5, existing, data: { lineItems: [line(30)] } });
  assert.equal(r.versioned, true);
  assert.equal(r.data.quoteVersion, 2);
  assert.equal(r.data.versionHistory[0].version, 1);
  assert.equal(r.data.status, 'PENDING_APPROVAL');
});

test('versioning: lowering the discount keeps approval on the new version', async () => {
  const strapi = fakeStrapi({ products: [laptop] });
  const existing = { id: 3, status: 'SENT', quoteVersion: 1, lineItems: [line(20)], approval: { state: 'approved', approvedDiscountPct: 20 } };
  const r = await prepareQuoteSave(strapi, { orgId: 1, actorId: 5, existing, data: { lineItems: [line(15)] } });
  assert.equal(r.data.quoteVersion, 2);
  assert.equal(r.data.status, 'DRAFT');
  assert.equal(r.data.approval.state, 'approved');
});

test('bundles: bundle line expands into components with their own GST', async () => {
  const bag = { id: 2, name: 'Bag', unitPrice: 100, gstRate: 12 };
  const kit = { id: 9, name: 'Kit', bundleItems: [{ productId: 1, qty: 1 }, { productId: 2, qty: 1, optional: true }] };
  const strapi = fakeStrapi({ products: [laptop, bag, kit] });
  const r = await prepareQuoteSave(strapi, { orgId: 1, actorId: 5, existing: null, data: { lineItems: [{ isBundle: true, productId: 9, qty: 2, addOnIds: [2] }] } });
  assert.deepEqual(r.data.lineItems.map((l) => [l.name, l.qty, l.gstRate]), [['Laptop', 2, 18], ['Bag', 2, 12]]);
  assert.equal(r.data.quoteTotals.total, 2000 * 1.18 + 200 * 1.12);
});

test('client cannot self-approve', async () => {
  const strapi = fakeStrapi({ products: [laptop] });
  const r = await prepareQuoteSave(strapi, { orgId: 1, actorId: 5, existing: null, data: { lineItems: [line(20)], approval: { state: 'approved', approvedDiscountPct: 99 } } });
  assert.equal(r.data.approval.state, 'pending');
});
