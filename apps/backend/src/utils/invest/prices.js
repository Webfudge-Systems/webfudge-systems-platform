'use strict';

/**
 * Price-provider registry for the internal investment manager.
 *
 * Every provider implements the same small interface:
 *   id, label
 *   supports(instrument) → boolean
 *   getQuotes(instruments) → Map<instrumentId, { price, previousClose, asOf, source } | { error }>
 *   getHistory?(instrument, { from }) → [{ date: 'YYYY-MM-DD', price }] oldest first
 *   search?(query) → [{ kind, exchange, name, symbol, schemeCode, isin, source }]
 *
 * Defaults are free sources: mfapi.in (fallback AMFI NAVAll.txt) for mutual funds and
 * Yahoo Finance (delayed) for NSE/BSE stocks and ETFs. Set INVEST_STOCK_PROVIDER=upstox
 * (with UPSTOX_ACCESS_TOKEN) to switch stocks to a broker feed. INVEST_STOCK_PROVIDER=none
 * disables automatic stock prices (enter them by hand instead).
 */

const mfapi = require('./providers/mfapi');
const amfi = require('./providers/amfi');
const yahoo = require('./providers/yahoo');
const upstox = require('./providers/upstox');

const STOCK_PROVIDERS = { yahoo, upstox };

function stockProvider() {
  const id = String(process.env.INVEST_STOCK_PROVIDER || 'yahoo').trim().toLowerCase();
  if (id === 'none') return null;
  const p = STOCK_PROVIDERS[id] || yahoo;
  if (p.isConfigured && !p.isConfigured()) return yahoo;
  return p;
}

function fundProviders() {
  return [mfapi, amfi];
}

function isFund(inst) {
  return inst.kind === 'mutual_fund';
}

/**
 * Fetch quotes for a list of instruments, trying fund providers in order (first success wins).
 * @returns {Promise<Map<number, object>>}
 */
async function fetchQuotes(instruments) {
  const out = new Map();
  const funds = instruments.filter((i) => isFund(i) && i.schemeCode);
  const stocks = instruments.filter((i) => !isFund(i) && i.symbol);

  let pending = funds;
  for (const provider of fundProviders()) {
    if (!pending.length) break;
    const quotes = await provider.getQuotes(pending);
    const failed = [];
    for (const inst of pending) {
      const q = quotes.get(inst.id);
      if (q && !q.error) out.set(inst.id, q);
      else {
        out.set(inst.id, q || { error: 'No quote' });
        failed.push(inst);
      }
    }
    pending = failed;
  }

  const sp = stockProvider();
  if (sp && stocks.length) {
    const supported = stocks.filter((i) => sp.supports(i));
    const quotes = supported.length ? await sp.getQuotes(supported) : new Map();
    for (const inst of stocks) {
      out.set(inst.id, quotes.get(inst.id) || { error: `${sp.label} cannot price this instrument` });
    }
  }

  for (const inst of instruments) {
    if (!out.has(inst.id)) out.set(inst.id, { error: isFund(inst) ? 'Missing AMFI scheme code' : 'Missing symbol or automatic prices are off' });
  }
  return out;
}

async function fetchHistory(inst, opts) {
  if (isFund(inst)) {
    if (!inst.schemeCode) return [];
    return mfapi.getHistory(inst, opts);
  }
  if (!inst.symbol) return [];
  return yahoo.getHistory(inst, opts);
}

async function search(kind, q) {
  if (kind === 'mutual_fund') {
    try {
      return await mfapi.search(q);
    } catch (_) {
      return amfi.search(q);
    }
  }
  return yahoo.search(q);
}

function describeProviders() {
  const sp = stockProvider();
  return {
    mutualFunds: fundProviders().map((p) => p.label),
    stocks: sp ? sp.label : 'Manual prices only',
  };
}

module.exports = { fetchQuotes, fetchHistory, search, describeProviders, mfapi };
