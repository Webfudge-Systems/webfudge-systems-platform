'use strict';

const DEPARTMENT_UID = 'api::department.department';

/** Shared org departments — same defaults used across HR demo data and Accounts setup. */
const DEFAULT_DEPARTMENT_NAMES = [
  'Engineering',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Design',
  'Marketing',
];

/**
 * Ensure an organization has at least the default department catalog.
 * Idempotent: no-op when the org already has departments.
 */
async function ensureDefaultDepartmentsForOrg(strapi, organizationId) {
  const orgId = Number(organizationId);
  if (!orgId) return { created: 0 };

  const existing = await strapi.entityService.findMany(DEPARTMENT_UID, {
    filters: { organization: orgId },
    limit: 1,
  });
  if (existing.length > 0) return { created: 0, skipped: true };

  let created = 0;
  for (const name of DEFAULT_DEPARTMENT_NAMES) {
    await strapi.entityService.create(DEPARTMENT_UID, {
      data: {
        name,
        isActive: true,
        organization: orgId,
      },
    });
    created += 1;
  }
  return { created };
}

module.exports = {
  DEFAULT_DEPARTMENT_NAMES,
  ensureDefaultDepartmentsForOrg,
};
