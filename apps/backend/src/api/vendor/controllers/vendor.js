'use strict';

const { makeBooksCrudController } = require('../../../utils/books-crud');
const { generateSequence } = require('../../../utils/sequence');
const UID = 'api::vendor.vendor';

const base = makeBooksCrudController(UID);

module.exports = {
  ...base,
  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const vendorCode = await generateSequence(ctx.state.orgId, 'vendorSequence', 'VEN');
    const entry = await strapi.entityService.create(UID, {
      data: { ...payload, vendorCode, organization: ctx.state.orgId, createdByUser: ctx.state.user.id },
    });
    return { data: entry };
  },
};
