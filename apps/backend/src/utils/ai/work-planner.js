'use strict';

/**
 * W16 AI project planner (Fudge Work), built on the P5 foundation.
 *
 *   generatePlan(strapi, ctx, { brief, document, dealId, startDate, language })
 *     → brief / uploaded SOW / won deal + its proposals → { plan, ... }. Read-only: nothing is saved.
 *   createProjectFromPlan(strapi, { orgId, actorId, plan, project, startDate, roleAssignments })
 *     → the plan the person edited in the preview becomes a project in one transaction:
 *       phases → task lists (W1), tasks with owner by role, estimate (estimatedHours), dates and
 *       finish-to-start dependencies (W2 dependsOn).
 *
 * Creating the project is an explicit human action on the reviewed plan, through the same project
 * permissions as POST /projects, so it does not go through the AI action runner.
 */

const zlib = require('zlib');
const { renderTemplate, generateObject, createAiClient, AiError } = require('@webfudge/ai');
const ai = require('./index');
const { canAccess } = require('../rbac');
const { ROLES } = require('../project-templates');

const FEATURE = 'work.project_plan';
const TASK_UID = 'api::task.task';
const PROJECT_UID = 'api::project.project';
const TASK_LIST_UID = 'api::task-list.task-list';
const DEAL_UID = 'api::deal.deal';

const TASK_TYPES = ['task', 'deliverable', 'milestone', 'bug'];
const MAX_TASKS = 150;
const MAX_PHASES = 12;
const MAX_BRIEF_CHARS = 60000;
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const DAY_MS = 86400000;

const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);
const clampInt = (v, min, max, dflt = min) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : dflt;
};
const clampNum = (v, min, max, dflt = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n * 4) / 4)) : dflt;
};
const str = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const longStr = (v, max) => String(v ?? '').trim().slice(0, max);

function badRequest(message, code = 'AI_PLAN_INVALID') {
  return new AiError(message, { code, status: 400 });
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const LABEL_TO_KEY = new Map(Object.entries(ROLES).map(([k, label]) => [label.toLowerCase(), k]));

/** "Performance marketer" → "marketer" (a W4 role key when it matches), else a camelCase key. */
function roleKey(label) {
  const clean = str(label, 60) || 'Project manager';
  const known = LABEL_TO_KEY.get(clean.toLowerCase());
  if (known) return known;
  if (ROLES[clean]) return clean;
  const words = clean.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return 'projectManager';
  return words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join('').slice(0, 40);
}

// ---------------------------------------------------------------------------
// Plan normalization (pure; used on the AI answer and again on the edited plan)
// ---------------------------------------------------------------------------

/**
 * Makes any plan-shaped object safe to show and to create: trims text, clamps numbers, gives every
 * task a unique ref, drops dependencies on unknown or later tasks (so there are no loops) and moves
 * start days so a task never starts before the tasks it depends on finish.
 *
 * @returns {{ projectName, summary, phases: Array<{ name, tasks: Array<{ ref, name, description, role, roleKey, type, estimateHours, startDay, durationDays, dependsOn: string[] }> }>, roles: Array<{ key, label, taskCount, hours }>, assumptions: string[], risks: string[], totals: { tasks, hours, durationDays } }}
 */
function normalizePlan(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const phasesIn = Array.isArray(input.phases) ? input.phases.slice(0, MAX_PHASES) : [];
  const usedRefs = new Set();
  const refMap = new Map(); // original ref → normalized ref (first occurrence wins)
  let count = 0;
  let next = 1;
  const freshRef = () => {
    while (usedRefs.has(`T${next}`)) next += 1;
    return `T${next}`;
  };

  const phases = [];
  for (const p of phasesIn) {
    if (!p || typeof p !== 'object') continue;
    const tasks = [];
    for (const t of Array.isArray(p.tasks) ? p.tasks : []) {
      if (!t || typeof t !== 'object' || count >= MAX_TASKS) continue;
      const name = str(t.name, 160);
      if (!name) continue;
      const original = str(t.ref, 12);
      let ref = original && /^[A-Za-z0-9_-]+$/.test(original) && !usedRefs.has(original) ? original : freshRef();
      usedRefs.add(ref);
      if (original && !refMap.has(original)) refMap.set(original, ref);
      const type = TASK_TYPES.includes(t.type) ? t.type : 'task';
      const role = str(t.role, 60) || 'Project manager';
      tasks.push({
        ref,
        name,
        description: longStr(t.description, 600),
        role,
        roleKey: roleKey(role),
        type,
        estimateHours: type === 'milestone' ? 0 : clampNum(t.estimateHours, 0, 2000),
        startDay: clampInt(t.startDay, 0, 2000, 0),
        durationDays: type === 'milestone' ? 0 : clampInt(t.durationDays, 0, 365, 1),
        dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.map((d) => str(d, 12)).filter(Boolean) : [],
      });
      count += 1;
    }
    if (tasks.length) phases.push({ name: str(p.name, 120) || `Phase ${phases.length + 1}`, tasks });
  }

  // Dependencies: only on tasks that come earlier in plan order (rules out loops), de-duplicated.
  const seen = new Map(); // ref → task (earlier tasks only)
  for (const phase of phases) {
    for (const t of phase.tasks) {
      const deps = [];
      for (const d of t.dependsOn) {
        const ref = seen.has(d) ? d : refMap.get(d);
        if (ref && ref !== t.ref && seen.has(ref) && !deps.includes(ref)) deps.push(ref);
      }
      t.dependsOn = deps.slice(0, 10);
      // Finish-to-start: start no earlier than every predecessor's finish.
      for (const ref of t.dependsOn) {
        const pred = seen.get(ref);
        t.startDay = Math.max(t.startDay, pred.startDay + pred.durationDays);
      }
      seen.set(t.ref, t);
    }
  }

  const roles = new Map();
  let hours = 0;
  let end = 0;
  for (const t of phases.flatMap((p) => p.tasks)) {
    const r = roles.get(t.roleKey) || { key: t.roleKey, label: t.role, taskCount: 0, hours: 0 };
    r.taskCount += 1;
    r.hours += t.estimateHours;
    roles.set(t.roleKey, r);
    hours += t.estimateHours;
    end = Math.max(end, t.startDay + t.durationDays);
  }
  const list = (v, n) => (Array.isArray(v) ? v.map((x) => longStr(x, 300)).filter(Boolean).slice(0, n) : []);

  return {
    projectName: str(input.projectName, 120),
    summary: longStr(input.summary, 800),
    phases,
    roles: [...roles.values()].map((r) => ({ ...r, hours: Math.round(r.hours * 100) / 100 })),
    assumptions: list(input.assumptions, 10),
    risks: list(input.risks, 10),
    totals: { tasks: count, hours: Math.round(hours * 100) / 100, durationDays: end },
  };
}

// ---------------------------------------------------------------------------
// SOW documents
// ---------------------------------------------------------------------------

/** Reads one entry from a .zip buffer (enough for .docx: stored or deflated entries). */
function readZipEntry(buf, wanted) {
  // End of central directory record: last 22..65557 bytes.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const entries = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < entries && p + 46 <= buf.length; n += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return null;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === wanted) {
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compSize);
      if (method === 0) return data;
      if (method === 8) return zlib.inflateRawSync(data, { maxOutputLength: 50 * 1024 * 1024 });
      return null;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

/** Plain text of a .docx (paragraphs and table cells on their own lines). */
function docxToText(buf) {
  const xml = readZipEntry(buf, 'word/document.xml');
  if (!xml) return null;
  const text = xml
    .toString('utf8')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<[^>]+>/g, '');
  return decodeXmlEntities(text).replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Turns an uploaded SOW into what the model reads: a PDF goes to Claude as a document block
 * (it reads layout, tables and scans), Word and text files as extracted text.
 * @param {{ buffer: Buffer, mimeType?: string, filename?: string }} doc
 * @returns {{ kind: 'pdf', block: object } | { kind: 'text', text: string }}
 */
function readSowDocument(doc) {
  const buffer = doc?.buffer;
  if (!buffer || !buffer.length) throw badRequest('The uploaded file is empty.', 'AI_DOCUMENT_INVALID');
  if (buffer.length > MAX_DOC_BYTES) throw badRequest('The SOW file is larger than 10 MB. Upload a smaller file or paste the scope as text.', 'AI_DOCUMENT_TOO_LARGE');
  const name = String(doc.filename || '').toLowerCase();
  const mime = String(doc.mimeType || '').toLowerCase();
  const isPdf = mime === 'application/pdf' || name.endsWith('.pdf') || buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  if (isPdf) {
    return { kind: 'pdf', block: { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') }, title: str(doc.filename, 120) || 'Statement of work' } };
  }
  const isDocx = name.endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (isDocx) {
    const text = docxToText(buffer);
    if (!text) throw badRequest('Could not read that Word file. Save it as PDF or paste the scope as text.', 'AI_DOCUMENT_INVALID');
    return { kind: 'text', text: text.slice(0, MAX_BRIEF_CHARS) };
  }
  const isText = /^text\//.test(mime) || /\.(txt|md|markdown|csv)$/.test(name);
  if (isText) return { kind: 'text', text: buffer.toString('utf8').slice(0, MAX_BRIEF_CHARS) };
  throw badRequest('Upload the SOW as a PDF, Word (.docx) or text file.', 'AI_DOCUMENT_UNSUPPORTED');
}

// ---------------------------------------------------------------------------
// Deal handoff context
// ---------------------------------------------------------------------------

const PROPOSAL_FIELDS = [
  'id', 'title', 'proposalNumber', 'projectName', 'projectOverview', 'modules', 'milestones', 'estimatedTimeline',
  'assumptions', 'outOfScope', 'handoverDeliverables', 'acceptanceNotes', 'lineItems', 'totalValue', 'currency', 'status', 'notes',
];

/** Copy with very long strings cut, so one proposal cannot crowd out the rest of the prompt. */
function compact(value) {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'string' && v.length > 3000 ? `${v.slice(0, 3000)}…` : v)));
}

/** The won deal and its proposals (the SOW) as planner input. Org-scoped; needs read access to the deal. */
async function loadDealContext(strapi, ctx, dealId) {
  const id = parseInt(String(dealId), 10);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Invalid deal id.');
  const deal = await strapi.entityService.findOne(DEAL_UID, id, {
    populate: { organization: { fields: ['id'] }, assignedTo: { fields: ['id'] }, clientAccount: { fields: ['id', 'companyName'] }, leadCompany: { fields: ['id', 'companyName', 'industry'] } },
  });
  if (!deal || String(relId(deal.organization)) !== String(ctx.state.orgId)) throw new AiError('Deal not found.', { code: 'AI_SUBJECT_NOT_FOUND', status: 404 });
  // Same rule as POST /deals/:id/delivery-project: the deal owner or CRM deals manage access.
  const mine = ctx.state.user?.id && String(relId(deal.assignedTo)) === String(ctx.state.user.id);
  if (!mine && !canAccess(ctx, 'crm', 'deals', 'manage')) {
    throw new AiError('You can only plan delivery projects for deals assigned to you.', { code: 'AI_PERMISSION_DENIED', status: 403 });
  }

  const proposals = await strapi.entityService.findMany('api::proposal.proposal', {
    filters: { organization: ctx.state.orgId, deal: id },
    fields: PROPOSAL_FIELDS.filter((f) => f !== 'id'),
    sort: { id: 'desc' },
    limit: 5,
  });
  return {
    deal: {
      id: deal.id,
      name: deal.name,
      value: deal.value != null ? Number(deal.value) : null,
      stage: deal.stage,
      description: longStr(deal.description, 4000) || null,
      notes: longStr(deal.notes, 2000) || null,
      client: deal.clientAccount?.companyName || deal.leadCompany?.companyName || null,
      industry: deal.leadCompany?.industry || null,
      expectedCloseDate: deal.expectedCloseDate || null,
    },
    proposals: proposals.map((p) => compact(Object.fromEntries(Object.entries(p).filter(([k, v]) => PROPOSAL_FIELDS.includes(k) && v != null && v !== '' && !(Array.isArray(v) && !v.length))))),
  };
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

/** Metered client with a longer timeout: a full plan is a long answer. Same provider and meter as ai.clientFor. */
function plannerClient(strapi, ctx) {
  return createAiClient({
    provider: ai.getProvider(),
    meter: ai.createMeter(strapi, { orgId: ctx.state.orgId, userId: ctx.state.user?.id ?? null }),
    logger: strapi.log,
    timeoutMs: Number(process.env.AI_PLANNER_TIMEOUT_MS) || Math.max(Number(process.env.AI_TIMEOUT_MS) || 0, 180000),
    retries: 1,
  });
}

/**
 * @param {object} o
 * @param {string} [o.brief]       pasted brief / scope text
 * @param {{ buffer, mimeType, filename }} [o.document]  uploaded SOW
 * @param {number|string} [o.dealId]  won deal (handoff): the deal and its proposals are the scope
 * @param {string} [o.startDate]   YYYY-MM-DD
 * @param {string} [o.language]    en | hi | mr
 */
async function generatePlan(strapi, ctx, { brief, document, dealId, startDate, language } = {}) {
  const text = longStr(brief, MAX_BRIEF_CHARS);
  const doc = document ? readSowDocument(document) : null;
  const dealCtx = dealId ? await loadDealContext(strapi, ctx, dealId) : null;
  const hasScope = Boolean(text || doc || (dealCtx && (dealCtx.proposals.length || dealCtx.deal.description || dealCtx.deal.notes)));
  if (!hasScope && !dealCtx) throw badRequest('Paste a brief or upload the SOW first.', 'AI_PLAN_NO_INPUT');

  const briefParts = [text, doc?.kind === 'text' ? `Statement of work (from the uploaded file):\n${doc.text}` : ''].filter(Boolean);
  const t = renderTemplate(
    'work.project_plan',
    {
      brief: briefParts.join('\n\n'),
      deal: dealCtx?.deal || null,
      proposals: dealCtx?.proposals || [],
      hasDocument: doc?.kind === 'pdf',
      startDate: startDate ? String(startDate).slice(0, 10) : null,
    },
    { language }
  );
  const content = doc?.kind === 'pdf' ? [doc.block, { type: 'text', text: t.prompt }] : t.prompt;

  const out = await generateObject(plannerClient(strapi, ctx), {
    ...t,
    messages: [{ role: 'user', content }],
    feature: FEATURE,
    maxAttempts: 2,
    metadata: { subjectType: dealCtx ? 'deal' : 'project_plan', subjectId: dealCtx?.deal.id ?? null, source: doc ? `document:${doc.kind}` : dealCtx ? 'deal' : 'brief' },
  });

  const plan = normalizePlan(out.object);
  if (!plan.phases.length) throw new AiError('Fudge AI could not build a plan from that. Add more detail about the scope and try again.', { code: 'AI_INVALID_OUTPUT', status: 502 });
  if (!plan.projectName && dealCtx) plan.projectName = str(dealCtx.deal.name, 120);

  return {
    plan,
    source: { brief: Boolean(text), document: doc ? doc.kind : null, dealId: dealCtx?.deal.id ?? null, proposals: dealCtx?.proposals.map((p) => p.id).filter(Boolean) || [] },
    language: t.language,
    model: out.model,
    creditsUsed: out.credits,
    credits: await ai.creditStatus(strapi, ctx.state.orgId),
  };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Validates an edited plan for creation. Throws AiError(400) with a user-facing message.
 * @returns normalized plan
 */
function planForCreate(rawPlan) {
  if (!rawPlan || typeof rawPlan !== 'object') throw badRequest('Send the plan to create.');
  const plan = normalizePlan(rawPlan);
  if (!plan.totals.tasks) throw badRequest('The plan has no tasks. Add at least one task.');
  return plan;
}

/**
 * Create a project from a reviewed plan in one transaction.
 * `project` is the validated project payload (organization, workspace, projectManager, clientAccount, sourceDeal…).
 * roleAssignments: { [roleKey]: userId } — only active org members are assigned; they join the team.
 * @returns {Promise<{ entry: object, taskCount: number, listCount: number, dependencyCount: number }>}
 */
async function createProjectFromPlan(strapi, { orgId, actorId, plan: rawPlan, project, startDate, roleAssignments = {} }) {
  const plan = planForCreate(rawPlan);
  const members = await strapi.entityService.findMany('api::organization-user.organization-user', {
    filters: { organization: orgId, isActive: true },
    populate: { user: { fields: ['id'] } },
    limit: 1000,
  });
  const memberIds = new Set(members.map((m) => m.user?.id).filter(Boolean).map(String));
  const pmId = relId(project.projectManager);
  const assigneeFor = (key) => {
    const raw = roleAssignments?.[key] ?? (key === 'projectManager' ? pmId : null);
    const id = raw == null || raw === '' ? null : parseInt(String(raw), 10);
    return id != null && memberIds.has(String(id)) ? id : null;
  };

  const day = String(startDate || new Date().toISOString()).slice(0, 10);
  const start = new Date(`${day}T09:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw badRequest('Start date is invalid.');

  const data = { ...project };
  data.startDate = start.toISOString();
  if (!data.endDate) data.endDate = addDays(start, plan.totals.durationDays).toISOString();
  if (!data.description && plan.summary) data.description = plan.summary;
  const assigned = new Set(plan.roles.map((r) => assigneeFor(r.key)).filter(Boolean));
  const team = new Set([...(Array.isArray(data.teamMembers) ? data.teamMembers : []).map((x) => relId(x)), ...assigned]);
  data.teamMembers = [...team].map(Number).filter((n) => memberIds.has(String(n)));
  delete data.taskLists;
  delete data.tasks;

  return strapi.db.transaction(async () => {
    const entry = await strapi.entityService.create(PROJECT_UID, { data });
    const idByRef = new Map();
    const pending = []; // [taskId, dependsOnRefs]
    let taskCount = 0;
    let listCount = 0;

    for (let i = 0; i < plan.phases.length; i += 1) {
      const phase = plan.phases[i];
      // The first phase is the project's default list (W1 expects exactly one per project). The
      // project may already have one (created when the project is saved): reuse and rename it.
      let list = null;
      if (i === 0) {
        const [existing] = await strapi.entityService.findMany(TASK_LIST_UID, { filters: { project: entry.id, isDefault: true }, fields: ['id'], limit: 1 });
        if (existing) list = await strapi.entityService.update(TASK_LIST_UID, existing.id, { data: { name: phase.name, sortOrder: 0 } });
      }
      if (!list) {
        list = await strapi.entityService.create(TASK_LIST_UID, {
          data: { name: phase.name, sortOrder: i, isDefault: i === 0, project: entry.id, organization: orgId },
        });
      }
      listCount += 1;
      for (const t of phase.tasks) {
        const s = addDays(start, t.startDay);
        const e = addDays(s, t.durationDays);
        const description = [t.description, `Role: ${t.role}`].filter(Boolean).join('\n\n');
        const task = await strapi.entityService.create(TASK_UID, {
          data: {
            name: t.name,
            description,
            status: 'SCHEDULED',
            priority: t.type === 'milestone' ? 'high' : 'medium',
            taskType: t.type,
            startDate: s.toISOString(),
            scheduledDate: e.toISOString(),
            estimatedHours: t.estimateHours || null,
            projects: [entry.id],
            taskList: list.id,
            organization: orgId,
            assigner: actorId,
            assignee: assigneeFor(t.roleKey),
            assignmentApprovalStatus: 'not_required',
            tags: ['ai-plan'],
          },
        });
        idByRef.set(t.ref, task.id);
        if (t.dependsOn.length) pending.push([task.id, t.dependsOn]);
        taskCount += 1;
      }
    }

    // Plan order already rules out loops (normalizePlan), so links are written directly.
    let dependencyCount = 0;
    for (const [taskId, refs] of pending) {
      const dependsOn = refs.map((r) => idByRef.get(r)).filter(Boolean).map((id) => ({ taskId: id, type: 'FS', lagDays: 0 }));
      if (!dependsOn.length) continue;
      await strapi.entityService.update(TASK_UID, taskId, { data: { dependsOn } });
      dependencyCount += dependsOn.length;
    }
    return { entry, taskCount, listCount, dependencyCount };
  });
}

module.exports = {
  FEATURE,
  MAX_DOC_BYTES,
  roleKey,
  normalizePlan,
  planForCreate,
  readSowDocument,
  docxToText,
  loadDealContext,
  generatePlan,
  createProjectFromPlan,
};
