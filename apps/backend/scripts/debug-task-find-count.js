'use strict';

/**
 * Count tasks returned by task find filters (admin org scope).
 * Usage: from apps/backend with DATABASE_URL in .env
 *   node scripts/debug-task-find-count.js [orgId]
 */

const { createStrapi } = require('@strapi/strapi');
const path = require('path');

const orgId = Number(process.argv[2] || 1);
const appDir = path.join(__dirname, '..');

async function main() {
  const strapi = createStrapi({ appDir, distDir: appDir });
  await strapi.load();

  const all = await strapi.entityService.findMany('api::task.task', {
    filters: { organization: orgId },
    limit: 500,
    fields: ['id', 'name'],
  });
  console.log('entityService org filter count:', all.length);

  const parentLinks = await strapi.db.connection('tasks_parent_lnk').select('task_id');
  const subtaskIds = new Set(parentLinks.map((r) => r.task_id));
  const major = all.filter((t) => !subtaskIds.has(t.id));
  console.log('approx major (no parent link):', major.length);

  await strapi.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
