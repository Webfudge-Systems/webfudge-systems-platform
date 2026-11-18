'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import PMPageHeader from '../../components/PMPageHeader';
import strapiClient from '../../lib/strapiClient';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const monthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (k) => {
  const [y, m] = String(k).slice(0, 7).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};
const STATE = {
  ok: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', label: 'On track' },
  warning: { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800', label: '80%+ used' },
  over: { bar: 'bg-red-500', chip: 'bg-red-50 text-red-700', label: 'Used up' },
};
const EMPTY = { name: '', clientAccount: '', project: '', unit: 'hours', monthlyAllowance: '', rollover: 'none', rolloverCap: '', startMonth: monthNow(), endMonth: '', accountManager: '', active: true };
const userName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || u?.email;

function RetainerForm({ initial, clients, projects, users, busy, onSave, onCancel }) {
  const [d, setD] = useState(() => ({
    ...EMPTY,
    ...(initial
      ? {
          name: initial.name,
          clientAccount: initial.client?.id || '',
          project: initial.project?.id || '',
          unit: initial.unit,
          monthlyAllowance: String(initial.monthlyAllowance),
          rollover: initial.rollover,
          rolloverCap: initial.rolloverCap == null ? '' : String(initial.rolloverCap),
          startMonth: String(initial.startMonth || '').slice(0, 7),
          endMonth: initial.endMonth ? String(initial.endMonth).slice(0, 7) : '',
          accountManager: initial.accountManager?.id || '',
          active: initial.active,
        }
      : {}),
  }));
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const clientProjects = projects.filter((p) => !d.clientAccount || String(p.clientAccount?.id ?? p.clientAccount) === String(d.clientAccount));
  return (
    <form
      className="grid gap-3 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...d,
          clientAccount: d.clientAccount || null,
          project: d.project || null,
          accountManager: d.accountManager || null,
          monthlyAllowance: Number(d.monthlyAllowance),
          rolloverCap: d.rolloverCap === '' ? null : Number(d.rolloverCap),
          endMonth: d.endMonth || null,
        });
      }}
    >
      <label className="text-sm md:col-span-2">
        <span className="mb-1 block font-medium text-gray-700">Name</span>
        <input className={inputClass} value={d.name} onChange={(e) => set('name', e.target.value)} required placeholder="Acme social media retainer" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Client</span>
        <select className={inputClass} value={d.clientAccount} onChange={(e) => setD((x) => ({ ...x, clientAccount: e.target.value, project: '' }))}>
          <option value="">Pick a client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Project (optional)</span>
        <select className={inputClass} value={d.project} onChange={(e) => set('project', e.target.value)}>
          <option value="">All the client&apos;s projects</option>
          {clientProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Measured in</span>
        <select className={inputClass} value={d.unit} onChange={(e) => set('unit', e.target.value)}>
          <option value="hours">Hours (from timesheets)</option>
          <option value="deliverables">Deliverables (completed tasks of type Deliverable)</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Per month</span>
        <input className={inputClass} value={d.monthlyAllowance} onChange={(e) => set('monthlyAllowance', e.target.value)} inputMode="decimal" required placeholder={d.unit === 'hours' ? '40' : '12'} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Unused balance</span>
        <select className={inputClass} value={d.rollover} onChange={(e) => set('rollover', e.target.value)}>
          <option value="none">Expires each month</option>
          <option value="carry_forward">Rolls over to next month</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Max rollover</span>
        <input className={inputClass} value={d.rolloverCap} onChange={(e) => set('rolloverCap', e.target.value)} inputMode="decimal" placeholder="One month" disabled={d.rollover !== 'carry_forward'} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Starts</span>
        <input type="month" className={inputClass} value={d.startMonth} onChange={(e) => set('startMonth', e.target.value)} required />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Ends (optional)</span>
        <input type="month" className={inputClass} value={d.endMonth} onChange={(e) => set('endMonth', e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Account manager (gets alerts)</span>
        <select className={inputClass} value={d.accountManager} onChange={(e) => set('accountManager', e.target.value)}>
          <option value="">Nobody</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {userName(u)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
        <input type="checkbox" checked={d.active} onChange={(e) => set('active', e.target.checked)} />
        Active
      </label>
      <div className="flex items-end justify-end gap-2 md:col-span-4">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || !d.name.trim() || (!d.clientAccount && !d.project)}>
          {initial ? 'Save' : 'Add retainer'}
        </Button>
      </div>
    </form>
  );
}

export default function RetainersPage() {
  const [month, setMonth] = useState(monthNow());
  const [rows, setRows] = useState(null);
  const [manager, setManager] = useState(false);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await strapiClient.get('/retainers', { month });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setManager(Boolean(res?.meta?.manager));
    } catch (e) {
      setRows([]);
      setMessage({ tone: 'error', text: e?.message || 'Could not load retainers' });
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!manager) return;
    Promise.all([
      strapiClient.get('/client-accounts', { 'pagination[pageSize]': 200 }).catch(() => ({ data: [] })),
      strapiClient.get('/projects', { 'pagination[pageSize]': 200, 'populate[clientAccount][fields][0]': 'id' }).catch(() => ({ data: [] })),
      strapiClient.getXtrawrkxUsers({ pageSize: 200 }).catch(() => ({ data: [] })),
    ]).then(([c, p, u]) => {
      setClients(Array.isArray(c?.data) ? c.data : []);
      setProjects(Array.isArray(p?.data) ? p.data : []);
      setUsers(Array.isArray(u?.data) ? u.data : []);
    });
  }, [manager]);

  const run = async (fn, okText) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      if (okText) setMessage({ tone: 'ok', text: okText });
      await load();
      return true;
    } catch (e) {
      setMessage({ tone: 'error', text: e?.message || 'Could not save' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggleHistory = async (id) => {
    if (history[id]) return setHistory((h) => ({ ...h, [id]: null }));
    const res = await strapiClient.get(`/retainers/${id}/history`, { months: 6 }).catch(() => null);
    setHistory((h) => ({ ...h, [id]: res?.data?.months || [] }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Retainers"
        subtitle="Monthly client retainers: hours or deliverables used vs contracted. Account managers are alerted at 80% and 100%."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Retainers', href: '/retainers' },
        ]}
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Month</span>
          <input type="month" className={inputClass} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
        {manager && !adding ? (
          <Button className="ml-auto" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            New retainer
          </Button>
        ) : null}
      </div>
      {message ? (
        <p
          className={`rounded-lg border px-4 py-2.5 text-sm ${message.tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}
      {adding ? (
        <Card className="border border-orange-200 bg-orange-50/40 p-4">
          <RetainerForm
            clients={clients}
            projects={projects}
            users={users}
            busy={busy}
            onCancel={() => setAdding(false)}
            onSave={async (d) => {
              if (await run(() => strapiClient.post('/retainers', { data: d }), `Retainer "${d.name}" added.`)) setAdding(false);
            }}
          />
        </Card>
      ) : null}

      {rows === null ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !rows.length ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          {manager ? 'No retainers yet. Add one to track a client’s monthly hours or deliverables.' : 'No retainers are assigned to you.'}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => {
            const s = r.status;
            const st = s ? STATE[s.state] : null;
            const unit = r.unit === 'hours' ? 'h' : r.unit === 'deliverables' ? ' deliverables' : '';
            return (
              <Card key={r.id} className={`space-y-3 border p-5 ${r.active ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-70'}`}>
                {editing === r.id ? (
                  <RetainerForm
                    initial={r}
                    clients={clients}
                    projects={projects}
                    users={users}
                    busy={busy}
                    onCancel={() => setEditing(null)}
                    onSave={async (d) => {
                      if (await run(() => strapiClient.put(`/retainers/${r.id}`, { data: d }), 'Saved.')) setEditing(null);
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-gray-900">{r.name}</h2>
                        <p className="text-xs text-gray-500">
                          {[r.client?.name, r.project?.name].filter(Boolean).join(' · ')} · {r.monthlyAllowance}
                          {unit}/month{r.rollover === 'carry_forward' ? ' · rolls over' : ''}
                          {r.accountManager ? ` · AM: ${r.accountManager.name}` : ''}
                        </p>
                      </div>
                      {st ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${st.chip}`}>{st.label}</span> : <span className="text-xs text-gray-400">Not active this month</span>}
                    </div>
                    {s ? (
                      <>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-semibold tabular-nums text-gray-900">
                            {s.used}
                            {unit} of {s.available}
                            {unit}
                          </span>
                          <span className="text-gray-500">{s.pct}%</span>
                        </div>
                        <div className="relative h-2.5 rounded-full bg-gray-100">
                          <div className={`h-2.5 rounded-full ${st.bar}`} style={{ width: `${Math.min(100, s.pct)}%` }} />
                          <div className="absolute -top-0.5 h-3.5 w-0.5 bg-gray-400" style={{ left: '80%' }} title="80% alert" />
                        </div>
                        <p className="text-xs text-gray-500">
                          {s.remaining >= 0 ? `${s.remaining}${unit} left` : `${Math.abs(s.remaining)}${unit} over`}
                          {s.carried ? ` · includes ${s.carried}${unit} rolled over` : ''}
                          {r.unit === 'hours' ? ` · ${s.approved}h approved in timesheets` : ''}
                        </p>
                      </>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="text-sm font-medium text-orange-600 hover:text-orange-700" onClick={() => toggleHistory(r.id)}>
                        {history[r.id] ? 'Hide history' : 'Last 6 months'}
                      </button>
                      {manager ? (
                        <div className="ml-auto flex gap-1">
                          <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setEditing(r.id)} aria-label={`Edit ${r.name}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 text-red-500 hover:bg-red-50"
                            onClick={() => window.confirm(`Delete the retainer "${r.name}"?`) && run(() => strapiClient.delete(`/retainers/${r.id}`), 'Retainer deleted.')}
                            aria-label={`Delete ${r.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {history[r.id] ? (
                      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
                        {history[r.id].map((m) => (
                          <li key={m.month} className="flex items-center justify-between px-3 py-1.5">
                            <span className="text-gray-700">{monthLabel(m.month)}</span>
                            <span className={`tabular-nums ${m.state === 'over' ? 'text-red-600' : m.state === 'warning' ? 'text-amber-700' : 'text-gray-700'}`}>
                              {m.used}/{m.available}
                              {unit} ({m.pct}%)
                            </span>
                          </li>
                        ))}
                        {!history[r.id].length ? <li className="px-3 py-2 text-gray-500">No months yet.</li> : null}
                      </ul>
                    ) : null}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
