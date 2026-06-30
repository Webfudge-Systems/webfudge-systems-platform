#!/usr/bin/env node

const { detectStaleDocs } = require('./lib');

const warnOnly = process.argv.includes('--warn-only');
const result = detectStaleDocs();

console.log(JSON.stringify(result, null, 2));

if (!warnOnly && result.stale.length > 0) {
  process.exit(1);
}
