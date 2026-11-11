'use strict';

/**
 * SIP due dates between the plan's start and min(endDate, today), as 'YYYY-MM-DD' strings.
 * Monthly/quarterly plans fall on `dayOfMonth` (1–28); weekly plans repeat every 7 days from start.
 */
function sipDueDates(sip, todayIso = new Date().toISOString().slice(0, 10)) {
  const start = String(sip.startDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return [];
  const endCap = sip.endDate && String(sip.endDate).slice(0, 10) < todayIso ? String(sip.endDate).slice(0, 10) : todayIso;
  const out = [];
  const MAX = 1200;

  if (sip.frequency === 'weekly') {
    let d = new Date(`${start}T00:00:00Z`);
    while (out.length < MAX) {
      const iso = d.toISOString().slice(0, 10);
      if (iso > endCap) break;
      out.push(iso);
      d = new Date(d.getTime() + 7 * 86400000);
    }
    return out;
  }

  const step = sip.frequency === 'quarterly' ? 3 : 1;
  const day = Math.min(Math.max(parseInt(sip.dayOfMonth, 10) || Number(start.slice(8, 10)) || 1, 1), 28);
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7)) - 1;
  // First instalment is the first `day` on or after the start date.
  if (day < Number(start.slice(8, 10))) m += 1;
  while (out.length < MAX) {
    const d = new Date(Date.UTC(y, m, day));
    const iso = d.toISOString().slice(0, 10);
    if (iso > endCap) break;
    out.push(iso);
    m += step;
  }
  return out;
}

module.exports = { sipDueDates };
