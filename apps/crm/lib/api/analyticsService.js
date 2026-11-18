/**
 * Grow analytics (ticket G15) — Strapi /crm-analytics.
 */
import strapiClient from '../strapiClient';

const analyticsService = {
  /** @param {{ from: string, to: string, ownerId?: string|number, departmentId?: string|number }} params (YYYY-MM-DD) */
  async report(params) {
    const q = { from: params.from, to: params.to };
    if (params.ownerId) q.ownerId = params.ownerId;
    else if (params.departmentId) q.departmentId = params.departmentId;
    const res = await strapiClient.get('/crm-analytics', q);
    return { data: res?.data || null, meta: res?.meta || {} };
  },
};

/** Download rows as a CSV file. columns: [{ key, label, format? }] */
export function downloadCsv(filename, rows, columns) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.label)).join(',')];
  for (const r of rows) lines.push(columns.map((c) => esc(c.format ? c.format(r[c.key], r) : r[c.key])).join(','));
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default analyticsService;
