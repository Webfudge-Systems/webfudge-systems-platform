'use strict';

/**
 * Real Estate CRM (Stage 2) — indexes for lead qualification queries.
 *
 * Strapi 5 stores relations in `_lnk` link tables (already indexed by Strapi),
 * so org-scoped composite indexes cannot live on the main tables. Instead we
 * index the hot scalar columns used by list/pipeline filters and sorts:
 *   - real_estate_leads: tier, status, created_at, unique meta_lead_id
 *   - real_estate_projects: status
 *   - site_visits: scheduled_at
 *   - lead_activities: created_at
 *
 * Idempotent and defensive: skips tables/columns that don't exist yet and
 * ignores "already exists" errors so re-runs are safe on SQLite and Postgres.
 */

async function addIndex(knex, table, columns, { unique = false, name } = {}) {
  const hasTable = await knex.schema.hasTable(table);
  if (!hasTable) return;
  for (const col of columns) {
    const hasColumn = await knex.schema.hasColumn(table, col);
    if (!hasColumn) return;
  }
  const indexName = name || `idx_${table}_${columns.join('_')}`;
  try {
    await knex.schema.alterTable(table, (t) => {
      if (unique) {
        t.unique(columns, { indexName });
      } else {
        t.index(columns, indexName);
      }
    });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err).toLowerCase();
    if (!msg.includes('already exists') && !msg.includes('duplicate')) throw err;
  }
}

module.exports = {
  async up(knex) {
    await addIndex(knex, 'real_estate_leads', ['tier']);
    await addIndex(knex, 'real_estate_leads', ['status']);
    await addIndex(knex, 'real_estate_leads', ['score']);
    await addIndex(knex, 'real_estate_leads', ['created_at']);
    await addIndex(knex, 'real_estate_leads', ['meta_lead_id'], {
      unique: true,
      name: 'uq_real_estate_leads_meta_lead_id',
    });

    await addIndex(knex, 'real_estate_projects', ['status']);
    await addIndex(knex, 'real_estate_projects', ['meta_campaign_id']);

    await addIndex(knex, 'site_visits', ['scheduled_at']);

    await addIndex(knex, 'lead_activities', ['type']);
    await addIndex(knex, 'lead_activities', ['created_at']);
  },
};
