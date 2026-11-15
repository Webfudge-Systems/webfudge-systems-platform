'use strict';

/**
 * invest-instrument controller (internal investment manager, apps/invest).
 * Org-scoped, guarded by utils/invest/access (never available when PLATFORM_MODE=saas).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { createInvestCrud, InvestValidationError } = require('../../../utils/invest/crud');
const { mfapi } = require('../../../utils/invest/prices');

const UID = 'api::invest-instrument.invest-instrument';
const KINDS = ['stock', 'etf', 'mutual_fund', 'other'];
const EXCHANGES = ['NSE', 'BSE', 'AMFI', 'OTHER'];

async function prepare(strapi, ctx, data, existing) {
  const merged = { ...(existing || {}), ...data };
  if (!KINDS.includes(merged.kind)) throw new InvestValidationError('kind must be stock, etf, mutual_fund or other');

  if (data.symbol != null) data.symbol = String(data.symbol).trim().toUpperCase().replace(/\.(NS|BO)$/, '') || null;
  if (data.schemeCode != null) data.schemeCode = String(data.schemeCode).trim() || null;
  if (data.isin != null) data.isin = String(data.isin).trim().toUpperCase() || null;

  if (merged.kind === 'mutual_fund') {
    data.exchange = 'AMFI';
    const code = data.schemeCode ?? existing?.schemeCode;
    if (!code && !merged.name) throw new InvestValidationError('A mutual fund needs an AMFI scheme code or a name');
    // Fill name / fund house / category / ISIN from the NAV source when we only have a code.
    if (code && (!existing || data.schemeCode)) {
      try {
        const meta = await mfapi.getSchemeMeta(code);
        if (!merged.name && meta.name) data.name = meta.name;
        if (!merged.fundHouse && meta.fundHouse) data.fundHouse = meta.fundHouse;
        if (!merged.category && meta.category) data.category = meta.category;
        if (!merged.isin && meta.isin) data.isin = meta.isin;
      } catch (_) {
        /* enrichment is best-effort */
      }
    }
  } else if (merged.kind === 'stock' || merged.kind === 'etf') {
    if (!(data.symbol ?? existing?.symbol) && !merged.name) throw new InvestValidationError('A stock needs an NSE/BSE symbol');
    if (data.exchange && !EXCHANGES.includes(data.exchange)) throw new InvestValidationError('Invalid exchange');
    if (!existing && !data.exchange) data.exchange = 'NSE';
  }

  if (!(data.name ?? existing?.name)) {
    data.name = data.symbol || data.schemeCode;
  }
  if (!(data.name ?? existing?.name)) throw new InvestValidationError('Name is required');

  // A manually entered price (e.g. unlisted / "other") is stamped so the UI can show its age.
  if (data.lastPrice !== undefined && data.lastPrice !== null && data.lastPrice !== '') {
    const p = Number(data.lastPrice);
    if (!Number.isFinite(p) || p < 0) throw new InvestValidationError('Price must be a positive number');
    data.lastPrice = p;
    data.lastPriceAt = new Date().toISOString();
    data.priceSource = 'manual';
    data.priceError = null;
  }

  // Creating the same scheme/symbol twice returns the existing row instead of duplicating it.
  if (!existing) {
    const key = merged.kind === 'mutual_fund' ? { schemeCode: data.schemeCode } : { symbol: data.symbol, exchange: data.exchange };
    if (Object.values(key).every(Boolean)) {
      const dupes = await strapi.entityService.findMany(UID, {
        filters: { organization: ctx.state.orgId, kind: merged.kind, ...key },
        limit: 1,
      });
      if (dupes.length) data.__existing = dupes[0];
    }
  }
  return data;
}

async function beforeDelete(strapi, ctx, existing) {
  const txCount = await strapi.db
    .query('api::invest-transaction.invest-transaction')
    .count({ where: { instrument: existing.id } });
  if (txCount > 0) return `Delete this instrument's ${txCount} transaction(s) first`;
  return null;
}

module.exports = createCoreController(
  UID,
  createInvestCrud(UID, {
    populate: [],
    defaultSort: 'name:asc',
    listFilters: (extra) => (extra.kind && KINDS.includes(extra.kind) ? { kind: extra.kind } : {}),
    prepare,
    beforeDelete,
  })
);
