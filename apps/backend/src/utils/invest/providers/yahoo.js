'use strict';

/**
 * Yahoo Finance public chart/search endpoints — free, keyless, delayed NSE/BSE quotes.
 *
 * Caveats (see docs/INVEST_APP.md): unofficial, undocumented, no SLA, and Yahoo's terms
 * restrict use to personal/non-commercial purposes. Fine as a starting point for an
 * internal tracker that refreshes a few dozen symbols on demand; swap to a broker API
 * (Upstox / Kite) via INVEST_STOCK_PROVIDER when we want an official feed.
 */

const { getJson, toIsoDate, mapLimit } = require('./http');

const BASE = process.env.INVEST_YAHOO_BASE_URL || 'https://query1.finance.yahoo.com';

function yahooSymbol(inst) {
  const sym = String(inst.symbol || '').trim().toUpperCase();
  if (!sym) return null;
  if (/\.(NS|BO)$/.test(sym)) return sym;
  return `${sym}${inst.exchange === 'BSE' ? '.BO' : '.NS'}`;
}

async function chart(symbol, range) {
  const body = await getJson(`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`);
  const result = body?.chart?.result?.[0];
  if (!result) throw new Error(body?.chart?.error?.description || 'No data');
  return result;
}

module.exports = {
  id: 'yahoo',
  label: 'Yahoo Finance (delayed)',
  supports: (inst) => (inst.kind === 'stock' || inst.kind === 'etf') && Boolean(inst.symbol),

  async getQuotes(instruments) {
    const quotes = new Map();
    await mapLimit(instruments, 4, async (inst) => {
      try {
        const result = await chart(yahooSymbol(inst), '5d');
        const meta = result.meta || {};
        const closes = (result.indicators?.quote?.[0]?.close || []).filter((c) => Number.isFinite(c));
        const price = Number(meta.regularMarketPrice ?? closes[closes.length - 1]);
        if (!Number.isFinite(price)) throw new Error('No price');
        quotes.set(inst.id, {
          price,
          previousClose: closes.length >= 2 ? closes[closes.length - 2] : meta.chartPreviousClose ?? null,
          asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
          source: 'yahoo',
        });
      } catch (err) {
        quotes.set(inst.id, { error: err.message || String(err) });
      }
    });
    return quotes;
  },

  async getHistory(inst, { from } = {}) {
    const days = from ? (Date.now() - new Date(from).getTime()) / 86400000 : 365;
    const range = days > 1825 ? 'max' : days > 730 ? '5y' : days > 365 ? '2y' : '1y';
    const result = await chart(yahooSymbol(inst), range);
    const ts = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    return ts
      .map((t, i) => ({ date: toIsoDate(t * 1000), price: closes[i] }))
      .filter((r) => Number.isFinite(r.price) && (!from || r.date >= from));
  },

  async search(q) {
    const body = await getJson(`${BASE}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0`);
    return (body?.quotes || [])
      .filter((r) => (r.exchange === 'NSI' || r.exchange === 'BSE') && ['EQUITY', 'ETF'].includes(r.quoteType))
      .map((r) => ({
        kind: r.quoteType === 'ETF' ? 'etf' : 'stock',
        exchange: r.exchange === 'BSE' ? 'BSE' : 'NSE',
        name: r.longname || r.shortname || r.symbol,
        symbol: String(r.symbol).replace(/\.(NS|BO)$/, ''),
        schemeCode: null,
        isin: null,
        source: 'yahoo',
      }));
  },
};
