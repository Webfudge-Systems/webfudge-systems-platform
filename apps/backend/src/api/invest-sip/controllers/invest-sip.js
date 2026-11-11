'use strict';

/**
 * invest-sip controller (internal investment manager, apps/invest).
 * A SIP is the plan; each instalment is an invest-transaction (type "sip") linked back to it.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { createInvestCrud, ownedRelation, InvestValidationError, num } = require('../../../utils/invest/crud');

const UID = 'api::invest-sip.invest-sip';
const FREQUENCIES = ['monthly', 'quarterly', 'weekly'];
const STATUSES = ['active', 'paused', 'stopped'];

async function prepare(strapi, ctx, data, existing) {
  const merged = { ...(existing || {}), ...data };
  if (data.instrument !== undefined || !existing) {
    const inst = await ownedRelation(strapi, ctx, 'api::invest-instrument.invest-instrument', data.instrument, 'Instrument');
    if (!inst) throw new InvestValidationError('Instrument is required');
    data.instrument = inst.id;
  }
  const amount = num(merged.amount);
  if (!amount || amount <= 0) throw new InvestValidationError('SIP amount must be greater than zero');
  if (data.amount !== undefined) data.amount = amount;
  if (merged.frequency && !FREQUENCIES.includes(merged.frequency)) throw new InvestValidationError('Invalid frequency');
  if (merged.status && !STATUSES.includes(merged.status)) throw new InvestValidationError('Invalid status');
  if (!merged.startDate) throw new InvestValidationError('Start date is required');
  if (data.dayOfMonth !== undefined && data.dayOfMonth !== null && data.dayOfMonth !== '') {
    const d = parseInt(data.dayOfMonth, 10);
    if (!(d >= 1 && d <= 28)) throw new InvestValidationError('SIP day must be between 1 and 28');
    data.dayOfMonth = d;
  }
  if (data.endDate === '') data.endDate = null;
  if (merged.endDate && String(merged.endDate) < String(merged.startDate)) {
    throw new InvestValidationError('End date must be after the start date');
  }
  return data;
}

module.exports = createCoreController(
  UID,
  createInvestCrud(UID, {
    populate: ['instrument'],
    defaultSort: 'startDate:desc',
    listFilters: (extra) => {
      const f = {};
      if (extra.status && STATUSES.includes(extra.status)) f.status = extra.status;
      if (extra.instrument) f.instrument = parseInt(String(extra.instrument), 10) || -1;
      return f;
    },
    prepare,
  })
);
