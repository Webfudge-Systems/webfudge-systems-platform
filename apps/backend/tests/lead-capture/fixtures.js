'use strict';

/**
 * Sample payloads for the G7 lead-capture tests and the local end-to-end script.
 *  - googleAds: shape from Google's webhook docs (developers.google.com/google-ads/webhook/docs/implementation).
 *  - indiamartPush: shape from IndiaMART's Push API guide (help.indiamart.com); values invented.
 *  - justdial*, ninetyNineAcres*, magicbricks*: ILLUSTRATIVE only — these vendors don't publish their push
 *    payloads or email templates. Replace with a real captured payload/email when an account is available.
 * All names, numbers and addresses are fictitious.
 */

const webForm = {
  name: 'Asha Verma',
  email: 'Asha.Verma@Example.in',
  phone: '098765 43210',
  company: 'Verma Textiles Pvt Ltd',
  message: 'Need a quote for 500 units.\nDelivery to Surat.',
  city: 'Surat',
  utm_source: 'google',
  utm_medium: 'cpc',
  utm_campaign: 'diwali-sale',
  budget: '2 lakh',
  _wf_hp: '',
  _wf_page: 'https://verma.example.in/contact?utm_source=google',
  _wf_ref: 'https://www.google.com/',
  _wf_form: 'Contact us',
};

const googleAds = {
  lead_id: 'TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ-abcdefghijklmnopqrstuvwxyz-0123456789-AaBbCcDdEeFfGgHhIiJjKkLl',
  user_column_data: [
    { column_name: 'Full Name', string_value: 'Rohan Mehta', column_id: 'FULL_NAME' },
    { column_name: 'User Phone', string_value: '+919812345678', column_id: 'PHONE_NUMBER' },
    { column_name: 'User Email', string_value: 'rohan.mehta@example.com', column_id: 'EMAIL' },
    { column_name: 'Postal Code', string_value: '411001', column_id: 'POSTAL_CODE' },
    { column_name: 'City', string_value: 'Pune', column_id: 'CITY' },
    { column_name: 'What is your budget?', string_value: '₹5-10 lakh', column_id: 'QUESTION_1' },
  ],
  api_version: '1.0',
  form_id: 40000000000,
  campaign_id: 12345678901,
  google_key: 'REPLACED_IN_TEST',
  is_test: false,
  gcl_id: 'TeSter-gclid',
  adgroup_id: 20000000000,
  creative_id: 30000000000,
};

const indiamartPush = {
  CODE: 200,
  STATUS: 'SUCCESS',
  RESPONSE: {
    UNIQUE_QUERY_ID: '2650000001',
    QUERY_TYPE: 'W',
    QUERY_TIME: '2026-11-18 11:24:05',
    SENDER_NAME: 'Suresh Patel',
    SENDER_MOBILE: '+91-9898012345',
    SENDER_EMAIL: 'suresh.patel@example.co.in',
    SUBJECT: 'Requirement for Industrial Water Pump',
    SENDER_COMPANY: 'Patel Agro Industries',
    SENDER_ADDRESS: 'Plot 12, GIDC Estate, Vadodara, Gujarat, 390010',
    SENDER_CITY: 'Vadodara',
    SENDER_STATE: 'Gujarat',
    SENDER_PINCODE: '390010',
    SENDER_COUNTRY_ISO: 'IN',
    SENDER_MOBILE_ALT: '',
    SENDER_PHONE: '',
    SENDER_PHONE_ALT: '',
    SENDER_EMAIL_ALT: '',
    QUERY_PRODUCT_NAME: 'Industrial Water Pump',
    QUERY_MESSAGE: 'I want to buy Industrial Water Pump.<br>Quantity: 4 Piece<br>Usage: Agriculture',
    QUERY_MCAT_NAME: 'Water Pumps',
    CALL_DURATION: '',
    RECEIVER_MOBILE: '',
  },
};

const indiamartPull = {
  CODE: 200,
  STATUS: 'SUCCESS',
  MESSAGE: '',
  TOTAL_RECORDS: 2,
  RESPONSE: [
    { ...indiamartPush.RESPONSE, UNIQUE_QUERY_ID: '2650000002', SENDER_NAME: 'Meera Iyer', SENDER_MOBILE: '+91-9443012345', SENDER_EMAIL: 'meera@example.org', SENDER_COMPANY: '' },
    { ...indiamartPush.RESPONSE, UNIQUE_QUERY_ID: '2650000003', QUERY_TYPE: 'P', SENDER_NAME: 'IndiaMART Buyer', SENDER_MOBILE: '+91-9000012345', SENDER_EMAIL: '', SENDER_COMPANY: '', QUERY_MESSAGE: '', CALL_DURATION: '42' },
  ],
};

const justdialPush = {
  leadid: 'JD-778899',
  leadtype: 'company',
  prefix: 'Mr',
  name: 'Vikram Singh',
  mobile: '9811122233',
  phone: '01141234567',
  email: 'vikram.singh@example.com',
  date: '2026-11-18',
  category: 'Interior Designers',
  city: 'Delhi',
  area: 'Lajpat Nagar',
  brancharea: 'South Delhi',
  pincode: '110024',
  time: '14:05:10',
};

const ninetyNineAcresPush = {
  query_id: '99A-445566',
  name: 'Kavya Nair',
  email: 'kavya.nair@example.com',
  mobile: '+91 98450 11223',
  project_name: 'Green Meadows Phase 2',
  locality: 'Whitefield',
  city: 'Bengaluru',
  budget: '85L - 1Cr',
  property_type: '3 BHK Apartment',
  message: 'Please share the brochure and price list.',
};

const magicbricksPush = {
  lead_id: 'MB-990011',
  customer_name: 'Arjun Rao',
  customer_email: 'arjun.rao@example.com',
  customer_mobile: '9700011122',
  property_name: 'Lake View Residency',
  locality: 'Gachibowli',
  city: 'Hyderabad',
};

const justdialEmail = {
  from: 'Justdial <noreply@justdial.com>',
  subject: 'Enquiry for Interior Designers from Neha Kapoor',
  text: [
    'Dear Customer,',
    'You have received a new enquiry on Justdial.',
    '',
    'Caller Name: Ms Neha Kapoor',
    'Caller Number: +91-9876501234',
    'Caller Email: neha.kapoor@example.com',
    'Category: Interior Designers',
    'Caller Area: Andheri West',
    'City: Mumbai',
    'Date & Time: 18-11-2026 10:42',
    'Lead ID: JD-112233',
    '',
    'Regards, Team Justdial (support@justdial.com)',
  ].join('\n'),
};

const ninetyNineAcresEmail = {
  from: '99acres <responses@99acres.com>',
  subject: 'Response received on Sunrise Heights, Baner',
  html: `<table>
    <tr><td>Name</td><td>Pranav Joshi</td></tr>
    <tr><td>Email</td><td>pranav.joshi@example.com</td></tr>
    <tr><td>Mobile</td><td>+91 9822012345</td></tr>
    <tr><td>Property</td><td>Sunrise Heights - 2 BHK</td></tr>
    <tr><td>Locality</td><td>Baner, Pune</td></tr>
    <tr><td>Query ID</td><td>Q99-5566</td></tr>
  </table><p>Message: Is the price negotiable?</p><p>Team 99acres | do-not-reply@99acres.com</p>`,
};

const magicbricksEmail = {
  from: 'Magicbricks <noreply@magicbricks.com>',
  subject: 'Ritu Sharma is interested in your property Palm Grove Villas',
  text: 'Buyer details\nName - Ritu Sharma\nMobile - 9811012345\nEmail - ritu.sharma@example.com\nLocality - Sector 62, Noida\nBudget - 1.2 Cr\n\nMagicbricks Realty Services',
};

module.exports = {
  webForm,
  googleAds,
  indiamartPush,
  indiamartPull,
  justdialPush,
  ninetyNineAcresPush,
  magicbricksPush,
  justdialEmail,
  ninetyNineAcresEmail,
  magicbricksEmail,
};
