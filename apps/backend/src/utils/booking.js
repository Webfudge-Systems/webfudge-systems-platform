'use strict';

/**
 * Public booking pages (G14): slot maths. A page has weekly availability in the rep's timezone,
 *   availability: { mon: [['09:00', '17:00']], tue: [...], ... }
 * and slots of `durationMinutes`. Slots that start inside `minNoticeMinutes`, or overlap a busy
 * interval (existing CRM meetings, padded by `bufferMinutes`), are left out.
 */

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MIN = 60000;

function validTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Local wall-clock parts of `date` in `tz`. */
function partsIn(date, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, ss: +p.second, wd: p.weekday.toLowerCase().slice(0, 3) };
}

function offsetMs(date, tz) {
  const p = partsIn(date, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss) - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant for a wall-clock time in `tz` (handles DST by re-checking the offset). */
function localToUtc(y, m, d, hh, mm, tz) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - offsetMs(new Date(guess), tz);
  t = guess - offsetMs(new Date(t), tz);
  return new Date(t);
}

const hm = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const v = +m[1] * 60 + +m[2];
  return v >= 0 && v <= 24 * 60 ? v : null;
};

/** Clean availability input; drops malformed windows. */
function normalizeAvailability(raw) {
  const out = {};
  for (const day of DAYS) {
    const wins = Array.isArray(raw?.[day]) ? raw[day] : [];
    out[day] = wins
      .filter((w) => Array.isArray(w) && hm(w[0]) != null && hm(w[1]) != null && hm(w[1]) > hm(w[0]))
      .slice(0, 6)
      .map((w) => [String(w[0]).padStart(5, '0'), String(w[1]).padStart(5, '0')]);
  }
  return out;
}

const clampInt = (v, lo, hi, dflt) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/** @returns {string[]} ISO start times, ascending */
function computeSlots(page, { now = new Date(), busy = [] } = {}) {
  const tz = validTimezone(page.timezone) ? page.timezone : 'UTC';
  const duration = clampInt(page.durationMinutes, 5, 480, 30);
  const buffer = clampInt(page.bufferMinutes, 0, 240, 0);
  const notice = clampInt(page.minNoticeMinutes, 0, 60 * 24 * 30, 240);
  const daysAhead = clampInt(page.daysAhead, 1, 60, 14);
  const avail = normalizeAvailability(page.availability);
  const earliest = now.getTime() + notice * MIN;
  const busyMs = busy.map((b) => [new Date(b.start).getTime() - buffer * MIN, new Date(b.end).getTime() + buffer * MIN]);
  const out = new Set();

  for (let i = 0; i < daysAhead; i += 1) {
    const p = partsIn(new Date(now.getTime() + i * 24 * 60 * MIN), tz);
    for (const [from, to] of avail[p.wd] || []) {
      const end = hm(to);
      for (let t = hm(from); t + duration <= end; t += duration + buffer) {
        const start = localToUtc(p.y, p.m, p.d, Math.floor(t / 60), t % 60, tz).getTime();
        const stop = start + duration * MIN;
        if (start < earliest) continue;
        if (busyMs.some(([bs, be]) => start < be && stop > bs)) continue;
        out.add(new Date(start).toISOString());
      }
    }
  }
  return [...out].sort();
}

module.exports = { DAYS, computeSlots, normalizeAvailability, validTimezone, clampInt, localToUtc };
