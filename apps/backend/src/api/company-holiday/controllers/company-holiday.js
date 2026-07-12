'use strict';

const { makeBooksCrudController } = require('../../../utils/books-crud');

const UID = 'api::company-holiday.company-holiday';

const base = makeBooksCrudController(UID, {
  defaultPopulate: [],
  extraFilters: () => ({}),
});

module.exports = (params) => {
  const core = base(params);

  return {
    ...core,

    async find(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const q = ctx.query || {};
      const page = parseInt(q.page || '1', 10);
      const limit = Math.min(parseInt(q.limit || '50', 10), 200);
      const filters = { organization: ctx.state.orgId };

      if (q.from || q.to) {
        filters.date = {};
        if (q.from) filters.date.$gte = q.from;
        if (q.to) filters.date.$lte = q.to;
      }

      const [results, total] = await Promise.all([
        strapi.entityService.findMany(UID, {
          filters,
          start: (page - 1) * limit,
          limit,
          sort: q.sort || { date: 'asc' },
        }),
        strapi.db.query(UID).count({ where: filters }),
      ]);

      return { data: results, meta: { pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } } };
    },
  };
};
