'use strict';

/**
 * mfapi.in — free, keyless JSON API over AMFI's published NAVs (community run, no SLA).
 * Used as the primary mutual-fund source because it has per-scheme history and search;
 * the official AMFI NAVAll.txt file is the fallback (see amfi.js).
 */

const { getJson, ddmmyyyyToIso, toIsoDate, mapLimit } = require('./http');

const BASE = process.env.INVEST_MFAPI_BASE_URL || 'https://api.mfapi.in';

function rows(body) {
  return (Array.isArray(body?.data) ? body.data : [])
    .map((r) => ({ date: ddmmyyyyToIso(r.date), price: Number(r.nav) }))
    .filter((r) => r.date && Number.isFinite(r.price) && r.price > 0);
}

module.exports = {
  id: 'mfapi',
  label: 'mfapi.in (AMFI NAV)',
  supports: (inst) => inst.kind === 'mutual_fund' && Boolean(inst.schemeCode),

  async getQuotes(instruments) {
    const quotes = new Map();
    const end = new Date();
    const start = new Date(end.getTime() - 15 * 86400000);
    await mapLimit(instruments, 4, async (inst) => {
      try {
        const body = await getJson(
          `${BASE}/mf/${encodeURIComponent(inst.schemeCode)}?startDate=${toIsoDate(start)}&endDate=${toIsoDate(end)}`
        );
        const data = rows(body); // newest first
        if (!data.length) throw new Error('No NAV returned');
        quotes.set(inst.id, {
          price: data[0].price,
          previousClose: data[1]?.price ?? null,
          asOf: `${data[0].date}T00:00:00+05:30`,
          source: 'mfapi',
        });
      } catch (err) {
        quotes.set(inst.id, { error: err.message || String(err) });
      }
    });
    return quotes;
  },

  async getHistory(inst, { from } = {}) {
    const qs = from ? `?startDate=${from}&endDate=${toIsoDate(new Date())}` : '';
    const body = await getJson(`${BASE}/mf/${encodeURIComponent(inst.schemeCode)}${qs}`, { timeoutMs: 25000 });
    return rows(body).reverse(); // oldest first
  },

  /** NAV on a date, or the next published NAV after it (purchases settle at the next NAV). */
  async getNavOnOrAfter(inst, isoDate) {
    const start = new Date(`${isoDate}T00:00:00Z`);
    const end = new Date(start.getTime() + 10 * 86400000);
    const body = await getJson(
      `${BASE}/mf/${encodeURIComponent(inst.schemeCode)}?startDate=${isoDate}&endDate=${toIsoDate(end)}`
    );
    const data = rows(body).reverse();
    return data.find((r) => r.date >= isoDate) || null;
  },

  async search(q) {
    const body = await getJson(`${BASE}/mf/search?q=${encodeURIComponent(q)}`);
    return (Array.isArray(body) ? body : []).slice(0, 25).map((r) => ({
      kind: 'mutual_fund',
      exchange: 'AMFI',
      name: r.schemeName,
      schemeCode: String(r.schemeCode),
      symbol: null,
      isin: null,
      source: 'mfapi',
    }));
  },

  async getSchemeMeta(schemeCode) {
    const end = new Date();
    const start = new Date(end.getTime() - 15 * 86400000);
    const body = await getJson(
      `${BASE}/mf/${encodeURIComponent(schemeCode)}?startDate=${toIsoDate(start)}&endDate=${toIsoDate(end)}`
    );
    const meta = body?.meta || {};
    return {
      name: meta.scheme_name,
      fundHouse: meta.fund_house,
      category: meta.scheme_category,
      isin: meta.isin_growth || meta.isin_div_reinvestment || null,
    };
  },
};
