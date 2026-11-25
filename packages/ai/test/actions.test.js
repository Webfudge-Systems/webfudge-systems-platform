'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createActionRunner, STATUS } = require('../src');

/** In-memory store with the same contract the backend implements. */
function memoryStore() {
  const rows = new Map();
  let next = 1;
  return {
    rows,
    async create(row) {
      const r = { ...row, id: next++ };
      rows.set(r.id, r);
      return { ...r };
    },
    async get(id) {
      const r = rows.get(Number(id));
      return r ? { ...r } : null;
    },
    async transition(id, from, patch) {
      const r = rows.get(Number(id));
      if (!r || r.status !== from) return null;
      Object.assign(r, patch);
      return { ...r };
    },
  };
}

function setup({ permissions = {} } = {}) {
  const store = memoryStore();
  const auditLog = [];
  const leads = new Map([[1, { id: 1, aiScore: 10 }]]);
  const sent = [];
  const runner = createActionRunner({
    store,
    can: async (actor, perm) => Boolean(permissions[actor.id]?.includes(`${perm.app}.${perm.module}.${perm.access}`)),
    audit: async (entry) => auditLog.push(entry),
  });
  runner.define({
    key: 'grow.lead.set_ai_score',
    label: 'update the AI lead score',
    permission: { app: 'crm', module: 'leads', access: 'write' },
    execute: async (input) => {
      const lead = leads.get(input.leadId);
      const previous = lead.aiScore;
      lead.aiScore = input.score;
      return { result: { score: input.score }, undoData: { leadId: input.leadId, previous }, subject: { type: 'lead_company', id: input.leadId }, summary: `Scored lead ${input.leadId} at ${input.score}` };
    },
    undo: async ({ leadId, previous }) => {
      leads.get(leadId).aiScore = previous;
    },
  });
  runner.define({
    key: 'grow.lead.send_email',
    label: 'send an email to a lead',
    outbound: true,
    permission: { app: 'crm', module: 'leads', access: 'write' },
    describe: (input) => `Email "${input.subject}" to ${input.to}`,
    execute: async (input) => {
      sent.push(input);
      return { result: { delivered: true } };
    },
  });
  return { runner, store, auditLog, leads, sent };
}

const writer = { id: 7 };
const reader = { id: 8 };
const perms = { 7: ['crm.leads.write'], 8: [] };

test('a permitted non-outbound action executes, is audited with the AI as actor, and can be undone', async () => {
  const { runner, auditLog, leads } = setup({ permissions: perms });
  const record = await runner.propose({ key: 'grow.lead.set_ai_score', actor: writer, orgId: 1, input: { leadId: 1, score: 88 }, feature: 'grow.lead_score' });
  assert.equal(record.status, STATUS.EXECUTED);
  assert.equal(leads.get(1).aiScore, 88);
  assert.equal(record.subjectType, 'lead_company');
  assert.equal(auditLog.length, 1);
  assert.equal(auditLog[0].event, 'executed');
  assert.match(auditLog[0].summary, /^Fudge AI: Scored lead 1 at 88/);
  assert.equal(auditLog[0].actor, writer);

  const undone = await runner.undo(record.id, { actor: writer, orgId: 1 });
  assert.equal(undone.status, STATUS.UNDONE);
  assert.equal(leads.get(1).aiScore, 10);
  assert.equal(auditLog[1].event, 'undone');
  // Undo twice is a state conflict.
  await assert.rejects(runner.undo(record.id, { actor: writer, orgId: 1 }), (e) => e.code === 'AI_ACTION_STATE');
});

test('an action is permission-checked as the acting user', async () => {
  const { runner, auditLog, leads, store } = setup({ permissions: perms });
  await assert.rejects(runner.propose({ key: 'grow.lead.set_ai_score', actor: reader, orgId: 1, input: { leadId: 1, score: 99 } }), (e) => {
    assert.equal(e.code, 'AI_ACTION_FORBIDDEN');
    assert.equal(e.status, 403);
    return true;
  });
  assert.equal(leads.get(1).aiScore, 10);
  assert.equal(store.rows.size, 0);
  assert.equal(auditLog.length, 0);
});

test('outbound actions go to the approval queue instead of executing', async () => {
  const { runner, sent, auditLog } = setup({ permissions: perms });
  const queued = await runner.propose({ key: 'grow.lead.send_email', actor: writer, orgId: 1, input: { to: 'a@acme.in', subject: 'Hello', body: 'Hi' } });
  assert.equal(queued.status, STATUS.PENDING);
  assert.equal(queued.summary, 'Email "Hello" to a@acme.in');
  assert.equal(sent.length, 0);
  assert.equal(auditLog[0].event, 'proposed');

  // A user without permission cannot approve.
  await assert.rejects(runner.approve(queued.id, { actor: reader, orgId: 1 }), (e) => e.code === 'AI_ACTION_FORBIDDEN');
  // Another organization cannot see it.
  await assert.rejects(runner.approve(queued.id, { actor: writer, orgId: 2 }), (e) => e.code === 'AI_ACTION_NOT_FOUND');

  const approved = await runner.approve(queued.id, { actor: writer, orgId: 1 });
  assert.equal(approved.status, STATUS.EXECUTED);
  assert.equal(approved.decidedById, 7);
  assert.equal(sent.length, 1);
  assert.equal(auditLog[auditLog.length - 1].event, 'approved');

  // Cannot be approved (sent) twice.
  await assert.rejects(runner.approve(queued.id, { actor: writer, orgId: 1 }), (e) => e.code === 'AI_ACTION_STATE');
  assert.equal(sent.length, 1);
});

test('rejecting a queued action never sends it', async () => {
  const { runner, sent, auditLog } = setup({ permissions: perms });
  const queued = await runner.propose({ key: 'grow.lead.send_email', actor: writer, orgId: 1, input: { to: 'b@x.in', subject: 'Hi', body: '.' } });
  const rejected = await runner.reject(queued.id, { actor: writer, orgId: 1, reason: 'Wrong tone' });
  assert.equal(rejected.status, STATUS.REJECTED);
  assert.equal(rejected.error, 'Wrong tone');
  assert.equal(sent.length, 0);
  assert.equal(auditLog[auditLog.length - 1].event, 'rejected');
  await assert.rejects(runner.approve(queued.id, { actor: writer, orgId: 1 }), (e) => e.code === 'AI_ACTION_STATE');
});

test('outbound actions without undo are not undoable; failures are recorded', async () => {
  const { runner } = setup({ permissions: perms });
  const queued = await runner.propose({ key: 'grow.lead.send_email', actor: writer, orgId: 1, input: { to: 'c@x.in', subject: 'S', body: 'B' } });
  await runner.approve(queued.id, { actor: writer, orgId: 1 });
  await assert.rejects(runner.undo(queued.id, { actor: writer, orgId: 1 }), (e) => e.code === 'AI_ACTION_NOT_UNDOABLE');

  runner.define({ key: 'grow.lead.broken', label: 'break', permission: () => true, execute: async () => { throw new Error('db down'); } });
  await assert.rejects(runner.propose({ key: 'grow.lead.broken', actor: writer, orgId: 1 }), /db down/);
});
