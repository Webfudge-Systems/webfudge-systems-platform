'use client'

function roundAmount(value) {
  return Math.max(0, Math.round(Number(value || 0)))
}

export function deriveTdsRate(annualGross) {
  if (annualGross <= 500000) return 0
  if (annualGross <= 1000000) return 0.05
  return 0.1
}

export function computePayrollFromStructure(structure) {
  if (!structure) {
    return {
      basic: 0,
      hra: 0,
      specialAllowance: 0,
      fbp: 0,
      gross: 0,
      pf: 0,
      esi: 0,
      pt: 0,
      tds: 0,
      deductionsTotal: 0,
      net: 0,
      missingSalaryStructure: true,
      tdsEstimate: true,
    }
  }

  const annualCtc = roundAmount(structure.ctc)
  const monthlyGross = roundAmount(annualCtc / 12)
  const basic = roundAmount((monthlyGross * Number(structure.basicPercent || 0)) / 100)
  const hra = roundAmount((monthlyGross * Number(structure.hraPercent || 0)) / 100)
  const specialAllowance = roundAmount((monthlyGross * Number(structure.specialAllowancePercent || 0)) / 100)
  const fbp = roundAmount(monthlyGross - basic - hra - specialAllowance)

  const pf = roundAmount(Math.min(basic, 15000) * 0.12)
  const esi = monthlyGross <= 21000 ? roundAmount(monthlyGross * 0.0075) : 0
  const pt = monthlyGross > 15000 ? 200 : 0
  const tds = roundAmount(monthlyGross * deriveTdsRate(annualCtc))
  const deductionsTotal = roundAmount(pf + esi + pt + tds)
  const net = roundAmount(monthlyGross - deductionsTotal)

  return {
    basic,
    hra,
    specialAllowance,
    fbp,
    gross: monthlyGross,
    pf,
    esi,
    pt,
    tds,
    deductionsTotal,
    net,
    missingSalaryStructure: false,
    tdsEstimate: true,
  }
}

export function aggregateRunTotals(lineItems = []) {
  return lineItems.reduce(
    (acc, row) => {
      acc.totalEmployees += 1
      acc.totalGross += Number(row.gross || 0)
      acc.totalDeductions += Number(row.deductionsTotal || row.pf || 0) + Number(row.esi || 0) + Number(row.pt || 0) + Number(row.tds || 0)
      acc.totalNet += Number(row.net || 0)
      acc.pfLiability += Number(row.pf || 0)
      return acc
    },
    { totalEmployees: 0, totalGross: 0, totalDeductions: 0, totalNet: 0, pfLiability: 0 },
  )
}
