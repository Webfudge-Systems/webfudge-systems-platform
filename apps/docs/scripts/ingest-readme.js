#!/usr/bin/env node
/**
 * Ingest a README.md file into the Webfudge Documentation API.
 *
 * Usage:
 *   node scripts/ingest-readme.js \
 *     --file apps/crm/README.md \
 *     --title "CRM — Fudge Grow" \
 *     --app crm \
 *     --category "Applications" \
 *     --status published \
 *     --token <auth-token>
 *
 * Options:
 *   --file       Path to the README.md file (required)
 *   --title      Page title (required)
 *   --app        App slug (e.g. crm, pm, accounts)
 *   --category   Sidebar section (default: "General")
 *   --order      Sort order (default: 0)
 *   --status     draft | published | archived  (default: draft)
 *   --package    Package name for version-aware docs (optional)
 *   --version    Package/release version for version-aware docs (optional)
 *   --locale     Locale code for translated docs (default: en)
 *   --token      Auth JWT (or set DOCS_ADMIN_TOKEN env variable)
 *   --api        Strapi API base URL (default: http://localhost:1338)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

const args = parseArgs(process.argv);

const filePath = args.file;
const title = args.title;
const appSlug = args.app || '';
const category = args.category || 'General';
const order = parseInt(args.order || '0', 10);
const status = args.status || 'draft';
const token = args.token || process.env.DOCS_ADMIN_TOKEN || '';
const apiBase = (args.api || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1338').replace(/\/$/, '');

if (!filePath || !title) {
  console.error('Error: --file and --title are required');
  process.exit(1);
}

const absolutePath = path.isAbsolute(filePath)
  ? filePath
  : path.resolve(process.cwd(), filePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
async function resolveAppId(slug) {
  if (!slug) return null;
  const url = `${apiBase}/api/documentation/apps`;
  const data = await fetchJson(url);
  const match = (data?.data || []).find((a) => a.slug === slug || a.name.toLowerCase() === slug.toLowerCase());
  return match?.id || null;
}

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function multipartPost(url, fields, fileBuffer, filename, token) {
  return new Promise((resolve, reject) => {
    const boundary = `----WebKitFormBoundary${Date.now().toString(16)}`;
    const parts = [];

    for (const [key, value] of Object.entries(fields)) {
      if (value == null || value === '') continue;
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      );
    }

    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: text/markdown\r\n\r\n`;
    const fileFooter = `\r\n--${boundary}--\r\n`;

    const headerBuf = Buffer.from(parts.join('') + fileHeader, 'utf8');
    const footerBuf = Buffer.from(fileFooter, 'utf8');
    const body = Buffer.concat([headerBuf, fileBuffer, footerBuf]);

    const parsedUrl = new URL(url);
    const options = {
      method: 'POST',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const mod = parsedUrl.protocol === 'https:' ? https : http;
    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`\nIngesting: ${absolutePath}`);
  console.log(`Title: ${title}`);
  console.log(`App slug: ${appSlug || '(none)'}`);
  console.log(`Category: ${category} | Order: ${order} | Status: ${status}`);
  console.log(`API: ${apiBase}\n`);

  const applicationId = await resolveAppId(appSlug);
  if (appSlug && !applicationId) {
    console.warn(`Warning: App with slug "${appSlug}" not found. Proceeding without application link.`);
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  const filename = path.basename(absolutePath);

  const fields = {
    title,
    category,
    order: String(order),
    status,
    sourcePath: path.relative(process.cwd(), absolutePath).replace(/\\/g, '/'),
    sourceHash: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
    ...(args.package ? { packageName: args.package } : {}),
    ...(args.version ? { version: args.version } : {}),
    ...(args.locale ? { locale: args.locale } : {}),
    ...(applicationId ? { applicationId: String(applicationId) } : {}),
  };

  const url = `${apiBase}/api/documentation/upload-markdown`;
  const result = await multipartPost(url, fields, fileBuffer, filename, token);

  if (result.status === 200 || result.status === 201) {
    const page = result.body?.data;
    console.log(`✓ Success! Page created/updated: /${page?.slug || '?'} (id: ${page?.id || '?'})`);
  } else {
    console.error(`✗ Failed (HTTP ${result.status}):`);
    console.error(JSON.stringify(result.body, null, 2));
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
