'use strict';

/**
 * Payload → normalised lead mappers for each lead source (ticket G7). Pure functions, unit tested in
 * tests/lead-capture/mappers.test.js.
 *
 * Payload formats and how sure we are of them:
 *  - web_form:   our own embeddable form (see apps/crm/lib/leadCaptureSnippet.js). Also accepts common
 *                field names so existing site forms (WordPress CF7, Webflow, custom) can post to it.
 *  - google_ads: Google Ads lead form webhook, documented at
 *                https://developers.google.com/google-ads/webhook/docs/implementation
 *  - indiamart:  IndiaMART Lead Manager CRM Push API, example payload at
 *                https://help.indiamart.com/knowledge-base/integration-of-indiamarts-lead-manager-crm-push-api-with-third-party-crms-real-time-push-of-leads
 *                (same record shape as the Pull API v2 RESPONSE array).
 *  - justdial:   NOT publicly documented. JustDial's account manager configures a GET push to a URL;
 *                field names below are the ones commonly reported (leadid, name, mobile, email, category,
 *                city, area, …) and every lookup also accepts generic synonyms. Verify with a real test lead.
 *  - 99acres / magicbricks: no public push API (builder CRM integrations are arranged with the portal).
 *                Generic field mapping; most accounts only get lead emails (see email-parsers.js).
 */

const { clean, cleanMultiline, pick, normKeys, completeName, compact } = require('./fields');

const NAME_KEYS = ['full_name', 'fullname', 'name', 'your-name', 'your_name', 'contact_name', 'customer_name', 'sender_name', 'buyer_name'];
const FIRST_KEYS = ['first_name', 'firstname', 'fname', 'given_name'];
const LAST_KEYS = ['last_name', 'lastname', 'lname', 'surname', 'family_name'];
const EMAIL_KEYS = ['email', 'email_address', 'emailaddress', 'your-email', 'e-mail', 'mail', 'work_email', 'sender_email', 'customer_email', 'buyer_email', 'user_email'];
const PHONE_KEYS = ['phone', 'mobile', 'phone_number', 'mobile_number', 'mobile_no', 'tel', 'telephone', 'contact_number', 'contact_no', 'whatsapp', 'your-phone', 'cell', 'sender_mobile', 'customer_mobile', 'customer_phone', 'buyer_mobile', 'user_phone'];
const COMPANY_KEYS = ['company', 'company_name', 'organization', 'organisation', 'business', 'business_name', 'firm'];
const CITY_KEYS = ['city', 'town', 'location'];
const STATE_KEYS = ['state', 'region', 'province'];
const COUNTRY_KEYS = ['country', 'country_code'];
const ZIP_KEYS = ['zip', 'zipcode', 'zip_code', 'pincode', 'pin_code', 'pin', 'postal_code', 'postcode'];
const ADDRESS_KEYS = ['address', 'street', 'street_address'];
const WEBSITE_KEYS = ['website', 'url', 'site', 'company_website'];
const TITLE_KEYS = ['job_title', 'jobtitle', 'designation', 'title', 'role'];
const MESSAGE_KEYS = ['message', 'your-message', 'comments', 'comment', 'enquiry', 'inquiry', 'requirement', 'requirements', 'notes', 'details', 'query', 'description'];
const INDUSTRY_KEYS = ['industry', 'sector', 'business_type'];

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid'];

/** Field names our embeddable snippet uses for its own metadata (never shown as "extra" fields). */
const WEB_FORM_META = {
  honeypot: '_wf_hp',
  renderedAt: '_wf_ts',
  pageUrl: '_wf_page',
  referrer: '_wf_ref',
  formName: '_wf_form',
  landingUrl: '_wf_landing',
};

const KNOWN_WEB_KEYS = normKeys([
  ...NAME_KEYS, ...FIRST_KEYS, ...LAST_KEYS, ...EMAIL_KEYS, ...PHONE_KEYS, ...COMPANY_KEYS, ...CITY_KEYS,
  ...STATE_KEYS, ...COUNTRY_KEYS, ...ZIP_KEYS, ...ADDRESS_KEYS, ...WEBSITE_KEYS, ...TITLE_KEYS,
  ...MESSAGE_KEYS, ...INDUSTRY_KEYS, ...UTM_KEYS, 'page_url', 'referrer', 'form_name', 'g-recaptcha-response',
]);

function genericLead(body) {
  return completeName({
    fullName: pick(body, NAME_KEYS),
    firstName: pick(body, FIRST_KEYS),
    lastName: pick(body, LAST_KEYS),
    email: pick(body, EMAIL_KEYS),
    phone: pick(body, PHONE_KEYS),
    companyName: pick(body, COMPANY_KEYS),
    city: pick(body, CITY_KEYS),
    state: pick(body, STATE_KEYS),
    country: pick(body, COUNTRY_KEYS),
    zipCode: pick(body, ZIP_KEYS),
    address: pick(body, ADDRESS_KEYS),
    website: pick(body, WEBSITE_KEYS),
    jobTitle: pick(body, TITLE_KEYS),
    industry: pick(body, INDUSTRY_KEYS),
    message: cleanMultiline(findRaw(body, MESSAGE_KEYS)),
  });
}

/** Raw (uncleaned) value for the first matching key — keeps newlines for messages. */
function findRaw(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  const wanted = keys.map((k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const w of wanted) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === w && obj[k] != null && obj[k] !== '') return obj[k];
    }
  }
  return '';
}

/**
 * Website form (our snippet or any HTML form).
 * @returns {{ lead, sourceDetails, spam?: string }}
 */
function mapWebForm(body, { now = Date.now() } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const lead = genericLead(b);

  let spam;
  if (clean(b[WEB_FORM_META.honeypot])) spam = 'honeypot field was filled';
  const ts = Number(b[WEB_FORM_META.renderedAt]);
  if (!spam && Number.isFinite(ts) && ts > 0 && now - ts < 2000) spam = 'submitted less than 2 seconds after the form loaded';

  const utm = {};
  for (const k of UTM_KEYS) {
    const v = pick(b, [k]);
    if (v) utm[k] = v.slice(0, 300);
  }
  const extra = {};
  for (const [k, v] of Object.entries(b)) {
    if (k.startsWith('_wf_') || KNOWN_WEB_KEYS.has(k.toLowerCase().replace(/[^a-z0-9]/g, ''))) continue;
    const s = clean(v, 500);
    if (s && Object.keys(extra).length < 30) extra[clean(k, 60)] = s;
  }

  return {
    lead,
    spam,
    sourceDetails: compact({
      formName: clean(b[WEB_FORM_META.formName] || b.form_name, 120),
      pageUrl: clean(b[WEB_FORM_META.pageUrl] || b.page_url, 500),
      landingUrl: clean(b[WEB_FORM_META.landingUrl], 500),
      referrer: clean(b[WEB_FORM_META.referrer] || b.referrer, 500),
      utm: compact(utm),
      extraFields: compact(extra),
    }),
  };
}

const GOOGLE_COLUMNS = {
  FULL_NAME: 'fullName',
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
  EMAIL: 'email',
  WORK_EMAIL: 'email',
  PHONE_NUMBER: 'phone',
  WORK_PHONE: 'phone',
  COMPANY_NAME: 'companyName',
  JOB_TITLE: 'jobTitle',
  CITY: 'city',
  REGION: 'state',
  COUNTRY: 'country',
  POSTAL_CODE: 'zipCode',
  STREET_ADDRESS: 'address',
};

/**
 * Google Ads lead form extension webhook.
 * @returns {{ lead, sourceDetails, externalId, isTest, googleKey }}
 */
function mapGoogleAds(body) {
  const b = body && typeof body === 'object' ? body : {};
  const lead = {};
  const answers = [];
  for (const col of Array.isArray(b.user_column_data) ? b.user_column_data : []) {
    if (!col || typeof col !== 'object') continue;
    const id = clean(col.column_id).toUpperCase();
    const value = clean(col.string_value);
    if (!value) continue;
    const field = GOOGLE_COLUMNS[id];
    if (field && !lead[field]) lead[field] = value;
    else answers.push({ question: clean(col.column_name, 200) || humanize(id), answer: value.slice(0, 500) });
  }
  completeName(lead);
  if (answers.length) lead.message = answers.map((a) => `${a.question}: ${a.answer}`).join('\n');

  return {
    lead,
    externalId: clean(b.lead_id, 200) || undefined,
    isTest: b.is_test === true || b.is_test === 'true',
    googleKey: b.google_key == null ? '' : String(b.google_key),
    sourceDetails: compact({
      leadId: clean(b.lead_id, 200),
      formId: clean(b.form_id, 60),
      campaignId: clean(b.campaign_id, 60),
      adGroupId: clean(b.adgroup_id, 60),
      creativeId: clean(b.creative_id, 60),
      gclid: clean(b.gcl_id, 300),
      apiVersion: clean(b.api_version, 20),
      answers: answers.length ? answers : undefined,
    }),
  };
}

function humanize(id) {
  return String(id || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** IndiaMART QUERY_TYPE codes (from IndiaMART's own push guide + common integrations). */
const INDIAMART_QUERY_TYPES = {
  W: 'Direct enquiry',
  B: 'Consumed BuyLead',
  BL: 'Consumed BuyLead',
  P: 'Call (PNS)',
  V: 'Catalog view',
  BIZ: 'Catalog view',
  WA: 'WhatsApp enquiry',
};

/** Extract IndiaMART lead records from a push body (object RESPONSE) or a pull response (array RESPONSE). */
function indiamartRecords(body) {
  let b = body && typeof body === 'object' ? body : {};
  let resp = b.RESPONSE ?? b.response;
  if (typeof resp === 'string') {
    try {
      resp = JSON.parse(resp);
    } catch (_) {
      resp = null;
    }
  }
  if (Array.isArray(resp)) return resp.filter((r) => r && typeof r === 'object');
  if (resp && typeof resp === 'object') return [resp];
  if (b.UNIQUE_QUERY_ID || b.SENDER_MOBILE || b.SENDER_EMAIL) return [b];
  return [];
}

/** One IndiaMART record → normalised lead. */
function mapIndiaMartRecord(r) {
  const phone = clean(r.SENDER_MOBILE) || clean(r.SENDER_PHONE) || clean(r.SENDER_MOBILE_ALT) || clean(r.SENDER_PHONE_ALT);
  const email = clean(r.SENDER_EMAIL) || clean(r.SENDER_EMAIL_ALT);
  const subject = clean(r.SUBJECT, 300);
  const body = cleanMultiline(r.QUERY_MESSAGE);
  const type = clean(r.QUERY_TYPE).toUpperCase();
  const lead = completeName({
    fullName: clean(r.SENDER_NAME),
    email,
    phone,
    companyName: clean(r.SENDER_COMPANY),
    address: clean(r.SENDER_ADDRESS, 500),
    city: clean(r.SENDER_CITY),
    state: clean(r.SENDER_STATE),
    zipCode: clean(r.SENDER_PINCODE),
    country: clean(r.SENDER_COUNTRY_ISO),
    industry: clean(r.QUERY_MCAT_NAME),
    message: [subject, body].filter(Boolean).join('\n'),
  });
  return {
    lead,
    externalId: clean(r.UNIQUE_QUERY_ID, 100) || undefined,
    sourceDetails: compact({
      queryId: clean(r.UNIQUE_QUERY_ID, 100),
      queryType: type ? `${type}${INDIAMART_QUERY_TYPES[type] ? ` (${INDIAMART_QUERY_TYPES[type]})` : ''}` : '',
      queryTime: clean(r.QUERY_TIME, 40),
      product: clean(r.QUERY_PRODUCT_NAME, 300),
      category: clean(r.QUERY_MCAT_NAME, 200),
      altMobile: clean(r.SENDER_MOBILE_ALT),
      altPhone: clean(r.SENDER_PHONE_ALT) || clean(r.SENDER_PHONE),
      altEmail: clean(r.SENDER_EMAIL_ALT),
      callDuration: clean(r.CALL_DURATION, 20),
      receiverMobile: clean(r.RECEIVER_MOBILE, 30),
    }),
  };
}

/** IndiaMART push body → first record (push sends one lead per call). */
function mapIndiaMart(body) {
  const recs = indiamartRecords(body);
  return recs.length ? mapIndiaMartRecord(recs[0]) : { lead: {}, sourceDetails: {} };
}

/** JustDial lead push (GET query string or POST body). Field names unconfirmed — see file header. */
function mapJustDial(body) {
  const b = body && typeof body === 'object' ? body : {};
  const prefix = pick(b, ['prefix', 'salutation']);
  const name = pick(b, ['name', ...NAME_KEYS, 'caller_name', 'callername']);
  const category = pick(b, ['category', 'category_name', 'service', 'product']);
  const area = pick(b, ['area', 'locality']);
  const lead = completeName({
    fullName: name,
    email: pick(b, EMAIL_KEYS),
    phone: pick(b, ['mobile', 'mobile_no', 'caller_mobile', ...PHONE_KEYS]),
    companyName: pick(b, ['company', 'company_name', 'business_name']),
    city: pick(b, CITY_KEYS),
    zipCode: pick(b, ['pincode', ...ZIP_KEYS]),
    address: area,
    industry: category,
    message: category ? `Enquiry for ${category}${area ? ` (${area})` : ''}` : cleanMultiline(findRaw(b, MESSAGE_KEYS)),
  });
  const altPhone = pick(b, ['phone', 'landline']);
  return {
    lead,
    externalId: pick(b, ['leadid', 'lead_id', 'id']) || undefined,
    sourceDetails: compact({
      leadId: pick(b, ['leadid', 'lead_id', 'id']),
      leadType: pick(b, ['leadtype', 'lead_type', 'type']),
      prefix,
      category,
      area,
      branchArea: pick(b, ['brancharea', 'branch_area']),
      branchPin: pick(b, ['branchpin', 'branch_pin']),
      altPhone: altPhone && altPhone !== lead.phone ? altPhone : '',
      date: pick(b, ['date', 'lead_date']),
      time: pick(b, ['time', 'lead_time']),
      parentId: pick(b, ['parentid', 'parent_id']),
    }),
  };
}

/** 99acres / MagicBricks webhook (portal-arranged CRM push or a forwarder like Zapier). */
function mapPropertyPortal(body, portal) {
  const b = body && typeof body === 'object' ? body : {};
  const lead = genericLead(b);
  const project = pick(b, ['project', 'project_name', 'projectname', 'property_name', 'propertyname', 'listing', 'listing_name']);
  const property = pick(b, ['property_id', 'propertyid', 'listing_id', 'prop_id', 'property']);
  const locality = pick(b, ['locality', 'area', 'sector', 'micro_market']);
  if (!lead.message && project) lead.message = `Enquiry for ${project}${locality ? `, ${locality}` : ''}`;
  if (!lead.address && locality) lead.address = locality;
  const leadId = pick(b, ['lead_id', 'leadid', 'query_id', 'queryid', 'enquiry_id', 'id']);
  return {
    lead,
    externalId: leadId || undefined,
    sourceDetails: compact({
      portal,
      leadId,
      project,
      property,
      locality,
      budget: pick(b, ['budget', 'price', 'price_range']),
      propertyType: pick(b, ['property_type', 'propertytype', 'unit_type', 'bhk']),
      enquiryDate: pick(b, ['date', 'enquiry_date', 'lead_date', 'created_at']),
    }),
  };
}

module.exports = {
  WEB_FORM_META,
  UTM_KEYS,
  GOOGLE_COLUMNS,
  INDIAMART_QUERY_TYPES,
  mapWebForm,
  mapGoogleAds,
  indiamartRecords,
  mapIndiaMartRecord,
  mapIndiaMart,
  mapJustDial,
  mapPropertyPortal,
};
