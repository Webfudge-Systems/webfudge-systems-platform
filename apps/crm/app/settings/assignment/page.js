'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import strapiClient from '../../../lib/strapiClient';
import assignmentService, { ASSIGNMENT_STRATEGIES, MATCH_FIELDS } from '../../../lib/api/assignmentService';
import { canManageCRM } from '../../../lib/rbac';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-50';

const userName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || u?.email || `User #${u?.id}`;
const splitList = (text) =>
  String(text || '')
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

const EMPTY_RULE = { name: '', strategy: 'round_robin', assigneeIds: [], maxOpenLeads: '', match: {}, enabled: true };

function Banner({ tone, children }) {
  const cls = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <p className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

function matchSummary(match) {
  const parts = MATCH_FIELDS.filter((f) => match?.[f.key]?.length).map((f) => `${f.label}: ${match[f.key].join(', ')}`);
  return parts.length ? parts.join(' · ') : 'Every lead';
}

function RuleForm({ initial, users, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => ({
    ...EMPTY_RULE,
    ...initial,
    maxOpenLeads: initial?.maxOpenLeads ?? '',
    matchText: Object.fromEntries(MATCH_FIELDS.map((f) => [f.key, (initial?.match?.[f.key] || []).join(', ')])),
  }));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const toggleUser = (id) =>
    set({ assigneeIds: draft.assigneeIds.includes(id) ? draft.assigneeIds.filter((x) => x !== id) : [...draft.assigneeIds, id] });

  const submit = (e) => {
    e.preventDefault();
    onSave({
      name: draft.name.trim(),
      strategy: draft.strategy,
      enabled: draft.enabled,
      assigneeIds: draft.assigneeIds,
      maxOpenLeads: draft.maxOpenLeads === '' ? null : Number(draft.maxOpenLeads),
      match: Object.fromEntries(MATCH_FIELDS.map((f) => [f.key, splitList(draft.matchText[f.key])])),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Rule name</span>
          <input className={inputClass} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="West region inbound" required />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">How to pick the owner</span>
          <select className={inputClass} value={draft.strategy} onChange={(e) => set({ strategy: e.target.value })}>
            {ASSIGNMENT_STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-gray-500">{ASSIGNMENT_STRATEGIES.find((s) => s.value === draft.strategy)?.hint}</span>
        </label>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-gray-700">Assign to</legend>
        <div className="flex flex-wrap gap-2">
          {users.map((u) => {
            const on = draft.assigneeIds.includes(Number(u.id));
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleUser(Number(u.id))}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
              >
                {userName(u)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <p className="mb-1 text-sm font-medium text-gray-700">Only for leads matching (leave empty for every lead)</p>
        <div className="grid gap-3 md:grid-cols-2">
          {MATCH_FIELDS.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="mb-1 block text-gray-600">{f.label}</span>
              <input
                className={inputClass}
                value={draft.matchText[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => set({ matchText: { ...draft.matchText, [f.key]: e.target.value } })}
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Max open leads per person (optional)</span>
            <input
              type="number"
              min="1"
              className={inputClass}
              value={draft.maxOpenLeads}
              onChange={(e) => set({ maxOpenLeads: e.target.value })}
              placeholder="No cap"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || !draft.name.trim() || !draft.assigneeIds.length}>
          {initial?.id ? 'Save rule' : 'Add rule'}
        </Button>
      </div>
    </form>
  );
}

export default function AssignmentSettingsPage() {
  const canEdit = canManageCRM('settings');
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [sla, setSla] = useState({ enabled: false, firstContactMinutes: 60, reassignOnBreach: false });
  const [assignment, setAssignment] = useState({ applyToRepCreated: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [test, setTest] = useState({ city: '', state: '', zipCode: '', source: '', industry: '' });
  const [testResult, setTestResult] = useState(undefined);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [r, s, u] = await Promise.all([
        assignmentService.listRules(),
        assignmentService.getSla(),
        strapiClient.getOrganizationUsers({ pageSize: 200 }).catch(() => ({ data: [] })),
      ]);
      setRules(r);
      if (s?.sla) setSla(s.sla);
      if (s?.assignment) setAssignment(s.assignment);
      setUsers(Array.isArray(u?.data) ? u.data : []);
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not load assignment settings' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const usersById = useMemo(() => new Map(users.map((u) => [Number(u.id), u])), [users]);

  const run = async (fn, okText) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      if (okText) setMessage({ tone: 'ok', text: okText });
      await load({ silent: true });
      return true;
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not save' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= rules.length) return;
    const order = [...rules];
    [order[index], order[target]] = [order[target], order[index]];
    run(() => Promise.all(order.map((r, i) => assignmentService.updateRule(r.id, { sortOrder: i }))));
  };

  const saveSla = (e) => {
    e.preventDefault();
    run(() => assignmentService.saveSla({ sla, assignment }), 'SLA settings saved.');
  };

  const runTest = async (e) => {
    e.preventDefault();
    setTestResult(undefined);
    try {
      setTestResult(await assignmentService.testRules(test));
    } catch (err) {
      setMessage({ tone: 'error', text: err?.message || 'Test failed' });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Lead assignment & SLA"
        subtitle="Give every new lead an owner automatically, and make sure it's contacted in time"
        breadcrumb={[
          { label: 'Settings', href: '/settings' },
          { label: 'Lead assignment & SLA', href: '/settings/assignment' },
        ]}
      />

      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      {!canEdit ? <Banner tone="error">Only CRM admins can change these settings. You can view them.</Banner> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <Card className="space-y-4 border border-gray-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Assignment rules</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Rules are checked top to bottom. The first rule that matches a new lead picks its owner. Applies to leads added
                  without an owner, imports and other sources. Leads that match no rule stay with whoever added them.
                </p>
              </div>
              {canEdit && !adding ? (
                <Button onClick={() => setAdding(true)} disabled={busy}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden />
                  New rule
                </Button>
              ) : null}
            </div>

            {adding ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-4">
                <RuleForm
                  users={users}
                  busy={busy}
                  onCancel={() => setAdding(false)}
                  onSave={async (payload) => {
                    if (await run(() => assignmentService.createRule(payload), `Rule "${payload.name}" added.`)) setAdding(false);
                  }}
                />
              </div>
            ) : null}

            {rules.length === 0 && !adding ? (
              <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No rules yet. New leads go to whoever adds them.
              </p>
            ) : (
              <ol className="space-y-3">
                {rules.map((rule, i) => (
                  <li key={rule.id} className="rounded-lg border border-gray-200 p-4">
                    {editingId === rule.id ? (
                      <RuleForm
                        initial={rule}
                        users={users}
                        busy={busy}
                        onCancel={() => setEditingId(null)}
                        onSave={async (payload) => {
                          if (await run(() => assignmentService.updateRule(rule.id, payload), 'Rule saved.')) setEditingId(null);
                        }}
                      />
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">
                            {i + 1}. {rule.name}
                            {rule.enabled === false ? (
                              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Off</span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {ASSIGNMENT_STRATEGIES.find((s) => s.value === rule.strategy)?.label} between{' '}
                            {rule.assigneeIds.map((id) => userName(usersById.get(Number(id)) || { id })).join(', ')}
                            {rule.maxOpenLeads ? ` · max ${rule.maxOpenLeads} open leads each` : ''}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">{matchSummary(rule.match)}</p>
                        </div>
                        {canEdit ? (
                          <div className="flex items-center gap-1">
                            <label className="mr-2 inline-flex items-center gap-1.5 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={rule.enabled !== false}
                                onChange={(e) => run(() => assignmentService.updateRule(rule.id, { enabled: e.target.checked }))}
                                disabled={busy}
                              />
                              On
                            </label>
                            <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="Move up">
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40" onClick={() => move(i, 1)} disabled={busy || i === rules.length - 1} aria-label="Move down">
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setEditingId(rule.id)} aria-label={`Edit ${rule.name}`}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                              onClick={() => window.confirm(`Delete the rule "${rule.name}"?`) && run(() => assignmentService.removeRule(rule.id), 'Rule deleted.')}
                              aria-label={`Delete ${rule.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {canEdit && rules.length ? (
              <form onSubmit={runTest} className="rounded-lg bg-gray-50 p-4">
                <p className="mb-2 text-sm font-medium text-gray-700">Try it: who would get a lead from…</p>
                <div className="grid gap-2 md:grid-cols-5">
                  {[
                    ['city', 'City'],
                    ['state', 'State'],
                    ['zipCode', 'Pincode'],
                    ['source', 'Source'],
                    ['industry', 'Industry'],
                  ].map(([k, label]) => (
                    <input key={k} className={inputClass} placeholder={label} aria-label={label} value={test[k]} onChange={(e) => setTest((t) => ({ ...t, [k]: e.target.value }))} />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Button type="submit" variant="outline" size="sm">
                    Test rules
                  </Button>
                  {testResult !== undefined ? (
                    <span className="text-sm text-gray-700" role="status">
                      {testResult
                        ? `${userName(usersById.get(Number(testResult.userId)) || { id: testResult.userId })} (rule "${testResult.ruleName}")`
                        : 'No rule matches. The lead stays with whoever adds it.'}
                    </span>
                  ) : null}
                </div>
              </form>
            ) : null}
          </Card>

          <Card className="border border-gray-200 p-5">
            <form onSubmit={saveSla} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">First-contact SLA</h2>
                <p className="mt-1 text-sm text-gray-600">
                  A lead counts as contacted once its status moves past New or a meeting is logged with it. Missed SLAs show on the
                  dashboard and notify the owner.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" checked={sla.enabled} disabled={!canEdit} onChange={(e) => setSla((s) => ({ ...s, enabled: e.target.checked }))} />
                Track first-contact time for new leads
              </label>
              <label className="block max-w-xs text-sm">
                <span className="mb-1 block font-medium text-gray-700">Contact within (minutes)</span>
                <input
                  type="number"
                  min="5"
                  max="20160"
                  className={inputClass}
                  disabled={!canEdit || !sla.enabled}
                  value={sla.firstContactMinutes}
                  onChange={(e) => setSla((s) => ({ ...s, firstContactMinutes: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={sla.reassignOnBreach}
                  disabled={!canEdit || !sla.enabled}
                  onChange={(e) => setSla((s) => ({ ...s, reassignOnBreach: e.target.checked }))}
                />
                When missed, reassign the lead to the next person from the matching rule
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={assignment.applyToRepCreated}
                  disabled={!canEdit}
                  onChange={(e) => setAssignment({ applyToRepCreated: e.target.checked })}
                />
                Also apply rules to leads that sales reps add themselves (otherwise reps keep their own leads)
              </label>
              {canEdit ? (
                <div className="flex justify-end">
                  <Button type="submit" disabled={busy}>
                    Save SLA settings
                  </Button>
                </div>
              ) : null}
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
