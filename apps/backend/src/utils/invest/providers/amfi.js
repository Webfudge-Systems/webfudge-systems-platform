'use strict';

/**
 * AMFI NAVAll.txt — the official, free daily NAV file for every Indian mutual-fund scheme.
 * One download (~2 MB) covers all schemes, so it is cached in memory for 30 minutes.
 * Latest NAV only (no history); used as the fallback when mfapi.in is unavailable.
 *
 * Line format: Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
 */

const { getText, ddMonYyyyToIso } = require('./http');

const URL = process.env.INVEST_AMFI_NAV_URL || 'https://www.amfiindia.com/spages/NAVAll.txt';
const TTL_MS = 30 * 60 * 1000;

let cache = { at: 0, byCode: null };

function parse(text) {
  const byCode = new Map();
  let fundHouse = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(';');
    if (parts.length < 6) {
      // Section headers: scheme type lines and fund-house names
      if (!/schemes?\s*\(/i.test(line)) fundHouse = line;
      continue;
    }
    const [code, isin1, isin2, name, nav, date] = parts;
    const price = Number(nav);
    if (!/^\d+$/.test(code) || !Number.isFinite(price)) continue;
    byCode.set(code, {
      schemeCode: code,
      isin: [isin1, isin2].map((s) => s && s.trim()).find((s) => s && s !== '-') || null,
      name: name.trim(),
      price,
      date: ddMonYyyyToIso(date),
      fundHouse,
    });
  }
  return byCode;
}

async function load() {
  if (cache.byCode && Date.now() - cache.at < TTL_MS) return cache.byCode;
  const text = await getText(URL, { timeoutMs: 30000 });
  cache = { at: Date.now(), byCode: parse(text) };
  return cache.byCode;
}

module.exports = {
  id: 'amfi',
  label: 'AMFI NAVAll.txt',
  parse,
  supports: (inst) => inst.kind === 'mutual_fund' && Boolean(inst.schemeCode),

  async getQuotes(instruments) {
    const quotes = new Map();
    let byCode;
    try {
      byCode = await load();
    } catch (err) {
      for (const inst of instruments) quotes.set(inst.id, { error: err.message || String(err) });
      return quotes;
    }
    for (const inst of instruments) {
      const row = byCode.get(String(inst.schemeCode));
      quotes.set(
        inst.id,
        row
          ? { price: row.price, previousClose: null, asOf: row.date ? `${row.date}T00:00:00+05:30` : null, source: 'amfi' }
          : { error: 'Scheme code not in AMFI file' }
      );
    }
    return quotes;
  },

  async search(q) {
    const byCode = await load();
    const terms = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    const out = [];
    for (const row of byCode.values()) {
      const hay = `${row.name} ${row.schemeCode} ${row.isin || ''}`.toLowerCase();
      if (terms.every((t) => hay.includes(t))) {
        out.push({ kind: 'mutual_fund', exchange: 'AMFI', name: row.name, schemeCode: row.schemeCode, isin: row.isin, symbol: null, source: 'amfi' });
        if (out.length >= 25) break;
      }
    }
    return out;
  },
};
