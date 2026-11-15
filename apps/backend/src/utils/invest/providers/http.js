'use strict';

const DEFAULT_TIMEOUT_MS = 15000;
const USER_AGENT = 'Mozilla/5.0 (compatible; webfudge-invest/1.0)';

async function fetchWithTimeout(url, { timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: '*/*', ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res;
}

async function getJson(url, opts) {
  const res = await fetchWithTimeout(url, opts);
  return res.json();
}

async function getText(url, opts) {
  const res = await fetchWithTimeout(url, opts);
  return res.text();
}

/** "09-11-2026" (dd-mm-yyyy) → "2026-11-09" */
function ddmmyyyyToIso(value) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(value || '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** "09-Nov-2026" → "2026-11-09" */
const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
function ddMonYyyyToIso(value) {
  const m = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(String(value || '').trim());
  if (!m) return null;
  const mm = MONTHS[m[2].toLowerCase()];
  return mm ? `${m[3]}-${mm}-${m[1]}` : null;
}

function toIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/** Run async work over items with a small concurrency limit. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

module.exports = { getJson, getText, ddmmyyyyToIso, ddMonYyyyToIso, toIsoDate, mapLimit };
