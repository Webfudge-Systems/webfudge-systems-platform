'use strict';

/**
 * invest-transaction controller (internal investment manager, apps/invest).
 * Buy / sell / SIP instalment / dividend rows. Missing amount, units or price is derived
 * from the other two so a SIP can be entered as "₹10,000 at NAV 93.98".
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { createInvestCrud, ownedRelation, InvestValidationError, num } = require('../../../utils/invest/crud');

const UID = 'api::invest-transaction.invest-transaction';
const TYPES = ['buy', 'sell', 'sip', 'dividend'];

function round(n, dp) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

async function prepare(strapi, ctx, data, existing) {
  const merged = { ...(existing || {}), ...data };
  if (!TYPES.includes(merged.type)) throw new InvestValidationError('type must be buy, sell, sip or dividend');
  if (!merged.date || !/^\d{4}-\d{2}-\d{2}/.test(String(merged.date))) throw new InvestValidationError('date is required (YYYY-MM-DD)');

  if (data.instrument !== undefined || !existing) {
    const inst = await ownedRelation(strapi, ctx, 'api::invest-instrument.invest-instrument', data.instrument, 'Instrument');
    if (!inst) throw new InvestValidationError('Instrument is required');
    data.instrument = inst.id;
  }
  if (data.sip !== undefined) {
    const sip = await ownedRelation(strapi, ctx, 'api::invest-sip.invest-sip', data.sip, 'SIP');
    data.sip = sip ? sip.id : null;
  }

  let units = num(data.units !== undefined ? data.units : existing?.units);
  let price = num(data.price !== undefined ? data.price : existing?.price);
  let amount = num(data.amount !== undefined ? data.amount : existing?.amount);
  const charges = num(data.charges !== undefined ? data.charges : existing?.charges) ?? 0;
  for (const [k, v] of Object.entries({ units, price, amount, charges })) {
    if (Number.isNaN(v) || (v != null && v < 0)) throw new InvestValidationError(`${k} must be a positive number`);
  }

  if (merged.type === 'dividend') {
    if (!amount) throw new InvestValidationError('Dividend amount is required');
    units = null;
    price = null;
  } else {
    if (units && price && amount == null) amount = round(units * price, 2);
    else if (amount && price && !units) units = round(amount / price, 4);
    else if (amount && units && !price) price = round(amount / units, 4);
    if (!units || !price || !amount) {
      throw new InvestValidationError('Enter any two of units, price and amount');
    }
  }

  data.units = units;
  data.price = price;
  data.amount = amount;
  data.charges = charges;
  if (data.date) data.date = String(data.date).slice(0, 10);
  return data;
}

module.exports = createCoreController(
  UID,
  createInvestCrud(UID, {
    populate: ['instrument', 'sip'],
    defaultSort: 'date:desc',
    listFilters: (extra) => {
      const f = {};
      if (extra.instrument) f.instrument = parseInt(String(extra.instrument), 10) || -1;
      if (extra.sip) f.sip = parseInt(String(extra.sip), 10) || -1;
      if (extra.type && TYPES.includes(extra.type)) f.type = extra.type;
      return f;
    },
    prepare,
  })
);
