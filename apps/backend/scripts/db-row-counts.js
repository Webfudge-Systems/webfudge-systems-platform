#!/usr/bin/env node
/**
 * Count rows in every table of a Postgres database (read-only).
 * Take one snapshot before a deployment change and one after; --compare shows any difference.
 *
 * Usage (from apps/backend):
 *   DATABASE_URL=postgres://... node scripts/db-row-counts.js --out ../../backups/internal-before.json
 *   DATABASE_URL=postgres://... node scripts/db-row-counts.js --compare ../../backups/internal-before.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

async function countRows(databaseUrl) {
  const needsSsl = /railway|rlwy\.net|sslmode=require|ssl=true/i.test(databaseUrl);
  const client = new Client({
    connectionString: databaseUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    await client.query('SET default_transaction_read_only = on');
    const { rows: tables } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );
    const counts = {};
    for (const { table_name: table } of tables) {
      const { rows } = await client.query(`SELECT COUNT(*)::bigint AS n FROM "${table.replace(/"/g, '""')}"`);
      counts[table] = Number(rows[0].n);
    }
    return counts;
  } finally {
    await client.end();
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DATABASE_URL to the Postgres connection string (Railway → Postgres → Connect → public URL).');
    process.exit(1);
  }

  const counts = await countRows(databaseUrl);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const snapshot = { takenAt: new Date().toISOString(), tables: Object.keys(counts).length, totalRows: total, counts };

  const out = arg('--out');
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(snapshot, null, 2));
    console.log(`Saved ${snapshot.tables} tables / ${total} rows → ${out}`);
  }

  const compare = arg('--compare');
  if (compare) {
    const before = JSON.parse(fs.readFileSync(compare, 'utf8')).counts;
    const names = [...new Set([...Object.keys(before), ...Object.keys(counts)])].sort();
    const lower = [];
    const other = [];
    for (const name of names) {
      const a = before[name];
      const b = counts[name];
      if (a === b) continue;
      const line = `  ${name}: ${a ?? 'missing'} → ${b ?? 'missing'}`;
      if (b === undefined || (a !== undefined && b < a)) lower.push(line);
      else other.push(line);
    }
    if (!lower.length && !other.length) {
      console.log(`✅ Identical: ${names.length} tables, ${total} rows.`);
    } else {
      if (other.length) console.log(`ℹ️ Grew or new (normal while people keep working):\n${other.join('\n')}`);
      if (lower.length) console.log(`❌ Fewer rows or missing tables — stop and investigate:\n${lower.join('\n')}`);
      process.exitCode = lower.length ? 2 : 0;
    }
  }

  if (!out && !compare) {
    for (const [name, n] of Object.entries(counts)) console.log(`${String(n).padStart(8)}  ${name}`);
    console.log(`${String(total).padStart(8)}  TOTAL (${snapshot.tables} tables)`);
  }
}

main().catch((error) => {
  console.error('Row count failed:', error.message);
  process.exit(1);
});
