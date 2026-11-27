'use strict';

/**
 * G14 cadences + public booking pages, against a real Strapi on a throwaway SQLite database.
 *   npm run test:cadences   (from apps/backend)
 *
 * Acceptance: enrolling a lead in a cadence creates the right tasks / messages on the right days
 * and stops as soon as the lead replies. Booking: free slots only, no double-booking, rate limited,
 * creates a meeting and logs it on the lead. No real email is sent (RESEND_API_KEY is unset).
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-cadences-${process.pid}-${Date.now()}.db`;
const DB_PATH = path.join(__dirname, '..', DB_REL);
const rand = () => crypto.randomBytes(16).toString('base64');
Object.assign(process.env, {
  NODE_ENV: 'test',
  PLATFORM_MODE: 'saas',
  DATABASE_CLIENT: 'sqlite',
  DATABASE_FILENAME: DB_REL,
  JWT_SECRET: rand(),
  ADMIN_JWT_SECRET: rand(),
  API_TOKEN_SALT: rand(),
  TRANSFER_TOKEN_SALT: rand(),
  ENCRYPTION_KEY: rand(),
  APP_KEYS: [rand(), rand()].join(','),
  CACHE_API_ENABLED: 'false',
  BOOKING_IP_LIMIT_PER_MIN: '5',
});
delete process.env.RESEND_API_KEY;
delete process.env.REDIS_URL;

let app;
let base;
const ids = {};
const DAY = 24 * 3600 * 1000;
const realLog = console.log;
if (!process.env.TEST_VERBOSE) console.log = () => {};

async function api(method, url, { token, body, org, ip } = {}) {
  const res = await fetch(`${base}/api${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(org ? { 'X-Organization-Id': String(org) } : {}),
      ...(ip ? { 'X-Forwarded-For': ip } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body: json };
}

const create = (uid, data) => app.entityService.create(uid, { data });
const asA = (method, url, body) => api(method, url, { token: ids.jwtA, org: ids.orgA, body });
const asB = (method, url, body) => api(method, url, { token: ids.jwtB, org: ids.orgB, body });
const tasksFor = (leadId) =>
  app.entityService.findMany('api::task.task', { filters: { leadCompany: { id: leadId } }, sort: [{ id: 'asc' }], limit: 100 });
const activitiesFor = (leadId) =>
  app.entityService.findMany('api::crm-activity.crm-activity', { filters: { leadCompany: { id: leadId } }, sort: [{ id: 'asc' }], limit: 100 });

before(async () => {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const ctx = await compileStrapi();
  app = await createStrapi(ctx).load();
  app.server.mount();
  await new Promise((resolve) => app.server.httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.httpServer.address().port}`;

  const { addMember } = require('../src/utils/saas-org');
  const [crmApp] = await app.entityService.findMany('api::app.app', { filters: { slug: 'crm' }, limit: 1 });
  assert.ok(crmApp, 'SaaS catalog seeded the crm app');

  const user = async (name) =>
    app.plugin('users-permissions').service('user').add({
      username: `${name}${Date.now()}`,
      email: `${name.toLowerCase()}@cadence.test`,
      firstName: name,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
    });
  const jwt = (id) => app.plugin('users-permissions').service('jwt').issue({ id });

  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Org ${key}`, slug: `cad-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', { organization: org.id, app: crmApp.id, status: 'active', planCode: 'free', startDate: new Date() });
    const u = await user(`Rep${key}`);
    ids[`user${key}`] = u.id;
    await addMember(app, { orgId: org.id, userId: u.id, role: 'Admin' });
    ids[`jwt${key}`] = jwt(u.id);
  }

  const lead = async (name, email) => {
    const lc = await create('api::lead-company.lead-company', { companyName: name, email, organization: ids.orgA, assignedTo: ids.userA });
    await create('api::contact.contact', { firstName: 'Priya', lastName: name, email, leadCompany: lc.id, organization: ids.orgA });
    return lc.id;
  };
  ids.lead1 = await lead('Acme', 'priya@acme.test');
  ids.lead2 = await lead('Globex', 'priya@globex.test');
  ids.lead3 = await lead('Initech', 'priya@initech.test');
});

after(async () => {
  console.log = realLog;
  if (app) await app.destroy();
  for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
});

test('pure helpers: step validation, due dates, template rendering', () => {
  const C = require('../src/utils/cadences');
  const { steps, error } = C.normalizeSteps([
    { day: 4, type: 'email', subject: 'Hi {{firstName}}', body: 'About {{company}}' },
    { day: 1, type: 'call', title: 'Intro call' },
  ]);
  assert.equal(error, null);
  assert.deepEqual(steps.map((s) => s.type), ['call', 'email'], 'sorted by day');
  assert.ok(C.normalizeSteps([{ day: 1, type: 'fax' }]).error, 'unknown step type rejected');
  assert.ok(C.normalizeSteps([{ day: 1, type: 'email', subject: '' }]).error, 'email needs a subject');
  assert.ok(C.normalizeSteps([]).error, 'at least one step');
  const start = new Date('2026-12-01T10:00:00Z');
  assert.equal(C.stepDueAt(start, 1).toISOString(), '2026-12-01T10:00:00.000Z', 'day 1 = at enrolment');
  assert.equal(C.stepDueAt(start, 4).toISOString(), '2026-12-04T10:00:00.000Z');
  assert.equal(C.renderTemplate('Hi {{firstName}} at {{ company }}{{unknown}}', { firstName: 'Priya', company: 'Acme' }), 'Hi Priya at Acme');
});

test('pure helpers: booking slots respect availability, notice and busy times', () => {
  const B = require('../src/utils/booking');
  const now = new Date('2026-12-07T08:00:00Z'); // a Monday
  const page = {
    timezone: 'Asia/Kolkata',
    durationMinutes: 30,
    bufferMinutes: 0,
    minNoticeMinutes: 60,
    daysAhead: 2,
    availability: { mon: [['14:00', '15:30']], tue: [['09:00', '10:00']] },
  };
  const busy = [{ start: new Date('2026-12-07T08:30:00Z'), end: new Date('2026-12-07T09:00:00Z') }]; // 14:00-14:30 IST
  const slots = B.computeSlots(page, { now, busy });
  // Mon 14:00 IST = 08:30Z (busy), 14:30 = 09:00Z, 15:00 = 09:30Z; Tue 09:00 IST = 03:30Z, 09:30 = 04:00Z
  assert.deepEqual(slots, ['2026-12-07T09:00:00.000Z', '2026-12-07T09:30:00.000Z', '2026-12-08T03:30:00.000Z', '2026-12-08T04:00:00.000Z']);
  assert.equal(B.computeSlots(page, { now: new Date('2026-12-07T09:10:00Z'), busy: [] })[0], '2026-12-08T03:30:00.000Z', 'min notice drops slots that start too soon');
});

test('create a cadence: call day 1, WhatsApp day 2, email day 4', async () => {
  const res = await asA('POST', '/crm-cadences', {
    name: 'New inbound lead',
    steps: [
      { day: 1, type: 'call', title: 'Intro call with {{company}}' },
      { day: 2, type: 'whatsapp', body: 'Hi {{firstName}}, following up.' },
      { day: 4, type: 'email', subject: 'Quick question, {{firstName}}', body: 'Hi {{firstName}},\n\nShall we talk about {{company}}?' },
    ],
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  ids.cadence = res.body.data.id;
  assert.equal(res.body.data.steps.length, 3);

  const list = await asA('GET', '/crm-cadences');
  assert.equal(list.status, 200);
  assert.ok(list.body.data.some((c) => c.id === ids.cadence));
  assert.ok(list.body.meta.channels.some((c) => c.key === 'whatsapp' && c.available === false), 'WhatsApp is listed as not available yet');

  const other = await asB('GET', `/crm-cadences/${ids.cadence}`);
  assert.equal(other.status, 404, 'other orgs cannot see it');
});

test('enrolling runs day-1 steps at once and schedules the rest', async () => {
  const res = await asA('POST', `/crm-cadences/${ids.cadence}/enroll`, { leadCompanyIds: [ids.lead1] });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.enrolled.length, 1);
  ids.enr1 = res.body.data.enrolled[0].id;

  const tasks = await tasksFor(ids.lead1);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].name, 'Call: Intro call with Acme');

  const again = await asA('POST', `/crm-cadences/${ids.cadence}/enroll`, { leadCompanyIds: [ids.lead1] });
  assert.equal(again.body.data.enrolled.length, 0, 'an active enrolment is not duplicated');
  assert.equal(again.body.data.skipped[0].reason, 'already_enrolled');

  const cross = await asB('POST', `/crm-cadences/${ids.cadence}/enroll`, { leadCompanyIds: [ids.lead1] });
  assert.equal(cross.status, 404, 'other orgs cannot enroll into it');
});

test('due steps run on later days: WhatsApp is reported unavailable, email goes through the mailer', async () => {
  const C = require('../src/utils/cadences');
  const enr = await app.entityService.findOne(C.ENROLLMENT_UID, ids.enr1);
  const t0 = new Date(enr.enrolledAt).getTime();

  await C.processDueEnrollments(app, new Date(t0 + DAY / 2));
  assert.equal((await tasksFor(ids.lead1)).length, 1, 'nothing is due before day 2');

  await C.processDueEnrollments(app, new Date(t0 + DAY + 60000));
  let row = await app.entityService.findOne(C.ENROLLMENT_UID, ids.enr1);
  const wa = row.history.find((h) => h.type === 'whatsapp');
  assert.equal(wa.status, 'unavailable', 'WhatsApp is not faked');
  const tasks = await tasksFor(ids.lead1);
  assert.equal(tasks.length, 2, 'a manual follow-up task is created instead');
  assert.match(tasks[1].name, /^WhatsApp:/);
  assert.equal(row.nextStepIndex, 2);

  await C.processDueEnrollments(app, new Date(t0 + 3 * DAY + 60000));
  row = await app.entityService.findOne(C.ENROLLMENT_UID, ids.enr1);
  const email = row.history.find((h) => h.type === 'email');
  assert.equal(email.status, 'not_sent', 'mailer is not configured in tests, so nothing is delivered');
  assert.equal(email.to, 'priya@acme.test');
  assert.equal(email.subject, 'Quick question, Priya');
  assert.equal(row.status, 'completed');
  const acts = await activitiesFor(ids.lead1);
  assert.ok(acts.some((a) => a.meta?.kind === 'cadence_step' && a.meta?.type === 'email'), 'email step logged on the lead');
});

test('a manual "replied" stops the cadence and no more steps run', async () => {
  const C = require('../src/utils/cadences');
  const res = await asA('POST', `/crm-cadences/${ids.cadence}/enroll`, { leadCompanyIds: [ids.lead2] });
  const enrId = res.body.data.enrolled[0].id;
  const t0 = new Date((await app.entityService.findOne(C.ENROLLMENT_UID, enrId)).enrolledAt).getTime();

  const replied = await asA('POST', `/crm-cadences/leads/${ids.lead2}/replied`, {});
  assert.equal(replied.status, 200, JSON.stringify(replied.body));
  assert.equal(replied.body.data.stopped, 1);

  await C.processDueEnrollments(app, new Date(t0 + 10 * DAY));
  const row = await app.entityService.findOne(C.ENROLLMENT_UID, enrId);
  assert.equal(row.status, 'stopped');
  assert.equal(row.stopReason, 'replied');
  assert.equal((await tasksFor(ids.lead2)).length, 1, 'only the day-1 call task exists');

  const cross = await asB('POST', `/crm-cadences/leads/${ids.lead2}/replied`, {});
  assert.equal(cross.status, 404);
});

test('an inbound activity on the lead stops the cadence before the next step', async () => {
  const C = require('../src/utils/cadences');
  const res = await asA('POST', `/crm-cadences/${ids.cadence}/enroll`, { leadCompanyIds: [ids.lead3] });
  const enrId = res.body.data.enrolled[0].id;
  const t0 = new Date((await app.entityService.findOne(C.ENROLLMENT_UID, enrId)).enrolledAt).getTime();
  await create('api::crm-activity.crm-activity', {
    organization: ids.orgA, action: 'comment', subjectType: 'lead_company', subjectId: ids.lead3, leadCompany: ids.lead3,
    summary: 'Email received from priya@initech.test', meta: { inbound: true, channel: 'email' },
  });
  await C.processDueEnrollments(app, new Date(t0 + 10 * DAY));
  const row = await app.entityService.findOne(C.ENROLLMENT_UID, enrId);
  assert.equal(row.status, 'stopped');
  assert.equal(row.stopReason, 'replied');
  assert.equal((await tasksFor(ids.lead3)).length, 1);

  const list = await asA('GET', `/crm-cadences/enrollments?leadCompanyId=${ids.lead3}`);
  assert.equal(list.status, 200);
  assert.equal(list.body.data[0].status, 'stopped');
});

test('booking page: free slots, booking creates meeting + lead activity, no double-booking', async () => {
  const save = await asA('PUT', '/crm-booking-pages/me', {
    slug: 'rep-a', enabled: true, title: 'Intro call', durationMinutes: 30, timezone: 'UTC', minNoticeMinutes: 0, daysAhead: 7,
    availability: { mon: [['00:00', '23:59']], tue: [['00:00', '23:59']], wed: [['00:00', '23:59']], thu: [['00:00', '23:59']], fri: [['00:00', '23:59']], sat: [['00:00', '23:59']], sun: [['00:00', '23:59']] },
  });
  assert.equal(save.status, 200, JSON.stringify(save.body));
  const taken = await asB('PUT', '/crm-booking-pages/me', { slug: 'rep-a', enabled: true });
  assert.equal(taken.status, 409, 'slugs are unique across orgs');

  const pub = await api('GET', '/booking/rep-a', { ip: '10.0.0.1' });
  assert.equal(pub.status, 200, JSON.stringify(pub.body));
  assert.equal(pub.body.data.title, 'Intro call');
  assert.equal(pub.body.data.hostName, 'RepA');
  assert.equal(pub.body.data.email, undefined, 'no rep email on the public page');
  const [s1, s2] = pub.body.data.slots;
  assert.ok(s1 && s2);

  // An existing meeting on the rep's calendar blocks the slot.
  await create('api::meeting.meeting', { title: 'Busy', startTime: s2, endTime: new Date(new Date(s2).getTime() + 30 * 60000), status: 'scheduled', assignedTo: ids.userA, organization: ids.orgA });
  const pub2 = await api('GET', '/booking/rep-a', { ip: '10.0.0.1' });
  assert.ok(!pub2.body.data.slots.includes(s2), 'busy slot is hidden');
  const blocked = await api('POST', '/booking/rep-a', { ip: '10.0.0.2', body: { start: s2, name: 'Sam Lee', email: 'sam@new.test' } });
  assert.equal(blocked.status, 409, 'cannot book over an existing meeting');

  const book = await api('POST', '/booking/rep-a', { ip: '10.0.0.2', body: { start: s1, name: 'Priya Acme', email: 'priya@acme.test', company: 'Acme', notes: 'Pricing' } });
  assert.equal(book.status, 201, JSON.stringify(book.body));
  const meeting = await app.entityService.findOne('api::meeting.meeting', book.body.data.meetingId, { populate: ['leadCompany', 'assignedTo', 'organization'] });
  assert.equal(meeting.leadCompany.id, ids.lead1, 'matched the existing lead by email');
  assert.equal(meeting.assignedTo.id, ids.userA);
  assert.equal(meeting.organization.id, ids.orgA);
  const acts = await activitiesFor(ids.lead1);
  assert.ok(acts.some((a) => a.meta?.kind === 'meeting_booked'), 'booking logged on the lead');

  const dup = await api('POST', '/booking/rep-a', { ip: '10.0.0.3', body: { start: s1, name: 'Other', email: 'o@x.test' } });
  assert.equal(dup.status, 409, 'same slot cannot be booked twice');

  const bad = await api('POST', '/booking/rep-a', { ip: '10.0.0.3', body: { start: '2020-01-01T00:00:00Z', name: 'Old', email: 'o@x.test' } });
  assert.equal(bad.status, 409, 'slots outside availability are refused');
});

test('public booking is rate limited per IP', async () => {
  let last;
  for (let i = 0; i < 7; i += 1) last = await api('GET', '/booking/rep-a', { ip: '10.9.9.9' });
  assert.equal(last.status, 429);
  const missing = await api('GET', '/booking/nobody-here', { ip: '10.8.8.8' });
  assert.equal(missing.status, 404);
});
