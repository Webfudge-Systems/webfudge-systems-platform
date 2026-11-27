'use strict';

/**
 * G14 cadences + booking pages (SaaS only; 404 on Internal).
 * Team routes (/api/crm-cadences, /api/crm-booking-pages) need CRM access: Leads read to view,
 * Leads write to build cadences / enrol / mark replied, Meetings write to edit your booking page.
 * Public routes (/api/booking/:slug) need no login, are rate limited per IP, and only work while
 * the rep's org has full CRM access.
 */

const { isSaas } = require('../../../utils/platform');
const { requireModuleAccess } = require('../../../utils/rbac');
const { getOrgAccess } = require('../../../utils/saas-access');
const { hit } = require('../../../utils/lead-capture/rate-limit');
const { listChannels } = require('../../../utils/status-reports/channels');
const { ingestLead } = require('../../../utils/lead-ingest');
const { sendMail, layout, escapeHtml } = require('../../../utils/mailer');
const C = require('../../../utils/cadences');
const B = require('../../../utils/booking');

const PAGE_UID = 'api::crm-cadence.crm-booking-page';
const MEETING_UID = 'api::meeting.meeting';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';
const LEAD_UID = 'api::lead-company.lead-company';
const MEETING_TYPES = ['discovery', 'demo', 'follow_up', 'check_in', 'review', 'internal', 'other'];
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const body = (ctx) => ctx.request?.body?.data || ctx.request?.body || {};
const intId = (v) => {
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
};
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const personName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '' : '');

function guard(ctx, moduleKey, level) {
  if (!isSaas()) {
    ctx.notFound();
    return false;
  }
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  return !requireModuleAccess(ctx, 'crm', moduleKey, level);
}

function serializeCadence(c, counts = {}) {
  return {
    id: c.id,
    name: c.name,
    description: c.description || '',
    status: c.status,
    steps: Array.isArray(c.steps) ? c.steps : [],
    activeCount: counts[c.id]?.active || 0,
    totalCount: counts[c.id]?.total || 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function serializeEnrollment(e) {
  return {
    id: e.id,
    status: e.status,
    stopReason: e.stopReason || null,
    enrolledAt: e.enrolledAt,
    nextRunAt: e.nextRunAt,
    nextStepIndex: e.nextStepIndex || 0,
    history: Array.isArray(e.history) ? e.history : [],
    cadence: e.cadence ? { id: e.cadence.id, name: e.cadence.name, stepCount: (e.cadence.steps || []).length } : null,
    leadCompany: e.leadCompany ? { id: e.leadCompany.id, companyName: e.leadCompany.companyName } : null,
    owner: e.owner ? { id: e.owner.id, name: personName(e.owner) } : null,
  };
}

async function loadCadence(ctx, id) {
  const [row] = await strapi.entityService.findMany(C.CADENCE_UID, { filters: { id, organization: { id: ctx.state.orgId } }, limit: 1 });
  return row || null;
}

function readCadenceInput(ctx, input, { partial = false } = {}) {
  const data = {};
  if (!partial || input.name !== undefined) {
    data.name = str(input.name, 120);
    if (!data.name) return { error: 'Give the cadence a name.' };
  }
  if (input.description !== undefined) data.description = str(input.description, 2000);
  if (input.status !== undefined) {
    if (!['active', 'paused', 'archived'].includes(input.status)) return { error: 'Unknown status.' };
    data.status = input.status;
  }
  if (!partial || input.steps !== undefined) {
    const { steps, error } = C.normalizeSteps(input.steps);
    if (error) return { error };
    data.steps = steps;
  }
  return { data };
}

// ── booking helpers ────────────────────────────────────────────────────────────

function clientIp(ctx) {
  const fwd = String(ctx.request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (fwd || ctx.request.ip || '').slice(0, 64);
}

function send(ctx, status, payload, retryAfter) {
  ctx.set('Cache-Control', 'no-store');
  if (retryAfter) ctx.set('Retry-After', String(retryAfter));
  ctx.status = status;
  ctx.body = payload;
}

function rateLimited(ctx) {
  const limit = Number(process.env.BOOKING_IP_LIMIT_PER_MIN) || 30;
  const r = hit(`booking:ip:${clientIp(ctx) || 'unknown'}`, limit, 60000);
  if (r.allowed) return false;
  send(ctx, 429, { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again in a minute.' } }, r.retryAfterSec);
  return true;
}

/** Enabled page whose org still has full CRM access, with its rep. */
async function loadPublicPage(slug) {
  if (!SLUG_RE.test(String(slug || ''))) return null;
  const [page] = await strapi.entityService.findMany(PAGE_UID, {
    filters: { slug: String(slug), enabled: true },
    populate: { user: { fields: ['id', 'username', 'firstName', 'lastName', 'email', 'blocked'] }, organization: { fields: ['id', 'name'] } },
    limit: 1,
  });
  if (!page?.user || page.user.blocked || !page.organization) return null;
  const access = await getOrgAccess(strapi, page.organization.id);
  if ((access?.crm?.access || 'none') !== 'full') return null;
  return page;
}

async function busyFor(page, now) {
  const horizon = new Date(now.getTime() + (B.clampInt(page.daysAhead, 1, 60, 14) + 1) * 24 * 3600 * 1000);
  const rows = await strapi.entityService.findMany(MEETING_UID, {
    filters: {
      organization: { id: page.organization.id },
      status: { $notIn: ['cancelled', 'no_show'] },
      startTime: { $lt: horizon.toISOString() },
      endTime: { $gt: now.toISOString() },
      $or: [{ assignedTo: { id: page.user.id } }, { organizer: { id: page.user.id } }],
    },
    fields: ['startTime', 'endTime'],
    limit: 1000,
  });
  return rows.filter((m) => m.startTime && m.endTime).map((m) => ({ start: m.startTime, end: m.endTime }));
}

// One booking at a time per rep on this instance; the slot is re-checked inside the lock.
const repLocks = new Map();
async function withRepLock(userId, fn) {
  const prev = repLocks.get(userId) || Promise.resolve();
  let release;
  const mine = new Promise((r) => (release = r));
  repLocks.set(userId, prev.then(() => mine));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (repLocks.get(userId) === mine) repLocks.delete(userId);
  }
}

module.exports = {
  // ── cadences ────────────────────────────────────────────────────────────────
  async list(ctx) {
    if (!guard(ctx, 'leads', 'read')) return;
    const rows = await strapi.entityService.findMany(C.CADENCE_UID, {
      filters: { organization: { id: ctx.state.orgId }, ...(ctx.query.includeArchived === 'true' ? {} : { status: { $ne: 'archived' } }) },
      sort: [{ updatedAt: 'desc' }],
      limit: 200,
    });
    const enr = rows.length
      ? await strapi.entityService.findMany(C.ENROLLMENT_UID, { filters: { cadence: { id: { $in: rows.map((r) => r.id) } } }, fields: ['status'], populate: { cadence: { fields: ['id'] } }, limit: 10000 })
      : [];
    const counts = {};
    for (const e of enr) {
      const id = e.cadence?.id;
      if (!id) continue;
      counts[id] = counts[id] || { active: 0, total: 0 };
      counts[id].total += 1;
      if (e.status === 'active') counts[id].active += 1;
    }
    ctx.body = { data: rows.map((r) => serializeCadence(r, counts)), meta: { channels: listChannels(), stepTypes: C.STEP_TYPES } };
  },

  async create(ctx) {
    if (!guard(ctx, 'leads', 'write')) return;
    const { data, error } = readCadenceInput(ctx, body(ctx));
    if (error) return ctx.badRequest(error);
    const row = await strapi.entityService.create(C.CADENCE_UID, { data: { ...data, status: data.status || 'active', organization: ctx.state.orgId, createdByUser: ctx.state.user.id } });
    ctx.status = 201;
    ctx.body = { data: serializeCadence(row) };
  },

  async findOne(ctx) {
    if (!guard(ctx, 'leads', 'read')) return;
    const row = await loadCadence(ctx, intId(ctx.params.id));
    if (!row) return ctx.notFound('Cadence not found');
    ctx.body = { data: serializeCadence(row), meta: { channels: listChannels(), stepTypes: C.STEP_TYPES } };
  },

  async update(ctx) {
    if (!guard(ctx, 'leads', 'write')) return;
    const row = await loadCadence(ctx, intId(ctx.params.id));
    if (!row) return ctx.notFound('Cadence not found');
    const { data, error } = readCadenceInput(ctx, body(ctx), { partial: true });
    if (error) return ctx.badRequest(error);
    const updated = await strapi.entityService.update(C.CADENCE_UID, row.id, { data });
    ctx.body = { data: serializeCadence(updated) };
  },

  /** Archive (keeps history); active enrolments stop at their next run. */
  async archive(ctx) {
    if (!guard(ctx, 'leads', 'write')) return;
    const row = await loadCadence(ctx, intId(ctx.params.id));
    if (!row) return ctx.notFound('Cadence not found');
    await strapi.entityService.update(C.CADENCE_UID, row.id, { data: { status: 'archived' } });
    const active = await strapi.entityService.findMany(C.ENROLLMENT_UID, { filters: { status: 'active', cadence: { id: row.id } }, fields: ['id'], limit: 5000 });
    for (const e of active) await C.stopEnrollment(strapi, e.id, 'cadence_archived');
    ctx.body = { data: { id: row.id, status: 'archived', stopped: active.length } };
  },

  async enroll(ctx) {
    if (!guard(ctx, 'leads', 'write')) return;
    const cadence = await loadCadence(ctx, intId(ctx.params.id));
    if (!cadence) return ctx.notFound('Cadence not found');
    if (cadence.status !== 'active') return ctx.badRequest('Only active cadences can take new leads.');
    const leadIds = [...new Set((Array.isArray(body(ctx).leadCompanyIds) ? body(ctx).leadCompanyIds : []).map(intId).filter(Boolean))].slice(0, 200);
    if (!leadIds.length) return ctx.badRequest('Pick at least one lead.');
    const out = await C.enrollLeads(strapi, { orgId: ctx.state.orgId, cadence, leadIds, actorUserId: ctx.state.user.id });
    ctx.body = { data: out };
  },

  async listEnrollments(ctx) {
    if (!guard(ctx, 'leads', 'read')) return;
    const filters = { organization: { id: ctx.state.orgId } };
    const leadId = intId(ctx.query.leadCompanyId);
    const cadenceId = intId(ctx.query.cadenceId);
    if (leadId) filters.leadCompany = { id: leadId };
    if (cadenceId) filters.cadence = { id: cadenceId };
    if (['active', 'completed', 'stopped'].includes(ctx.query.status)) filters.status = ctx.query.status;
    const rows = await strapi.entityService.findMany(C.ENROLLMENT_UID, {
      filters,
      populate: { cadence: { fields: ['id', 'name', 'steps'] }, leadCompany: { fields: ['id', 'companyName'] }, owner: { fields: ['id', 'username', 'firstName', 'lastName'] } },
      sort: [{ id: 'desc' }],
      limit: 200,
    });
    ctx.body = { data: rows.map(serializeEnrollment) };
  },

  async stopEnrollment(ctx) {
    if (!guard(ctx, 'leads', 'write')) return;
    const [row] = await strapi.entityService.findMany(C.ENROLLMENT_UID, { filters: { id: intId(ctx.params.id), organization: { id: ctx.state.orgId } }, limit: 1 });
    if (!row) return ctx.notFound('Enrolment not found');
    if (row.status !== 'active') return ctx.badRequest('This enrolment is not running.');
    await C.stopEnrollment(strapi, row.id, 'stopped_by_user');
    ctx.body = { data: { id: row.id, status: 'stopped' } };
  },

  async replied(ctx) {
    if (!guard(ctx, 'leads', 'write')) return;
    const leadId = intId(ctx.params.leadId);
    const [lead] = await strapi.entityService.findMany(LEAD_UID, { filters: { id: leadId, organization: { id: ctx.state.orgId } }, fields: ['id'], limit: 1 });
    if (!lead) return ctx.notFound('Lead not found');
    const out = await C.markReplied(strapi, { orgId: ctx.state.orgId, leadCompanyId: lead.id, actorUserId: ctx.state.user.id, note: str(body(ctx).note, 300) });
    ctx.body = { data: out };
  },

  // ── booking page settings (the signed-in rep's own page) ───────────────────
  async getMyPage(ctx) {
    if (!guard(ctx, 'meetings', 'read')) return;
    const [page] = await strapi.entityService.findMany(PAGE_UID, { filters: { user: { id: ctx.state.user.id }, organization: { id: ctx.state.orgId } }, limit: 1 });
    ctx.body = { data: page || null, meta: { suggestedSlug: str(ctx.state.user.username, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || null } };
  },

  async saveMyPage(ctx) {
    if (!guard(ctx, 'meetings', 'write')) return;
    const input = body(ctx);
    const slug = str(input.slug, 50).toLowerCase();
    if (!SLUG_RE.test(slug)) return ctx.badRequest('The link name needs 3–50 lowercase letters, numbers or dashes.');
    if (input.timezone && !B.validTimezone(input.timezone)) return ctx.badRequest('Unknown timezone.');
    const [mine] = await strapi.entityService.findMany(PAGE_UID, { filters: { user: { id: ctx.state.user.id }, organization: { id: ctx.state.orgId } }, limit: 1 });
    const [taken] = await strapi.entityService.findMany(PAGE_UID, { filters: { slug }, fields: ['id'], limit: 1 });
    if (taken && taken.id !== mine?.id) return send(ctx, 409, { error: { code: 'SLUG_TAKEN', message: 'That link name is taken.' } });
    const data = {
      slug,
      enabled: Boolean(input.enabled),
      title: str(input.title, 120) || 'Meeting',
      description: str(input.description, 1000),
      durationMinutes: B.clampInt(input.durationMinutes, 5, 480, mine?.durationMinutes || 30),
      bufferMinutes: B.clampInt(input.bufferMinutes, 0, 240, mine?.bufferMinutes || 0),
      minNoticeMinutes: B.clampInt(input.minNoticeMinutes, 0, 60 * 24 * 30, mine?.minNoticeMinutes ?? 240),
      daysAhead: B.clampInt(input.daysAhead, 1, 60, mine?.daysAhead || 14),
      timezone: input.timezone || mine?.timezone || 'Asia/Kolkata',
      availability: B.normalizeAvailability(input.availability ?? mine?.availability ?? { mon: [['10:00', '17:00']], tue: [['10:00', '17:00']], wed: [['10:00', '17:00']], thu: [['10:00', '17:00']], fri: [['10:00', '17:00']] }),
      meetingType: MEETING_TYPES.includes(input.meetingType) ? input.meetingType : mine?.meetingType || 'discovery',
      location: str(input.location, 300),
    };
    const page = mine
      ? await strapi.entityService.update(PAGE_UID, mine.id, { data })
      : await strapi.entityService.create(PAGE_UID, { data: { ...data, user: ctx.state.user.id, organization: ctx.state.orgId } });
    ctx.body = { data: page };
  },

  // ── public booking ─────────────────────────────────────────────────────────
  async publicPage(ctx) {
    if (!isSaas()) return ctx.notFound();
    if (rateLimited(ctx)) return;
    const page = await loadPublicPage(ctx.params.slug);
    if (!page) return send(ctx, 404, { error: { code: 'NOT_FOUND', message: 'This booking page does not exist or is turned off.' } });
    const now = new Date();
    const slots = B.computeSlots(page, { now, busy: await busyFor(page, now) });
    send(ctx, 200, {
      data: {
        title: page.title || 'Meeting',
        description: page.description || '',
        hostName: personName(page.user),
        organizationName: page.organization.name,
        durationMinutes: page.durationMinutes,
        timezone: page.timezone,
        location: page.location || '',
        slots,
      },
    });
  },

  async publicBook(ctx) {
    if (!isSaas()) return ctx.notFound();
    if (rateLimited(ctx)) return;
    const page = await loadPublicPage(ctx.params.slug);
    if (!page) return send(ctx, 404, { error: { code: 'NOT_FOUND', message: 'This booking page does not exist or is turned off.' } });
    const input = body(ctx);
    if (input.website) return send(ctx, 400, { error: { code: 'INVALID', message: 'Could not book.' } }); // honeypot
    const name = str(input.name, 120);
    const email = str(input.email, 200).toLowerCase();
    if (!name) return send(ctx, 400, { error: { code: 'INVALID', message: 'Please enter your name.' } });
    if (!EMAIL_RE.test(email)) return send(ctx, 400, { error: { code: 'INVALID', message: 'Please enter a valid email address.' } });
    const startDate = new Date(input.start);
    if (Number.isNaN(startDate.getTime())) return send(ctx, 400, { error: { code: 'INVALID', message: 'Pick a time.' } });
    const start = startDate.toISOString();
    const end = new Date(startDate.getTime() + B.clampInt(page.durationMinutes, 5, 480, 30) * 60000).toISOString();
    const orgId = page.organization.id;

    const result = await withRepLock(page.user.id, async () => {
      const now = new Date();
      const slots = B.computeSlots(page, { now, busy: await busyFor(page, now) });
      if (!slots.includes(start)) return { conflict: true };

      const ingest = await ingestLead(strapi, {
        orgId,
        source: 'BOOKING_PAGE',
        sourceLabel: 'Booking page',
        sourceDetails: { bookingPage: page.slug },
        lead: { fullName: name, email, phone: str(input.phone, 40), companyName: str(input.company, 160), message: str(input.notes, 1000) },
      });
      const meeting = await strapi.entityService.create(MEETING_UID, {
        data: {
          title: `${page.title || 'Meeting'} with ${name}`.slice(0, 250),
          startTime: start,
          endTime: end,
          meetingType: MEETING_TYPES.includes(page.meetingType) ? page.meetingType : 'discovery',
          status: 'scheduled',
          location: page.location || null,
          isVirtual: !page.location || /^https?:/i.test(page.location),
          agenda: str(input.notes, 2000) || null,
          visibility: 'team',
          attendeesMeta: [{ name, email, source: 'booking_page' }],
          organizer: page.user.id,
          assignedTo: page.user.id,
          leadCompany: ingest.leadCompanyId || null,
          contact: ingest.contactId || null,
          organization: orgId,
        },
      });
      return { meeting, ingest };
    });

    if (result.conflict) return send(ctx, 409, { error: { code: 'SLOT_TAKEN', message: 'That time is no longer available. Please pick another.' } });
    const { meeting, ingest } = result;
    const leadId = ingest.leadCompanyId;
    if (leadId) {
      try {
        await strapi.entityService.create(ACTIVITY_UID, {
          data: {
            organization: orgId, actor: null, action: 'create', subjectType: 'meeting', subjectId: meeting.id, leadCompany: leadId,
            summary: `${name} booked "${page.title || 'Meeting'}" with ${personName(page.user)} for ${start.replace('T', ' ').slice(0, 16)} UTC`,
            meta: { kind: 'meeting_booked', inbound: true, meetingId: meeting.id, bookingPage: page.slug },
          },
        });
        await strapi.entityService.update(LEAD_UID, leadId, { data: { nextConnectDate: start.slice(0, 10) } });
      } catch (e) {
        strapi.log.warn(`[booking] lead update failed: ${e?.message || e}`);
      }
    }
    if (page.user.email) {
      const when = `${start.replace('T', ' ').slice(0, 16)} UTC`;
      await sendMail({
        to: page.user.email,
        subject: `New booking: ${name}, ${when}`,
        text: `${name} (${email}) booked "${page.title || 'Meeting'}" for ${when}.`,
        html: layout({ heading: 'New booking', bodyHtml: `<p>${escapeHtml(name)} (${escapeHtml(email)}) booked “${escapeHtml(page.title || 'Meeting')}” for ${escapeHtml(when)}.</p>` }),
      }).catch(() => {});
    }
    send(ctx, 201, { data: { meetingId: meeting.id, start, end, hostName: personName(page.user) } });
  },
};
