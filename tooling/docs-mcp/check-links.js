#!/usr/bin/env node

const { checkDocLinks } = require('./lib');

const rootArg = process.argv.find((arg) => arg.startsWith('--root='));
const root = rootArg ? rootArg.slice('--root='.length) : 'docs';
const warnOnly = process.argv.includes('--warn-only');
const result = checkDocLinks({ root });

console.log(JSON.stringify(result, null, 2));

if (!warnOnly && result.broken.length > 0) {
  process.exit(1);
}
