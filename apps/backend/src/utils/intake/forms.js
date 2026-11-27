'use strict';

/**
 * W13 intake forms: field config + submission validation + task draft. Pure functions (no Strapi).
 * Submissions are untrusted: everything is trimmed, length-capped and stored as plain text.
 */

const FIELD_TYPES = ['text', 'textarea', 'email', 'phone', 'number', 'date', 'select'];
const MAX_FIELDS = 20;
const MAX_VALUE = 5000;
const MIN_FILL_MS = 2000; // humans need more than 2s to fill a form
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

const DEFAULT_FIELDS = [{ key: 'request', label: 'What do you need?', type: 'textarea', required: true }];

function slug(label) {
  return String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';
}

function normalizeFields(input) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(input) ? input.slice(0, MAX_FIELDS) : []) {
    if (!raw || !FIELD_TYPES.includes(raw.type)) continue;
    const label = String(raw.label || '').trim().slice(0, 120);
    if (!label) continue;
    let key = slug(raw.key || label);
    for (let n = 2; seen.has(key); n += 1) key = `${slug(raw.key || label)}_${n}`;
    seen.add(key);
    const field = { key, label, type: raw.type, required: Boolean(raw.required) };
    if (raw.type === 'select') {
      field.options = [...new Set((raw.options || []).map((o) => String(o).trim().slice(0, 120)).filter(Boolean))].slice(0, 50);
      if (!field.options.length) continue;
    }
    out.push(field);
  }
  return out.length ? out : DEFAULT_FIELDS.map((f) => ({ ...f }));
}

const clean = (v, max = MAX_VALUE) => String(v ?? '').trim().slice(0, max);

function validateSubmission(fields, body = {}) {
  const errors = {};
  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  if (!name) errors.name = 'Name is required';
  if (!EMAIL_RE.test(email)) errors.email = 'A valid email is required';

  const input = body.values && typeof body.values === 'object' ? body.values : {};
  const values = {};
  for (const f of fields) {
    const v = clean(input[f.key]);
    if (!v) {
      if (f.required) errors[f.key] = `${f.label} is required`;
      continue;
    }
    if (f.type === 'email' && !EMAIL_RE.test(v)) errors[f.key] = `${f.label} must be an email`;
    else if (f.type === 'number' && !Number.isFinite(Number(v))) errors[f.key] = `${f.label} must be a number`;
    else if (f.type === 'select' && !f.options.includes(v)) errors[f.key] = `${f.label} has an invalid choice`;
    values[f.key] = v;
  }
  const ok = Object.keys(errors).length === 0;
  return { ok, errors, values, submitter: { name, email } };
}

/** Honeypot field `website` must stay empty; `startedAt` (ms, set when the form rendered) must be ≥ 2s ago. */
function looksLikeBot(body = {}, now = Date.now()) {
  if (clean(body.website)) return true;
  const started = Number(body.startedAt);
  if (Number.isFinite(started) && started > 0 && now - started < MIN_FILL_MS) return true;
  return false;
}

function buildFormTaskDraft(channel, fields, validated) {
  const { submitter, values } = validated;
  const first = fields.map((f) => values[f.key]).find(Boolean) || '';
  const firstLine = first.split('\n')[0].trim();
  const name = (firstLine || `Request from ${submitter.name}`).slice(0, 200);
  const lines = [`Submitted by: ${submitter.name} <${submitter.email}>`, `Form: ${channel.name || 'Intake form'}`, ''];
  for (const f of fields) {
    if (!values[f.key]) continue;
    lines.push(f.type === 'textarea' ? `${f.label}:\n${values[f.key]}` : `${f.label}: ${values[f.key]}`, '');
  }
  return { name, description: lines.join('\n').trim(), tags: ['intake', 'intake:form'] };
}

module.exports = { FIELD_TYPES, normalizeFields, validateSubmission, looksLikeBot, buildFormTaskDraft };
