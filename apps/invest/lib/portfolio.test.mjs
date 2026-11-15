import { test } from 'node:test'
import assert from 'node:assert/strict'
import { xirr, computeHolding, buildPortfolio, investedOverTime } from './portfolio.mjs'
import { sipDueDates, nextDueDate, missingInstalments } from './sip.mjs'

const close = (a, b, eps = 1e-4) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`)

test('xirr: 10% over exactly one year', () => {
  close(xirr([{ date: '2025-01-01', amount: -1000 }, { date: '2026-01-01', amount: 1100 }]), 0.1, 1e-3)
})

test('xirr: matches the spreadsheet XIRR example', () => {
  // Classic Excel docs example → 0.373362535
  const r = xirr([
    { date: '2008-01-01', amount: -10000 },
    { date: '2008-03-01', amount: 2750 },
    { date: '2008-10-30', amount: 4250 },
    { date: '2009-02-15', amount: 3250 },
    { date: '2009-04-01', amount: 2750 },
  ])
  close(r, 0.373362535, 1e-6)
})

test('xirr: undefined without both signs or with a tiny span', () => {
  assert.equal(xirr([{ date: '2025-01-01', amount: -100 }]), null)
  assert.equal(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2025-01-03', amount: 101 }]), null)
  assert.equal(xirr([{ date: '2025-01-01', amount: 100 }, { date: '2026-01-03', amount: 101 }]), null)
})

test('xirr: total loss stays defined', () => {
  const r = xirr([{ date: '2025-01-01', amount: -1000 }, { date: '2026-01-01', amount: 100 }])
  close(r, -0.9, 1e-3)
})

test('FIFO: partial sell realises against the oldest lot', () => {
  const inst = { id: 1, lastPrice: 150, previousClose: 140 }
  const h = computeHolding(
    inst,
    [
      { id: 1, type: 'buy', date: '2025-01-01', units: 10, amount: 1000, charges: 0 },
      { id: 2, type: 'buy', date: '2025-06-01', units: 10, amount: 1200, charges: 0 },
      { id: 3, type: 'sell', date: '2025-09-01', units: 15, amount: 2100, charges: 0 },
    ],
    '2026-01-01'
  )
  // Sold 10 @100 + 5 @120 = 1600 cost; proceeds 2100 → realised 500
  close(h.realised, 500)
  close(h.units, 5)
  close(h.invested, 600)
  close(h.avgCost, 120)
  close(h.currentValue, 750)
  close(h.unrealised, 150)
  close(h.unrealisedPct, 0.25)
  close(h.dayChange, 50)
  assert.equal(h.isOpen, true)
})

test('charges are added to cost and deducted from proceeds', () => {
  const h = computeHolding(
    { id: 1, lastPrice: 100 },
    [
      { type: 'buy', date: '2025-01-01', units: 10, amount: 1000, charges: 20 },
      { type: 'sell', date: '2025-02-01', units: 10, amount: 1100, charges: 10 },
    ],
    '2026-01-01'
  )
  close(h.realised, 70)
  assert.equal(h.isOpen, false)
  assert.equal(h.currentValue, 0)
})

test('unpriced holdings are valued at cost and flagged', () => {
  const h = computeHolding({ id: 1, lastPrice: null }, [{ type: 'buy', date: '2025-01-01', units: 2, amount: 500 }], '2026-01-01')
  assert.equal(h.hasPrice, false)
  close(h.currentValue, 500)
  assert.equal(h.unrealised, 0)
  assert.equal(h.unrealisedPct, null)
  assert.equal(h.xirr, null)
})

test('portfolio totals, dividends and invested-over-time', () => {
  const instruments = [
    { id: 1, kind: 'stock', lastPrice: 200, previousClose: 190 },
    { id: 2, kind: 'mutual_fund', lastPrice: 12, previousClose: 12 },
    { id: 3, kind: 'stock', lastPrice: 50 }, // no transactions → not a holding
  ]
  const txs = [
    { id: 1, type: 'buy', date: '2025-01-10', units: 5, amount: 800, instrument: { id: 1 } },
    { id: 2, type: 'dividend', date: '2025-08-10', amount: 40, instrument: 1 },
    { id: 3, type: 'sip', date: '2025-02-05', units: 100, amount: 1000, instrument: { id: 2 } },
    { id: 4, type: 'sip', date: '2025-03-05', units: 90, amount: 1000, instrument: { id: 2 } },
  ]
  const { holdings, totals } = buildPortfolio(instruments, txs, '2026-01-10')
  assert.equal(holdings.length, 2)
  close(totals.invested, 2800)
  close(totals.currentValue, 1000 + 2280)
  close(totals.unrealised, 480)
  close(totals.dividends, 40)
  close(totals.totalReturn, 520)
  close(totals.dayChange, 50)
  assert.ok(totals.xirr > 0)
  const series = investedOverTime(txs)
  assert.deepEqual(series.map((r) => r.month), ['2025-01', '2025-02', '2025-03'])
  close(series.at(-1).net, 2800)
})

test('SIP schedule: monthly, quarterly, weekly, end date', () => {
  assert.deepEqual(sipDueDates({ startDate: '2026-06-10', dayOfMonth: 5 }, '2026-09-30'), ['2026-07-05', '2026-08-05', '2026-09-05'])
  assert.deepEqual(sipDueDates({ startDate: '2026-01-05', dayOfMonth: 5, frequency: 'quarterly' }, '2026-11-11'), ['2026-01-05', '2026-04-05', '2026-07-05', '2026-10-05'])
  assert.deepEqual(sipDueDates({ startDate: '2026-10-20', frequency: 'weekly' }, '2026-11-05'), ['2026-10-20', '2026-10-27', '2026-11-03'])
  assert.deepEqual(sipDueDates({ startDate: '2026-01-05', dayOfMonth: 5, endDate: '2026-03-01' }, '2026-11-11'), ['2026-01-05', '2026-02-05'])
})

test('SIP next due and missing instalments', () => {
  const sip = { startDate: '2026-08-01', dayOfMonth: 5, status: 'active' }
  assert.equal(nextDueDate(sip, '2026-11-11'), '2026-12-05')
  assert.equal(nextDueDate({ ...sip, status: 'stopped' }, '2026-11-11'), null)
  // 8 Aug covers 5 Aug (NAV lag); September and November missing
  assert.deepEqual(missingInstalments(sip, ['2026-08-08', '2026-10-06'], '2026-11-11'), ['2026-09-05', '2026-11-05'])
  assert.deepEqual(missingInstalments({ ...sip, status: 'paused' }, [], '2026-11-11'), [])
})
