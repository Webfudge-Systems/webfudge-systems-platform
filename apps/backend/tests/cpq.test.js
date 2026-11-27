'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  expandBundle,
  evaluateDiscount,
  nextApproval,
  sendBlockReason,
  needsNewVersion,
  bumpVersion,
} = require('../src/utils/cpq');

const products = {
  1: { id: 1, name: 'Laptop', unitPrice: 50000, gstRate: 18, hsnSac: '8471', unit: 'Nos' },
  2: { id: 2, name: 'Setup', unitPrice: 2000, gstRate: 18, hsnSac: '998313', unit: 'Nos', maxDiscountPct: 50 },
  3: { id: 3, name: 'Bag', unitPrice: 1500, gstRate: 12, hsnSac: '4202', unit: 'Nos' },
  9: {
    id: 9,
    name: 'Starter kit',
    bundleItems: [
      { productId: 1, qty: 1 },
      { productId: 2, qty: 1 },
      { productId: 3, qty: 1, optional: true },
    ],
  },
};

test('expandBundle: required components only, scaled by qty, own GST rate', () => {
  const lines = expandBundle(products[9], products, { qty: 2 });
  assert.deepEqual(lines.map((l) => [l.productId, l.qty, l.gstRate, l.bundleId]), [
    [1, 2, 18, 9],
    [2, 2, 18, 9],
  ]);
});

test('expandBundle: selected optional add-on is included; price book price wins', () => {
  const lines = expandBundle(products[9], products, { qty: 1, addOnIds: [3], prices: { 1: 45000 } });
  assert.equal(lines.length, 3);
  assert.equal(lines[0].unitPrice, 45000);
  assert.equal(lines[2].name, 'Bag');
});

test('evaluateDiscount: no org limit means no approval', () => {
  const r = evaluateDiscount([{ productId: 1, qty: 1, unitPrice: 50000, discountPct: 40 }], { orgMaxPct: null, productsById: products });
  assert.equal(r.requiresApproval, false);
  assert.equal(r.maxPct, 40);
});

test('evaluateDiscount: over org max needs approval', () => {
  const r = evaluateDiscount([{ productId: 1, qty: 1, unitPrice: 50000, discountPct: 15 }], { orgMaxPct: 10, productsById: products });
  assert.equal(r.requiresApproval, true);
  assert.equal(r.violations[0].limitPct, 10);
});

test('evaluateDiscount: product override beats price book beats org', () => {
  const lines = [
    { productId: 2, qty: 1, unitPrice: 2000, discountPct: 40 },
    { productId: 3, qty: 1, unitPrice: 1500, discountPct: 20 },
  ];
  const r = evaluateDiscount(lines, { orgMaxPct: 10, bookMaxPct: 25, productsById: products });
  assert.equal(r.requiresApproval, false);
});

test('evaluateDiscount: cutting unit price below catalogue counts as discount', () => {
  const r = evaluateDiscount([{ productId: 1, qty: 1, unitPrice: 40000, discountPct: 0 }], { orgMaxPct: 10, productsById: products });
  assert.equal(r.maxPct, 20);
  assert.equal(r.requiresApproval, true);
});

test('evaluateDiscount: price book price is the reference, not list price', () => {
  const r = evaluateDiscount([{ productId: 1, qty: 1, unitPrice: 45000, discountPct: 0 }], {
    orgMaxPct: 5,
    productsById: products,
    bookPrices: { 1: 45000 },
  });
  assert.equal(r.requiresApproval, false);
});

test('nextApproval: over limit on a draft goes to PENDING_APPROVAL', () => {
  const r = nextApproval(null, { requiresApproval: true, maxPct: 15, maxAllowedPct: 10 }, 'DRAFT');
  assert.equal(r.status, 'PENDING_APPROVAL');
  assert.equal(r.approval.state, 'pending');
  assert.equal(r.newlyPending, true);
});

test('nextApproval: approved stays approved when discount does not rise', () => {
  const prev = { state: 'approved', approvedDiscountPct: 15 };
  const r = nextApproval(prev, { requiresApproval: true, maxPct: 12, maxAllowedPct: 10 }, 'DRAFT');
  assert.equal(r.approval.state, 'approved');
  assert.equal(r.status, 'DRAFT');
});

test('nextApproval: approval resets when discount rises', () => {
  const prev = { state: 'approved', approvedDiscountPct: 15 };
  const r = nextApproval(prev, { requiresApproval: true, maxPct: 20, maxAllowedPct: 10 }, 'DRAFT');
  assert.equal(r.approval.state, 'pending');
  assert.equal(r.status, 'PENDING_APPROVAL');
});

test('nextApproval: back within limit clears pending', () => {
  const r = nextApproval({ state: 'pending' }, { requiresApproval: false, maxPct: 5, maxAllowedPct: 10 }, 'PENDING_APPROVAL');
  assert.equal(r.approval.state, 'none');
  assert.equal(r.status, 'DRAFT');
});

test('sendBlockReason: pending or rejected blocks; approved or none allows', () => {
  assert.match(sendBlockReason({ approval: { state: 'pending' } }), /approval/i);
  assert.match(sendBlockReason({ approval: { state: 'rejected' } }), /rejected/i);
  assert.equal(sendBlockReason({ approval: { state: 'approved' } }), null);
  assert.equal(sendBlockReason({}), null);
});

test('needsNewVersion: line edits on a sent quote version it; drafts do not', () => {
  const lines = [{ name: 'A', qty: 1, unitPrice: 1, gstRate: 18 }];
  assert.equal(needsNewVersion({ status: 'SENT', lineItems: lines }, { lineItems: [{ ...lines[0], qty: 2 }] }), true);
  assert.equal(needsNewVersion({ status: 'SENT', lineItems: lines }, { lineItems: lines }), false);
  assert.equal(needsNewVersion({ status: 'DRAFT', lineItems: lines }, { lineItems: [{ ...lines[0], qty: 2 }] }), false);
  assert.equal(needsNewVersion({ status: 'DRAFT', approval: { state: 'approved' }, lineItems: lines }, { lineItems: [] }), true);
});

test('bumpVersion: snapshots the old version and resets to DRAFT', () => {
  const existing = { quoteVersion: 1, status: 'SENT', lineItems: [{ name: 'A' }], quoteTotals: { total: 1 }, approval: { state: 'approved' } };
  const out = bumpVersion(existing, 7, new Date('2026-11-27T00:00:00Z'));
  assert.equal(out.quoteVersion, 2);
  assert.equal(out.status, 'DRAFT');
  assert.equal(out.versionHistory.length, 1);
  assert.deepEqual(out.versionHistory[0], {
    version: 1,
    status: 'SENT',
    lineItems: [{ name: 'A' }],
    quoteTotals: { total: 1 },
    approval: { state: 'approved' },
    savedBy: 7,
    savedAt: '2026-11-27T00:00:00.000Z',
  });
});

const { statusChangeBlock, stripProtected } = require('../src/utils/cpq');

test('statusChangeBlock: pending quote cannot move to SENT or ACCEPTED', () => {
  assert.match(statusChangeBlock({ approval: { state: 'pending' } }, { status: 'SENT' }), /approval/);
  assert.match(statusChangeBlock({ approval: { state: 'pending' } }, { status: 'ACCEPTED' }), /approval/);
  assert.equal(statusChangeBlock({ approval: { state: 'pending' } }, { status: 'REJECTED' }), null);
  assert.equal(statusChangeBlock({ approval: { state: 'approved' } }, { status: 'SENT' }), null);
});

test('statusChangeBlock: uses the approval computed for this save', () => {
  assert.match(statusChangeBlock({ approval: { state: 'none' } }, { status: 'SENT', approval: { state: 'pending' } }), /approval/);
});

test('stripProtected: client cannot set approval, versions or PENDING_APPROVAL', () => {
  const d = stripProtected({ approval: { state: 'approved' }, versionHistory: [], quoteVersion: 9, esign: {}, status: 'PENDING_APPROVAL', name: 'x' });
  assert.deepEqual(d, { name: 'x' });
});
