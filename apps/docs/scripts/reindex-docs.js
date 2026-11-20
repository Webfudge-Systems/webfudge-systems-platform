#!/usr/bin/env node

const http = require('http');
const https = require('https');

const apiBase = (process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_API_URL || 'http://localhost:1337').replace(/\/$/, '');
const token = process.env.DOCS_ADMIN_TOKEN || process.argv.find((arg) => arg.startsWith('--token='))?.slice('--token='.length) || '';

if (!token) {
  console.error('Set DOCS_ADMIN_TOKEN or pass --token=<jwt> to reindex documentation search.');
  process.exit(1);
}

const url = `${apiBase}/api/documentation/reindex`;
const parsed = new URL(url);
const transport = parsed.protocol === 'https:' ? https : http;

const req = transport.request(
  {
    method: 'POST',
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        console.error(`Reindex failed (${res.statusCode}): ${body}`);
        process.exit(1);
      }

      const json = JSON.parse(body || '{}');
      console.log(`Reindexed ${json.data?.length || 0} documentation pages.`);
    });
  }
);

req.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});

req.end();
