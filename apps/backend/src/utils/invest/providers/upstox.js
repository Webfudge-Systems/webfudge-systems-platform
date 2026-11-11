'use strict';

/**
 * Upstox market-quote adapter (official broker API; data APIs are free for Upstox account holders).
 *
 * OFF by default. It turns on only when INVEST_STOCK_PROVIDER=upstox and UPSTOX_ACCESS_TOKEN is set
 * on the API service. Prefer Upstox's long-lived read-only "analytics token" over the daily OAuth
 * access token so nobody has to log in every morning. Never commit the token.
 *
 * Instruments need an ISIN: Upstox instrument keys look like `NSE_EQ|INE002A01018`.
 * Not exercised against the live API yet — verify with a real token before relying on it.
 */

const BASE = 'https://api.upstox.com/v2';

function instrumentKey(inst) {
  if (!inst.isin) return null;
  return `${inst.exchange === 'BSE' ? 'BSE_EQ' : 'NSE_EQ'}|${String(inst.isin).trim().toUpperCase()}`;
}

module.exports = {
  id: 'upstox',
  label: 'Upstox (official, live)',
  isConfigured: () => Boolean(process.env.UPSTOX_ACCESS_TOKEN),
  supports: (inst) => (inst.kind === 'stock' || inst.kind === 'etf') && Boolean(inst.isin),

  async getQuotes(instruments) {
    const quotes = new Map();
    const token = process.env.UPSTOX_ACCESS_TOKEN;
    const keyed = instruments.map((inst) => [inst, instrumentKey(inst)]).filter(([, k]) => k);
    for (const inst of instruments) if (!instrumentKey(inst)) quotes.set(inst.id, { error: 'ISIN required for Upstox' });
    // The quote endpoints accept up to 500 instrument keys per call.
    for (let i = 0; i < keyed.length; i += 500) {
      const batch = keyed.slice(i, i + 500);
      try {
        const res = await fetch(
          `${BASE}/market-quote/ohlc?interval=1d&instrument_key=${encodeURIComponent(batch.map(([, k]) => k).join(','))}`,
          { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.status !== 'success') throw new Error(body?.errors?.[0]?.message || `HTTP ${res.status}`);
        const byToken = new Map(Object.values(body.data || {}).map((row) => [row.instrument_token, row]));
        for (const [inst, key] of batch) {
          const row = byToken.get(key);
          quotes.set(
            inst.id,
            row && Number.isFinite(row.last_price)
              ? { price: row.last_price, previousClose: row.ohlc?.close ?? null, asOf: new Date().toISOString(), source: 'upstox' }
              : { error: 'No quote from Upstox' }
          );
        }
      } catch (err) {
        for (const [inst] of batch) quotes.set(inst.id, { error: err.message || String(err) });
      }
    }
    return quotes;
  },
};
