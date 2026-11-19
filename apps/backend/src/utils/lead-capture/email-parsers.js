'use strict';

/**
 * Lead-notification email parsers for JustDial, 99acres and MagicBricks (ticket G7).
 *
 * These portals send most customers their leads only by email. This module turns one such email
 * ({ subject, text, html, from }) into the normalised lead shape. There is NO inbox integration:
 * POST the email to /api/lead-capture/<source>/<token>/email from whatever receives the mail
 * (an email-forwarding service, a Gmail/Zapier/Make "new email" trigger, a Cloudflare Email Worker…).
 *
 * The portals don't publish their email templates and change them from time to time, so the parser
 * does not depend on one exact layout. It reads "Label: value" lines (and "Label" / "value" on two
 * lines inside HTML tables) using per-portal label synonyms, then falls back to regexes for an email
 * address and an Indian mobile number in the body. The sample emails in tests/lead-capture/fixtures are
 * ILLUSTRATIVE (built from the field names these portals are known to use), not captured real emails —
 * check the parser against a real lead email before relying on it, and add that email as a fixture.
 */

const { clean, completeName, compact, EMAIL_IN_TEXT, PHONE_IN_TEXT } = require('./fields');

const COMMON_LABELS = {
  fullName: ['name', 'customer name', 'buyer name', 'contact name', 'caller name', 'user name', 'client name', 'enquirer name', 'sender name', 'lead name'],
  email: ['email', 'email id', 'e-mail', 'email address', 'customer email', 'buyer email', 'caller email'],
  phone: ['mobile', 'mobile no', 'mobile number', 'phone', 'phone no', 'phone number', 'contact', 'contact no', 'contact number', 'caller number', 'caller mobile', 'customer mobile', 'buyer mobile'],
  city: ['city', 'customer city', 'buyer city', 'caller city', 'location'],
  message: ['message', 'requirement', 'enquiry', 'inquiry', 'query', 'comments', 'remarks', 'details'],
};

const PORTAL_LABELS = {
  justdial: {
    category: ['category', 'searched for', 'search category', 'enquiry for', 'service'],
    area: ['area', 'caller area', 'locality', 'searched in'],
    leadId: ['lead id', 'enquiry id', 'reference id'],
    leadType: ['lead type', 'enquiry type'],
    date: ['date', 'date & time', 'enquiry date', 'call time', 'time'],
  },
  ninety_nine_acres: {
    project: ['project', 'project name', 'property', 'property name', 'property title', 'listing'],
    property: ['property id', 'listing id', 'prop id'],
    locality: ['locality', 'location of property', 'property location', 'area'],
    budget: ['budget', 'price', 'expected price'],
    propertyType: ['property type', 'bhk', 'configuration'],
    leadId: ['query id', 'lead id', 'enquiry id', 'response id'],
    date: ['date', 'query date', 'enquiry date', 'received on'],
  },
  magicbricks: {
    project: ['project', 'project name', 'property', 'property name', 'property title', 'listing'],
    property: ['property id', 'listing id', 'prop id'],
    locality: ['locality', 'property location', 'area'],
    budget: ['budget', 'price', 'expected price'],
    propertyType: ['property type', 'bhk', 'configuration'],
    leadId: ['lead id', 'query id', 'enquiry id', 'response id'],
    date: ['date', 'enquiry date', 'received on'],
  },
};

/** Sender domains whose addresses must never be taken as the lead's own email. */
const PORTAL_DOMAINS = /(justdial\.com|jdmail\.|99acres\.com|magicbricks\.com|indiamart\.com|info-edge|timesgroup\.com|noreply|no-reply|donotreply|do-not-reply)/i;

/** Very small HTML → text: keeps table cells / rows as separate lines. */
function htmlToText(html) {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

const normLabel = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9& ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * "Label: value" pairs from the email body. Also handles a label on its own line followed by its value
 * (common in HTML tables once flattened). Returns Map(normalisedLabel → value), first occurrence wins.
 */
function extractPairs(text, knownLabels) {
  const pairs = new Map();
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z][A-Za-z0-9 &./()'-]{0,40}?)\s*[:\-–]\s+(.+)$/) || lines[i].match(/^([A-Za-z][A-Za-z0-9 &./()'-]{0,40}?)\s*:\s*(.+)$/);
    if (m) {
      const label = normLabel(m[1]);
      if (label && !pairs.has(label)) pairs.set(label, m[2].trim());
      continue;
    }
    // "Label" / "value" on consecutive lines, only for labels we know (avoids pairing random prose).
    const bare = normLabel(lines[i].replace(/:$/, ''));
    if (knownLabels.has(bare) && i + 1 < lines.length && !pairs.has(bare)) {
      const next = lines[i + 1];
      if (!knownLabels.has(normLabel(next.replace(/:$/, '')))) {
        pairs.set(bare, next.replace(/^:\s*/, ''));
        i += 1;
      }
    }
  }
  return pairs;
}

function lookup(pairs, synonyms) {
  for (const s of synonyms) {
    const v = pairs.get(normLabel(s));
    if (v) return clean(v);
  }
  return '';
}

function firstEmail(text) {
  for (const m of String(text || '').match(EMAIL_IN_TEXT) || []) {
    if (!PORTAL_DOMAINS.test(m)) return m;
  }
  return '';
}

function firstPhone(text) {
  const m = String(text || '').match(PHONE_IN_TEXT);
  return m ? m[0].trim() : '';
}

/** Subject line patterns: "Enquiry for X from Name", "New lead for X", "Name is interested in X". */
function parseSubject(subject) {
  const s = clean(subject, 300);
  const out = {};
  let m = s.match(/(?:enquiry|inquiry|lead|response|query)\s+(?:received\s+)?(?:for|on)\s+(.+?)(?:\s+from\s+(.+?))?(?:\s*[|,]|$)/i);
  if (m) {
    out.topic = m[1].trim();
    if (m[2]) out.name = m[2].trim();
  }
  m = s.match(/^(.+?)\s+(?:is interested in|has enquired (?:about|for)|enquired for|contacted you for)\s+(.+?)(?:\s*[|,]|$)/i);
  if (m) {
    out.name = out.name || m[1].trim();
    out.topic = out.topic || m[2].trim();
  }
  if (out.topic) out.topic = out.topic.replace(/^(?:your\s+)?(?:property|listing|project)\s+(?=\S)/i, '').replace(/^your\s+/i, '');
  return out;
}

/**
 * @param {'justdial'|'ninety_nine_acres'|'magicbricks'} source
 * @param {{ subject?: string, text?: string, html?: string, from?: string }} email
 * @returns {{ lead, sourceDetails, externalId? }}
 */
function parseLeadEmail(source, email) {
  const e = email && typeof email === 'object' ? email : {};
  const portal = PORTAL_LABELS[source] || {};
  const text = [e.text ? String(e.text) : '', e.html ? htmlToText(e.html) : ''].filter(Boolean).join('\n');
  const labelSets = { ...COMMON_LABELS, ...portal };
  const known = new Set(Object.values(labelSets).flat().map(normLabel));
  const pairs = extractPairs(text, known);
  const subj = parseSubject(e.subject);

  const get = (field) => lookup(pairs, labelSets[field] || []);
  const details = {};
  for (const field of Object.keys(portal)) {
    const v = get(field);
    if (v) details[field] = v.slice(0, 300);
  }

  let emailAddr = get('email');
  if (emailAddr && PORTAL_DOMAINS.test(emailAddr)) emailAddr = '';
  const lead = completeName({
    fullName: get('fullName') || subj.name || '',
    email: (emailAddr.match(EMAIL_IN_TEXT) || [])[0] || firstEmail(text),
    phone: get('phone') || firstPhone(text),
    city: get('city'),
  });

  const topic = details.category || details.project || subj.topic || '';
  const msg = get('message');
  lead.message = [topic ? `Enquiry for ${topic}` : '', msg].filter(Boolean).join('\n') || clean(e.subject, 300);
  if (source === 'justdial') {
    if (details.category) lead.industry = details.category;
    if (details.area) lead.address = details.area;
  } else if (details.locality) {
    lead.address = details.locality;
  }

  return {
    lead,
    externalId: details.leadId || undefined,
    sourceDetails: compact({
      ...details,
      viaEmail: true,
      emailSubject: clean(e.subject, 300),
      emailFrom: clean(e.from, 200),
    }),
  };
}

module.exports = { parseLeadEmail, htmlToText, extractPairs, parseSubject, EMAIL_SOURCES: Object.keys(PORTAL_LABELS) };
