'use strict';

/**
 * Agent action framework. Anything the AI wants to *do* (change a record, send a message) goes
 * through here, never straight to the database or a mail API:
 *
 *   1. permission-checked as the acting user (the human the AI works for), via `can`;
 *   2. written to the audit log with the AI as actor (`audit`);
 *   3. undoable when the action defines `undo` (the executor returns the data needed to revert);
 *   4. outbound actions (email, WhatsApp, SMS, ...) are not executed: they are queued with status
 *      pending_approval until a person approves (then executed, re-checked as the approver) or rejects.
 *
 * Storage, permissions and audit are injected so this stays framework-agnostic:
 *   store: { create(row) → row (with id), get(id) → row, transition(id, fromStatus, patch) → row|null }
 *   can:   async (actor, permission, { input, orgId, record }) → boolean
 *   audit: async ({ event, record, actor, summary }) → void
 * actor: { id, orgId, ... } — whatever `can` understands (the backend passes its ctx state).
 *
 * Statuses: pending_approval → executed | rejected | failed;  executed → undone.
 */

const { AiPermissionError, AiError } = require('./errors');

const STATUS = Object.freeze({
  PENDING: 'pending_approval',
  EXECUTED: 'executed',
  REJECTED: 'rejected',
  UNDONE: 'undone',
  FAILED: 'failed',
});

function createActionRunner({ store, can, audit = async () => {}, logger = null } = {}) {
  if (!store || !can) throw new Error('createActionRunner needs store and can');
  const actions = new Map();

  /**
   * @param {object} def
   * @param {string} def.key           "<app>.<object>.<verb>", e.g. "grow.lead.set_ai_score"
   * @param {string} def.label         human label for the queue / audit
   * @param {object|Function} def.permission  { app, module, access } or async (actor, input) → bool
   * @param {boolean} [def.outbound]   true → needs approval before execute
   * @param {Function} def.execute     async (input, { actor, orgId, record }) → { result?, undoData?, subject?, summary? }
   * @param {Function} [def.undo]      async (undoData, { actor, orgId, record }) → void
   * @param {Function} [def.describe]  (input) → one-line summary for the queue
   */
  function define(def) {
    if (!def.key || typeof def.execute !== 'function') throw new Error('define() needs key and execute');
    if (actions.has(def.key)) throw new Error(`AI action "${def.key}" is already defined`);
    actions.set(def.key, def);
    return def;
  }

  function get(key) {
    const def = actions.get(key);
    if (!def) throw new AiError(`Unknown AI action "${key}"`, { code: 'AI_ACTION_UNKNOWN', status: 400 });
    return def;
  }

  async function allowed(def, actor, input, orgId, record) {
    if (typeof def.permission === 'function') return Boolean(await def.permission(actor, input, { orgId, record }));
    return Boolean(await can(actor, def.permission, { input, orgId, record }));
  }

  async function requireAllowed(def, actor, input, orgId, record) {
    if (!(await allowed(def, actor, input, orgId, record))) {
      throw new AiPermissionError(`You do not have permission to ${def.label || def.key}.`, { action: def.key });
    }
  }

  async function safeAudit(entry) {
    try {
      await audit(entry);
    } catch (err) {
      if (logger && logger.warn) logger.warn(`[ai] audit failed for ${entry.record?.actionKey}: ${err.message}`);
    }
  }

  async function runExecute(def, record, actor) {
    const out = (await def.execute(record.input, { actor, orgId: record.orgId, record })) || {};
    return {
      result: out.result ?? null,
      undoData: def.undo ? out.undoData ?? null : null,
      subjectType: out.subject?.type ?? record.subjectType ?? null,
      subjectId: out.subject?.id ?? record.subjectId ?? null,
      summary: out.summary || record.summary,
    };
  }

  /**
   * The AI proposes an action on behalf of `actor`.
   * Non-outbound actions run immediately; outbound ones are queued.
   * @returns {Promise<object>} the stored action record
   */
  async function propose({ key, actor, orgId, input = {}, feature = null, subject = null, summary = null, aiMeta = null }) {
    const def = get(key);
    if (!orgId) throw new Error('propose() needs orgId');
    await requireAllowed(def, actor, input, orgId, null);

    const base = {
      orgId,
      actorId: actor?.id ?? null,
      actionKey: key,
      label: def.label || key,
      outbound: Boolean(def.outbound),
      undoable: Boolean(def.undo),
      input,
      feature,
      subjectType: subject?.type ?? null,
      subjectId: subject?.id ?? null,
      summary: summary || (def.describe ? def.describe(input) : def.label || key),
      aiMeta,
    };

    if (def.outbound) {
      const record = await store.create({ ...base, status: STATUS.PENDING });
      await safeAudit({ event: 'proposed', record, actor, summary: `Fudge AI drafted "${record.summary}" for approval` });
      return record;
    }

    let outcome;
    try {
      outcome = await runExecute(def, base, actor);
    } catch (err) {
      const failed = await store.create({ ...base, status: STATUS.FAILED, error: String(err.message || err) });
      await safeAudit({ event: 'failed', record: failed, actor, summary: `Fudge AI could not ${def.label || key}` });
      throw err;
    }
    const record = await store.create({ ...base, ...outcome, status: STATUS.EXECUTED, executedAt: new Date().toISOString() });
    await safeAudit({ event: 'executed', record, actor, summary: `Fudge AI: ${record.summary}` });
    return record;
  }

  async function load(id, orgId) {
    const record = await store.get(id);
    if (!record || String(record.orgId) !== String(orgId)) {
      throw new AiError('AI action not found.', { code: 'AI_ACTION_NOT_FOUND', status: 404 });
    }
    return record;
  }

  function conflict(record, expected) {
    return new AiError(`This action is ${String(record?.status || 'gone').replace('_', ' ')}, not ${expected.replace('_', ' ')}.`, {
      code: 'AI_ACTION_STATE',
      status: 409,
      details: { status: record?.status },
    });
  }

  /** A person approves a queued outbound action; it is executed as them. */
  async function approve(id, { actor, orgId }) {
    const record = await load(id, orgId);
    if (record.status !== STATUS.PENDING) throw conflict(record, STATUS.PENDING);
    const def = get(record.actionKey);
    await requireAllowed(def, actor, record.input, orgId, record);
    // Claim it first so two approvers cannot both send.
    const claimed = await store.transition(id, STATUS.PENDING, { status: 'executing', decidedById: actor?.id ?? null, decidedAt: new Date().toISOString() });
    if (!claimed) throw conflict(await store.get(id), STATUS.PENDING);
    try {
      const outcome = await runExecute(def, record, actor);
      const done = await store.transition(id, 'executing', { ...outcome, status: STATUS.EXECUTED, executedAt: new Date().toISOString() });
      await safeAudit({ event: 'approved', record: done, actor, summary: `Approved and sent: ${done.summary}` });
      return done;
    } catch (err) {
      const failed = await store.transition(id, 'executing', { status: STATUS.FAILED, error: String(err.message || err) });
      await safeAudit({ event: 'failed', record: failed || record, actor, summary: `Approved but failed: ${record.summary}` });
      throw err;
    }
  }

  async function reject(id, { actor, orgId, reason = null }) {
    const record = await load(id, orgId);
    if (record.status !== STATUS.PENDING) throw conflict(record, STATUS.PENDING);
    const def = get(record.actionKey);
    await requireAllowed(def, actor, record.input, orgId, record);
    const done = await store.transition(id, STATUS.PENDING, { status: STATUS.REJECTED, decidedById: actor?.id ?? null, decidedAt: new Date().toISOString(), error: reason });
    if (!done) throw conflict(await store.get(id), STATUS.PENDING);
    await safeAudit({ event: 'rejected', record: done, actor, summary: `Rejected AI draft: ${done.summary}` });
    return done;
  }

  async function undo(id, { actor, orgId }) {
    const record = await load(id, orgId);
    const def = get(record.actionKey);
    if (!def.undo || !record.undoable) throw new AiError('This AI action cannot be undone.', { code: 'AI_ACTION_NOT_UNDOABLE', status: 409 });
    if (record.status !== STATUS.EXECUTED) throw conflict(record, STATUS.EXECUTED);
    await requireAllowed(def, actor, record.input, orgId, record);
    const claimed = await store.transition(id, STATUS.EXECUTED, { status: 'undoing' });
    if (!claimed) throw conflict(await store.get(id), STATUS.EXECUTED);
    try {
      await def.undo(record.undoData, { actor, orgId, record });
    } catch (err) {
      await store.transition(id, 'undoing', { status: STATUS.EXECUTED });
      throw err;
    }
    const done = await store.transition(id, 'undoing', { status: STATUS.UNDONE, undoneAt: new Date().toISOString(), undoneById: actor?.id ?? null });
    await safeAudit({ event: 'undone', record: done, actor, summary: `Undid AI action: ${done.summary}` });
    return done;
  }

  return { define, get, propose, approve, reject, undo, list: () => [...actions.keys()] };
}

module.exports = { createActionRunner, STATUS };
