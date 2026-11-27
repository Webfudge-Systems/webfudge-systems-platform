'use strict';

/**
 * Fudge Grow AI auto-capture (ticket G10), on the P5 AI foundation.
 *
 * After a conversation (comment, call / meeting notes, email) on a lead or deal, Fudge AI proposes
 * budget, timeline, requirement, next step and stage. Suggestions live on the record (`aiCapture`
 * JSON) until a rep accepts (optionally edited) or dismisses each one. With the org setting
 * `ai_auto_capture.autoApply` they are applied right away. Every apply runs as the agent action
 * `grow.capture.apply`: permission-checked, logged in the activity feed and undoable in one click.
 * The next step becomes a CRM task.
 *
 * Triggers: db lifecycle hooks on new comments and meeting notes, debounced per record (no polling).
 * Sources: utils/ai/capture-sources.js (WhatsApp / voice notes listed as not available yet).
 */

const { renderTemplate, generateObject, normalizeLanguage, AiError } = require('@webfudge/ai');
const { collectConversations } = require('./capture-sources');

const LEAD_UID = 'api::lead-company.lead-company';
const DEAL_UID = 'api::deal.deal';
const TASK_UID = 'api::task.task';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';
const MEETING_UID = 'api::meeting.meeting';
const SETTING_KEY = 'ai_auto_capture';
const ACTION_KEY = 'grow.capture.apply';
const FEATURE = 'grow.auto_capture';
const FIELDS = ['budget', 'timeline', 'requirement', 'nextStep', 'stage'];
const DEAL_STAGES = ['discovery', 'prospect', 'proposal', 'negotiation']; // won / lost need a close reason: left to the rep
const UID_OF = { lead_company: LEAD_UID, deal: DEAL_UID };

const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);
const todayIso = () => new Date().toISOString().slice(0, 10);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const notFound = () => new AiError('Record not found.', { code: 'AI_SUBJECT_NOT_FOUND', status: 404 });
const badRequest = (m) => new AiError(m, { code: 'AI_BAD_REQUEST', status: 400 });

function validDate(v, today) {
  const d = typeof v === 'string' ? v.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) return null;
  return d >= today ? d : null;
}

// ---------- pure helpers ----------

/** Model output → only the stated, valid facts that differ from the record. */
function normalizeCapture(o = {}, { today = todayIso(), stages = [], current = {} } = {}) {
  const f = {};
  const ev = (x) => str(x?.evidence, 300) || null;
  const amount = Number(o.budget?.amount);
  if (Number.isFinite(amount) && amount > 0 && amount !== Number(current.budget)) {
    f.budget = { amount: Math.round(amount * 100) / 100, currency: str(o.budget.currency, 3).toUpperCase() || 'INR', evidence: ev(o.budget) };
  }
  const tText = str(o.timeline?.text, 120);
  const tDate = validDate(o.timeline?.date, today);
  if ((tText || tDate) && tText !== current.timeline) f.timeline = { text: tText || tDate, date: tDate, evidence: ev(o.timeline) };
  const req = str(o.requirement?.text, 600);
  if (req && req !== current.requirement) f.requirement = { text: req, evidence: ev(o.requirement) };
  const title = str(o.nextStep?.title, 160);
  if (title) f.nextStep = { title, dueDate: validDate(o.nextStep?.dueDate, today), evidence: ev(o.nextStep) };
  const stage = str(o.stage?.value, 60);
  if (stage && stages.includes(stage) && stage !== current.stage) f.stage = { value: stage, evidence: ev(o.stage) };
  return f;
}

/** Accepted values → the record's own fields. The next step is a task, not a field. */
function buildPatch(subjectType, v = {}) {
  const p = {};
  const lead = subjectType === 'lead_company';
  if (v.budget?.amount != null) p[lead ? 'dealValue' : 'value'] = v.budget.amount;
  if (lead && v.timeline?.text) p.expectedTimeline = v.timeline.text;
  if (!lead && v.timeline?.date) p.expectedCloseDate = v.timeline.date;
  if (v.requirement?.text) p.requirementSummary = v.requirement.text;
  if (v.stage?.value) p[lead ? 'status' : 'stage'] = v.stage.value;
  return p;
}

/** Runs fn once per key, delay ms after the last schedule() for that key. */
function createDebouncer() {
  const timers = new Map();
  return {
    schedule(key, fn, delay) {
      clearTimeout(timers.get(key));
      const t = setTimeout(() => {
        timers.delete(key);
        Promise.resolve()
          .then(fn)
          .catch(() => {});
      }, delay);
      if (t.unref) t.unref();
      timers.set(key, t);
    },
    pending: () => timers.size,
  };
}

// ---------- records / settings ----------

async function loadSubject(strapi, orgId, subjectType, subjectId) {
  const uid = UID_OF[subjectType];
  const id = Number(subjectId);
  if (!uid || !Number.isInteger(id) || id <= 0) return null;
  const row = await strapi.entityService.findOne(uid, id, {
    populate: { organization: { fields: ['id'] }, assignedTo: { fields: ['id'] }, ...(subjectType === 'deal' ? { leadCompany: { fields: ['id'] } } : {}) },
  });
  if (!row || String(relId(row.organization)) !== String(orgId)) return null;
  return row;
}

function currentOf(subjectType, row) {
  return subjectType === 'lead_company'
    ? { name: row.companyName, stage: row.status, budget: row.dealValue, timeline: row.expectedTimeline, requirement: row.requirementSummary }
    : { name: row.name, stage: row.stage, budget: row.value, timeline: row.expectedCloseDate, requirement: row.requirementSummary };
}

async function stagesFor(strapi, orgId, subjectType) {
  if (subjectType === 'deal') return DEAL_STAGES;
  const { leadStatusKeys } = require('../crm-pipeline');
  return (await leadStatusKeys(strapi, orgId)).filter((k) => !['CONVERTED', 'LOST'].includes(String(k).toUpperCase()));
}

async function getSettings(strapi, orgId) {
  const { getSetting } = require('../crm-org-settings');
  const v = (await getSetting(strapi, orgId, SETTING_KEY)) || {};
  return { autoRun: v.autoRun !== false, autoApply: v.autoApply === true };
}

async function saveSettings(strapi, orgId, patch = {}) {
  const { setSetting } = require('../crm-org-settings');
  const next = { ...(await getSettings(strapi, orgId)) };
  if (typeof patch.autoRun === 'boolean') next.autoRun = patch.autoRun;
  if (typeof patch.autoApply === 'boolean') next.autoApply = patch.autoApply;
  await setSetting(strapi, orgId, SETTING_KEY, next);
  return next;
}

/** Writes the suggestions JSON only (db query: no lifecycles / activity rows for bookkeeping). */
async function saveCapture(strapi, subjectType, id, capture) {
  await strapi.db.query(UID_OF[subjectType]).update({ where: { id }, data: { aiCapture: capture } });
  return capture;
}

function markFields(capture, keys, status, actionId) {
  if (!capture?.fields) return capture;
  const fields = { ...capture.fields };
  for (const k of keys) if (fields[k]) fields[k] = { ...fields[k], status, actionId: actionId ?? fields[k].actionId ?? null };
  return { ...capture, fields };
}

// ---------- flows ----------

/** Reads the conversations, asks the model, stores suggestions and auto-applies per org setting. */
async function runCapture(strapi, { orgId, userId = null, subjectType, subjectId, language, trigger = 'manual' }) {
  const row = await loadSubject(strapi, orgId, subjectType, subjectId);
  if (!row) throw notFound();
  const leadId = subjectType === 'deal' ? relId(row.leadCompany) : row.id;
  const { conversations, counts } = await collectConversations(strapi, { orgId, subjectType, subjectId: row.id, leadId });
  if (!conversations.length) return { capture: row.aiCapture || null, empty: true };

  const ai = require('./index');
  const lang = normalizeLanguage(language);
  const today = todayIso();
  const current = currentOf(subjectType, row);
  const stages = await stagesFor(strapi, orgId, subjectType);
  const t = renderTemplate(FEATURE, { today, subject: { type: subjectType, current }, stages, conversations }, { language: lang });
  const out = await generateObject(ai.clientFor(strapi, null, { orgId, userId }), { ...t, feature: FEATURE, metadata: { subjectType, subjectId: row.id } });
  const found = normalizeCapture(out.object, { today, stages, current });

  const fields = {};
  for (const k of FIELDS) if (found[k]) fields[k] = { ...found[k], status: 'pending', actionId: null };
  let capture = { generatedAt: new Date().toISOString(), language: lang, trigger, model: out.model, sources: counts, fields };
  await saveCapture(strapi, subjectType, row.id, capture);

  const settings = await getSettings(strapi, orgId);
  if (settings.autoApply && Object.keys(fields).length) {
    const actor = { id: userId, orgId, system: true, autoCapture: true, ctx: { state: { orgId } } };
    const res = await applyCapture(strapi, { orgId, actor, subjectType, subjectId: row.id, fields: Object.fromEntries(Object.keys(fields).map((k) => [k, {}])) });
    capture = res.capture;
  }
  return { capture, empty: false };
}

/**
 * Applies the chosen fields. `fields` is { key: overrides } — an empty object accepts the suggestion
 * as is, otherwise the rep's edits win (e.g. { budget: { amount: 600000 } }).
 */
async function applyCapture(strapi, { orgId, actor, subjectType, subjectId, fields = {} }) {
  const row = await loadSubject(strapi, orgId, subjectType, subjectId);
  if (!row) throw notFound();
  const capture = row.aiCapture || { fields: {} };
  const keys = Object.keys(fields).filter((k) => FIELDS.includes(k));
  if (!keys.length) throw badRequest('Pick at least one suggestion to apply.');
  const values = {};
  for (const k of keys) {
    const merged = { ...(capture.fields?.[k] || {}), ...(fields[k] || {}) };
    delete merged.status;
    delete merged.actionId;
    values[k] = merged;
  }
  const stages = values.stage ? await stagesFor(strapi, orgId, subjectType) : [];
  const valid = normalizeCapture(values, { stages, current: {} });
  if (!Object.keys(valid).length) throw badRequest('Nothing valid to apply.');

  const record = await require('./actions').getActionRunner(strapi).propose({
    key: ACTION_KEY,
    actor,
    orgId,
    input: { subjectType, subjectId: row.id, values: valid, auto: Boolean(actor.autoCapture) },
    feature: FEATURE,
    subject: { type: subjectType, id: row.id },
  });
  if (record.status === 'failed') throw badRequest(record.error?.message || record.error || 'Could not apply.');
  const fresh = await loadSubject(strapi, orgId, subjectType, row.id);
  return { actionId: record.id, undoable: record.undoable, applied: Object.keys(valid), taskId: record.result?.taskId ?? null, capture: fresh?.aiCapture || null };
}

async function dismissCapture(strapi, { orgId, subjectType, subjectId, field }) {
  const row = await loadSubject(strapi, orgId, subjectType, subjectId);
  if (!row) throw notFound();
  if (!FIELDS.includes(field) || !row.aiCapture?.fields?.[field]) throw badRequest('Unknown suggestion.');
  return saveCapture(strapi, subjectType, row.id, markFields(row.aiCapture, [field], 'dismissed'));
}

// ---------- agent action ----------

async function canEdit(strapi, actor, subjectType, subjectId) {
  if (actor.autoCapture === true) return true; // org admin turned on auto-apply (server-side actor only)
  const { canAccess } = require('../rbac');
  if (canAccess(actor.ctx, 'crm', subjectType === 'deal' ? 'deals' : 'leads', 'write')) return true;
  const row = await loadSubject(strapi, actor.orgId, subjectType, subjectId);
  return Boolean(row && actor.id && String(relId(row.assignedTo)) === String(actor.id));
}

const toDateTime = (d) => `${d}T12:00:00.000Z`;

function registerCaptureActions(r, strapi) {
  r.define({
    key: ACTION_KEY,
    label: 'apply AI-captured deal details',
    permission: (actor, input) => canEdit(strapi, actor, input.subjectType, input.subjectId),
    describe: (input) => `Apply ${Object.keys(input.values || {}).join(', ')} to ${input.subjectType} #${input.subjectId}`,
    async execute(input, { orgId, actor, record }) {
      const { subjectType, values } = input;
      const row = await loadSubject(strapi, orgId, subjectType, input.subjectId);
      if (!row) throw new Error('Record not found.');
      const patch = buildPatch(subjectType, values);
      const previous = Object.fromEntries(Object.keys(patch).map((k) => [k, row[k] ?? null]));
      let taskId = null;
      if (values.nextStep?.title) {
        const due = values.nextStep.dueDate || new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
        const task = await strapi.entityService.create(TASK_UID, {
          data: {
            name: values.nextStep.title,
            description: values.nextStep.evidence ? `From the conversation: "${values.nextStep.evidence}"` : 'Suggested by Fudge AI from the conversation.',
            status: 'SCHEDULED',
            priority: 'medium',
            scheduledDate: toDateTime(due),
            organization: orgId,
            assignee: relId(row.assignedTo) || actor?.id || null,
            assigner: actor?.id || null,
            leadCompany: subjectType === 'deal' ? relId(row.leadCompany) : row.id,
            deal: subjectType === 'deal' ? row.id : null,
            tags: ['ai-capture'],
          },
        });
        taskId = task.id;
      }
      const keys = Object.keys(values);
      const capture = markFields(row.aiCapture, keys, 'applied', record?.id);
      await strapi.entityService.update(UID_OF[subjectType], row.id, { data: { ...patch, ...(capture ? { aiCapture: capture } : {}) } });
      const name = subjectType === 'deal' ? row.name : row.companyName;
      return {
        result: { applied: keys, taskId },
        undoData: { subjectType, subjectId: row.id, previous, taskId, keys },
        subject: { type: subjectType, id: row.id },
        summary: `${input.auto ? 'Auto-applied' : 'Applied'} AI-captured ${keys.join(', ')} to "${name || `#${row.id}`}"`,
      };
    },
    async undo({ subjectType, subjectId, previous, taskId, keys }, { orgId }) {
      const row = await loadSubject(strapi, orgId, subjectType, subjectId);
      if (!row) throw new Error('Record not found.');
      if (taskId) {
        const task = await strapi.entityService.findOne(TASK_UID, taskId, { populate: { organization: { fields: ['id'] } } });
        if (task && String(relId(task.organization)) === String(orgId)) await strapi.entityService.delete(TASK_UID, taskId);
      }
      const capture = markFields(row.aiCapture, keys || [], 'pending', null);
      await strapi.entityService.update(UID_OF[subjectType], row.id, { data: { ...previous, ...(capture ? { aiCapture: capture } : {}) } });
    },
  });
}

// ---------- lifecycle trigger ----------

const debouncer = createDebouncer();
const delayMs = () => Number(process.env.AI_CAPTURE_DEBOUNCE_MS) || 90000;

/** Debounced background capture; failures (AI off, no credits, no key) are logged, never thrown. */
function scheduleCapture(strapi, { orgId, userId, subjectType, subjectId }) {
  if (!orgId || !subjectId || !UID_OF[subjectType]) return;
  debouncer.schedule(`${orgId}:${subjectType}:${subjectId}`, async () => {
    try {
      const ai = require('./index');
      if (!ai.aiEnabled()) return;
      if (!(await getSettings(strapi, orgId)).autoRun) return;
      await runCapture(strapi, { orgId, userId, subjectType, subjectId, trigger: 'conversation' });
    } catch (err) {
      strapi.log.warn(`[ai-capture] ${subjectType} #${subjectId}: ${err.code || ''} ${err.message}`);
    }
  }, delayMs());
}

const NOTE_KEYS = ['notes', 'aiSummary'];

/** Subscribes to new comments and meeting notes. Call once from bootstrap (SaaS only). */
function registerCaptureHooks(strapi) {
  const { isSaas } = require('../platform');
  if (!isSaas()) return;
  strapi.db.lifecycles.subscribe({
    models: [ACTIVITY_UID],
    async afterCreate({ result, params }) {
      const d = params?.data || {};
      if ((result?.action ?? d.action) !== 'comment') return;
      const subjectType = result?.subjectType ?? d.subjectType;
      if (subjectType !== 'lead_company' && subjectType !== 'deal') return;
      try {
        // Relations in params may be in connect/set form: read them back from the row.
        const row = await strapi.entityService.findOne(ACTIVITY_UID, result.id, { fields: ['id', 'subjectId'], populate: { organization: { fields: ['id'] }, actor: { fields: ['id'] } } });
        scheduleCapture(strapi, { orgId: relId(row?.organization), userId: relId(row?.actor), subjectType, subjectId: Number(row?.subjectId ?? d.subjectId) });
      } catch (err) {
        strapi.log.warn(`[ai-capture] comment hook: ${err.message}`);
      }
    },
  });
  const onMeeting = async ({ result, params }) => {
    const d = params?.data || {};
    if (!NOTE_KEYS.some((k) => d[k])) return;
    try {
      const m = await strapi.entityService.findOne(MEETING_UID, result.id, { fields: ['id'], populate: { organization: { fields: ['id'] }, deal: { fields: ['id'] }, leadCompany: { fields: ['id'] }, organizer: { fields: ['id'] } } });
      const dealId = relId(m?.deal);
      const leadId = relId(m?.leadCompany);
      if (!dealId && !leadId) return;
      scheduleCapture(strapi, { orgId: relId(m.organization), userId: relId(m.organizer), subjectType: dealId ? 'deal' : 'lead_company', subjectId: Number(dealId || leadId) });
    } catch (err) {
      strapi.log.warn(`[ai-capture] meeting hook: ${err.message}`);
    }
  };
  strapi.db.lifecycles.subscribe({
    models: [MEETING_UID],
    afterCreate: onMeeting,
    afterUpdate: onMeeting,
  });
}

module.exports = {
  FIELDS,
  SETTING_KEY,
  ACTION_KEY,
  normalizeCapture,
  buildPatch,
  createDebouncer,
  loadSubject,
  getSettings,
  saveSettings,
  runCapture,
  applyCapture,
  dismissCapture,
  registerCaptureActions,
  registerCaptureHooks,
  scheduleCapture,
};
