/**
 * Read CSV / Excel files in the browser for imports (ticket G4).
 * Returns { headers: string[], rows: string[][] } with empty trailing rows removed.
 */
import { readSheet } from 'read-excel-file/browser';

/** RFC 4180-ish CSV parser: quoted fields, escaped quotes, commas/newlines inside quotes, BOM. */
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function cellText(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** @param {File} file .csv, .tsv-ish, .xlsx */
export async function readSpreadsheet(file) {
  const name = String(file?.name || '').toLowerCase();
  let grid;
  if (name.endsWith('.xlsx')) {
    grid = await readSheet(file);
  } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
    grid = parseCsv(await file.text());
  } else {
    throw new Error('Upload a .csv or .xlsx file');
  }
  const cleaned = (grid || []).map((r) => (r || []).map(cellText)).filter((r) => r.some((c) => c !== ''));
  if (!cleaned.length) throw new Error('The file is empty');
  const [headerRow, ...rows] = cleaned;
  const headers = headerRow.map((h, i) => h || `Column ${i + 1}`);
  return { headers, rows };
}

/** Build a CSV string (for error / duplicate downloads). */
export function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

export function downloadText(filename, text) {
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
