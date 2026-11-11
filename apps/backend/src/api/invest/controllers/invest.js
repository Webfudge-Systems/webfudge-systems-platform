'use strict';

/**
 * Internal investment manager — non-CRUD endpoints:
 *   GET  /invest/access                      who may open the app (used by apps/invest)
 *   POST /invest/prices/refresh              pull latest prices for the org's instruments
 *   GET  /invest/lookup?kind=&q=             search NSE/BSE symbols or AMFI schemes
 *   GET  /invest/instruments/:id/history     daily price/NAV history for charts
 *   POST /invest/sips/:id/sync               create missing SIP instalments from historical NAVs
 */

const { evaluateInvestAccess, requireInvestAccess } = require('../../../utils/invest/access');
const prices = require('../../../utils/invest/prices');
const { sipDueDates } = require('../../../utils/invest/schedule');
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');

const INSTRUMENT = 'api::invest-instrument.invest-instrument';
const TRANSACTION = 'api::invest-transaction.invest-transaction';
const SIP = 'api::invest-sip.invest-sip';

const PRICE_TTL_MS = (Number(process.env.INVEST_PRICE_TTL_MINUTES) || 10) * 60 * 1000;
const HISTORY_TTL_MS = 60 * 60 * 1000;
const historyCache = new Map();

async function loadOwned(strapi, ctx, uid, id, populate = []) {
  const row = await strapi.entityService.findOne(uid, id, { populate: ['organization', ...populate] });
  if (!row) {
    ctx.notFound();
    return null;
  }
  if (orgIdFromRelation(row.organization) !== ctx.state.orgId) {
    ctx.forbidden('Access denied');
    return null;
  }
  return row;
}

function addDays(iso, days) {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
}

module.exports = ({ strapi }) => ({
  async access(ctx) {
    const result = evaluateInvestAccess(ctx);
    if (result.status === 404) return ctx.notFound();
    if (result.status === 401) return ctx.unauthorized(result.reason);
    return ctx.send({
      allowed: result.allowed,
      reason: result.allowed ? null : result.reason,
      providers: result.allowed ? prices.describeProviders() : null,
    });
  },

  async refreshPrices(ctx) {
    if (!requireInvestAccess(ctx)) return;
    const body = ctx.request?.body || {};
    const force = Boolean(body.force);
    const ids = Array.isArray(body.ids) ? body.ids.map((v) => parseInt(String(v), 10)).filter(Number.isFinite) : null;

    const filters = { organization: ctx.state.orgId, kind: { $ne: 'other' } };
    if (ids && ids.length) filters.id = { $in: ids };
    const all = await strapi.entityService.findMany(INSTRUMENT, { filters, limit: 1000 });
    const now = Date.now();
    const stale = all.filter(
      (i) => force || !i.lastPriceAt || i.priceSource === 'manual' || now - new Date(i.lastPriceAt).getTime() > PRICE_TTL_MS
    );

    const quotes = stale.length ? await prices.fetchQuotes(stale) : new Map();
    let refreshed = 0;
    const errors = [];
    for (const inst of stale) {
      const q = quotes.get(inst.id);
      if (q && !q.error) {
        await strapi.entityService.update(INSTRUMENT, inst.id, {
          data: {
            lastPrice: q.price,
            previousClose: q.previousClose ?? null,
            lastPriceAt: q.asOf || new Date().toISOString(),
            priceSource: q.source,
            priceError: null,
          },
        });
        refreshed += 1;
      } else {
        const message = String(q?.error || 'No quote').slice(0, 250);
        errors.push({ id: inst.id, name: inst.name, error: message });
        await strapi.entityService.update(INSTRUMENT, inst.id, { data: { priceError: message } });
      }
    }

    const data = await strapi.entityService.findMany(INSTRUMENT, {
      filters: { organization: ctx.state.orgId },
      sort: { name: 'ASC' },
      limit: 1000,
    });
    return ctx.send({ data, meta: { checked: stale.length, refreshed, errors, providers: prices.describeProviders() } });
  },

  async lookup(ctx) {
    if (!requireInvestAccess(ctx)) return;
    const q = String(ctx.query?.q || '').trim();
    const kind = String(ctx.query?.kind || 'stock');
    if (q.length < 2) return ctx.send({ data: [] });
    try {
      const data = await prices.search(kind === 'mutual_fund' ? 'mutual_fund' : 'stock', q);
      return ctx.send({ data });
    } catch (err) {
      return ctx.send({ data: [], error: `Search is unavailable right now (${err.message || err})` });
    }
  },

  async history(ctx) {
    if (!requireInvestAccess(ctx)) return;
    const inst = await loadOwned(strapi, ctx, INSTRUMENT, ctx.params.id);
    if (!inst) return;
    const from = /^\d{4}-\d{2}-\d{2}$/.test(String(ctx.query?.from || '')) ? ctx.query.from : null;
    const key = `${inst.id}:${inst.schemeCode || inst.symbol}:${from || ''}`;
    const hit = historyCache.get(key);
    if (hit && Date.now() - hit.at < HISTORY_TTL_MS) return ctx.send({ data: hit.data });
    try {
      const data = await prices.fetchHistory(inst, { from });
      historyCache.set(key, { at: Date.now(), data });
      if (historyCache.size > 500) historyCache.delete(historyCache.keys().next().value);
      return ctx.send({ data });
    } catch (err) {
      return ctx.send({ data: [], error: `Price history is unavailable right now (${err.message || err})` });
    }
  },

  async syncSip(ctx) {
    if (!requireInvestAccess(ctx)) return;
    const sip = await loadOwned(strapi, ctx, SIP, ctx.params.id, ['instrument']);
    if (!sip) return;
    if (!sip.instrument) return ctx.badRequest('This SIP has no instrument');
    if (sip.status !== 'active') return ctx.badRequest('Only active SIPs can be synced. Record paused/stopped instalments by hand.');

    const existing = await strapi.entityService.findMany(TRANSACTION, {
      filters: { organization: ctx.state.orgId, sip: sip.id },
      fields: ['date'],
      limit: 5000,
    });
    const existingDates = existing.map((t) => String(t.date).slice(0, 10)).sort();
    // A recorded instalment within 10 days after a due date covers it (holidays, NAV lag).
    const missing = sipDueDates(sip).filter((due) => {
      const until = addDays(due, 10);
      return !existingDates.some((d) => d >= due && d <= until);
    });
    if (!missing.length) return ctx.send({ data: [], meta: { created: 0, skipped: [] } });

    const toCreate = missing.slice(0, 240);
    let history;
    try {
      history = await prices.fetchHistory(sip.instrument, { from: toCreate[0] });
    } catch (err) {
      return ctx.badRequest(`Could not load historical prices (${err.message || err})`);
    }

    const isFund = sip.instrument.kind === 'mutual_fund';
    const created = [];
    const skipped = [];
    for (const due of toCreate) {
      const until = addDays(due, 10);
      const row = history.find((h) => h.date >= due && h.date <= until);
      if (!row) {
        skipped.push({ date: due, reason: 'No price published yet for this date' });
        continue;
      }
      let units = sip.amount / row.price;
      let amount = sip.amount;
      if (isFund) units = Math.round(units * 1000) / 1000; // AMCs allot units to 3 decimals
      else {
        units = Math.floor(units);
        amount = Math.round(units * row.price * 100) / 100;
      }
      if (!units) {
        skipped.push({ date: due, reason: 'Amount is below one unit price' });
        continue;
      }
      const tx = await strapi.entityService.create(TRANSACTION, {
        data: {
          type: 'sip',
          date: row.date,
          units,
          price: row.price,
          amount,
          charges: 0,
          folio: sip.folio || null,
          account: sip.account || null,
          autoGenerated: true,
          notes: `Auto-recorded SIP instalment due ${due}`,
          instrument: sip.instrument.id,
          sip: sip.id,
          organization: ctx.state.orgId,
          createdByUser: ctx.state.user.id,
        },
      });
      created.push(tx);
    }
    return ctx.send({ data: created, meta: { created: created.length, skipped, remaining: missing.length - toCreate.length } });
  },
});
