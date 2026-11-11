/**
 * Portfolio maths for the internal investment manager. Pure functions, no React, so they are
 * unit-tested with `node --test` (see portfolio.test.mjs).
 *
 * Conventions
 * - Cost basis is FIFO (matches how Indian capital gains are computed).
 * - Buy / SIP cost = amount + charges. Sell proceeds = amount − charges.
 * - "Invested" is the cost of the units still held. Realised P&L and dividends are tracked apart.
 * - XIRR uses every cash flow (buys/SIPs out, sells/dividends in) plus today's value as the final inflow.
 */

const DAY_MS = 86400000

export function toIsoDate(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10)
}

function n(v) {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function relId(rel) {
  if (rel == null) return null
  return typeof rel === 'object' ? rel.id ?? null : rel
}

const TYPE_ORDER = { buy: 0, sip: 0, dividend: 1, sell: 2 }

export function sortTransactions(txs) {
  return [...txs].sort(
    (a, b) =>
      String(a.date).localeCompare(String(b.date)) ||
      (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) ||
      n(a.id) - n(b.id)
  )
}

/**
 * XIRR by Newton–Raphson with a bisection fallback.
 * @param {{ date: string, amount: number }[]} flows negative = money out, positive = money in
 * @returns {number|null} annualised rate (0.12 = 12%), or null when undefined
 */
export function xirr(flows) {
  const cf = flows.filter((f) => Number.isFinite(f.amount) && f.amount !== 0 && f.date)
  if (cf.length < 2) return null
  if (!cf.some((f) => f.amount < 0) || !cf.some((f) => f.amount > 0)) return null
  const t0 = Math.min(...cf.map((f) => new Date(f.date).getTime()))
  const tMax = Math.max(...cf.map((f) => new Date(f.date).getTime()))
  // Annualising a few days of movement produces absurd numbers; callers show "—" instead.
  if ((tMax - t0) / DAY_MS < 7) return null
  const years = cf.map((f) => (new Date(f.date).getTime() - t0) / (365 * DAY_MS))

  const npv = (r) => cf.reduce((s, f, i) => s + f.amount / Math.pow(1 + r, years[i]), 0)
  const dnpv = (r) => cf.reduce((s, f, i) => s - (years[i] * f.amount) / Math.pow(1 + r, years[i] + 1), 0)

  let r = 0.1
  for (let i = 0; i < 100; i++) {
    const v = npv(r)
    const d = dnpv(r)
    if (!Number.isFinite(v) || !Number.isFinite(d) || d === 0) break
    const next = r - v / d
    if (!Number.isFinite(next) || next <= -0.9999) break
    if (Math.abs(next - r) < 1e-9) return next
    r = next
  }

  // Bisection on [-0.9999, 100]
  let lo = -0.9999
  let hi = 100
  let fLo = npv(lo)
  const fHi = npv(hi)
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid)
    if (Math.abs(fMid) < 1e-7 || hi - lo < 1e-10) return mid
    if (fLo * fMid < 0) hi = mid
    else {
      lo = mid
      fLo = fMid
    }
  }
  return (lo + hi) / 2
}

/**
 * Build one holding from an instrument and its transactions.
 */
export function computeHolding(instrument, transactions, today = toIsoDate()) {
  const lots = [] // { units, costPerUnit, date }
  let realised = 0
  let dividends = 0
  let totalBought = 0
  let totalSoldProceeds = 0
  let oversold = 0
  const flows = []

  for (const tx of sortTransactions(transactions)) {
    const units = n(tx.units)
    const amount = n(tx.amount)
    const charges = n(tx.charges)
    if (tx.type === 'buy' || tx.type === 'sip') {
      if (units <= 0) continue
      const cost = amount + charges
      lots.push({ units, costPerUnit: cost / units, date: tx.date })
      totalBought += cost
      flows.push({ date: tx.date, amount: -cost })
    } else if (tx.type === 'sell') {
      if (units <= 0) continue
      const proceeds = amount - charges
      let left = units
      let costOfSold = 0
      while (left > 1e-9 && lots.length) {
        const lot = lots[0]
        const take = Math.min(lot.units, left)
        costOfSold += take * lot.costPerUnit
        lot.units -= take
        left -= take
        if (lot.units <= 1e-9) lots.shift()
      }
      if (left > 1e-9) oversold += left
      realised += proceeds - costOfSold
      totalSoldProceeds += proceeds
      flows.push({ date: tx.date, amount: proceeds })
    } else if (tx.type === 'dividend') {
      dividends += amount - charges
      flows.push({ date: tx.date, amount: amount - charges })
    }
  }

  const units = lots.reduce((s, l) => s + l.units, 0)
  const invested = lots.reduce((s, l) => s + l.units * l.costPerUnit, 0)
  const price = instrument?.lastPrice != null && Number.isFinite(Number(instrument.lastPrice)) ? Number(instrument.lastPrice) : null
  const prev = instrument?.previousClose != null && Number.isFinite(Number(instrument.previousClose)) ? Number(instrument.previousClose) : null
  const hasPrice = price != null
  const currentValue = units > 1e-9 ? (hasPrice ? units * price : invested) : 0
  const unrealised = units > 1e-9 && hasPrice ? currentValue - invested : 0
  const dayChange = units > 1e-9 && hasPrice && prev ? units * (price - prev) : 0

  const xirrFlows = units > 1e-9 ? [...flows, { date: today, amount: currentValue }] : flows

  return {
    instrument,
    id: instrument?.id,
    units: units > 1e-9 ? units : 0,
    invested,
    avgCost: units > 1e-9 ? invested / units : 0,
    price,
    previousClose: prev,
    hasPrice,
    currentValue,
    unrealised,
    unrealisedPct: invested > 0 && hasPrice ? unrealised / invested : null,
    dayChange,
    dayChangePct: prev && hasPrice ? (price - prev) / prev : null,
    realised,
    dividends,
    totalReturn: unrealised + realised + dividends,
    totalBought,
    totalSoldProceeds,
    oversold,
    isOpen: units > 1e-9,
    xirr: hasPrice || units <= 1e-9 ? xirr(xirrFlows) : null,
    firstDate: flows[0]?.date ?? null,
    txCount: transactions.length,
    flows,
  }
}

/**
 * @returns {{ holdings: ReturnType<typeof computeHolding>[], totals: object }}
 */
export function buildPortfolio(instruments, transactions, today = toIsoDate()) {
  const byInstrument = new Map()
  for (const tx of transactions) {
    const id = relId(tx.instrument)
    if (id == null) continue
    if (!byInstrument.has(id)) byInstrument.set(id, [])
    byInstrument.get(id).push(tx)
  }

  const holdings = instruments
    .filter((inst) => byInstrument.has(inst.id))
    .map((inst) => computeHolding(inst, byInstrument.get(inst.id), today))

  const open = holdings.filter((h) => h.isOpen)
  const sum = (arr, k) => arr.reduce((s, h) => s + (Number.isFinite(h[k]) ? h[k] : 0), 0)
  const invested = sum(open, 'invested')
  const currentValue = sum(open, 'currentValue')
  const unrealised = sum(open, 'unrealised')
  const pricedInvested = open.filter((h) => h.hasPrice).reduce((s, h) => s + h.invested, 0)
  const dayChange = sum(open, 'dayChange')
  const prevValue = open.reduce((s, h) => s + (h.hasPrice && h.previousClose ? h.units * h.previousClose : 0), 0)

  const allFlows = holdings.flatMap((h) => h.flows)
  if (currentValue > 0) allFlows.push({ date: today, amount: currentValue })

  const totals = {
    invested,
    currentValue,
    unrealised,
    unrealisedPct: pricedInvested > 0 ? unrealised / pricedInvested : null,
    realised: sum(holdings, 'realised'),
    dividends: sum(holdings, 'dividends'),
    dayChange,
    dayChangePct: prevValue > 0 ? dayChange / prevValue : null,
    xirr: xirr(allFlows),
    openCount: open.length,
    closedCount: holdings.length - open.length,
    unpricedCount: open.filter((h) => !h.hasPrice).length,
  }
  totals.totalReturn = totals.unrealised + totals.realised + totals.dividends
  return { holdings, totals }
}

/** Current value / invested grouped by instrument kind (for the allocation chart). */
export function allocationByKind(holdings) {
  const map = new Map()
  for (const h of holdings) {
    if (!h.isOpen) continue
    const kind = h.instrument?.kind || 'other'
    const row = map.get(kind) || { kind, invested: 0, currentValue: 0, count: 0 }
    row.invested += h.invested
    row.currentValue += h.currentValue
    row.count += 1
    map.set(kind, row)
  }
  return [...map.values()].sort((a, b) => b.currentValue - a.currentValue)
}

/** Cumulative net money put in over time (buys + SIPs − sell proceeds), month by month. */
export function investedOverTime(transactions) {
  const byMonth = new Map()
  for (const tx of sortTransactions(transactions)) {
    const month = String(tx.date).slice(0, 7)
    let delta = 0
    if (tx.type === 'buy' || tx.type === 'sip') delta = n(tx.amount) + n(tx.charges)
    else if (tx.type === 'sell') delta = -(n(tx.amount) - n(tx.charges))
    else continue
    byMonth.set(month, (byMonth.get(month) || 0) + delta)
  }
  let running = 0
  return [...byMonth.entries()].map(([month, delta]) => {
    running += delta
    return { month, net: running, added: delta }
  })
}
