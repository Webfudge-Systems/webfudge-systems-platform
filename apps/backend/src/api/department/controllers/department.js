'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { createOrgAdminController } = require('../../../utils/org-admin-resource');
const { ensureDefaultDepartmentsForOrg } = require('../../../utils/org-departments-bootstrap');

const UID = 'api::department.department';

module.exports = createCoreController(UID, ({ strapi }) => {
  const base = createOrgAdminController(strapi, UID, {
    populate: ['lead', 'parent', 'organization'],
  });

  return {
    ...base,
    async find(ctx) {
      let result = await base.find(ctx);
      const total = result?.meta?.pagination?.total ?? 0;
      if (ctx.state.orgId && total === 0) {
        await ensureDefaultDepartmentsForOrg(strapi, ctx.state.orgId);
        result = await base.find(ctx);
      }
      return result;
    },
  };
});
