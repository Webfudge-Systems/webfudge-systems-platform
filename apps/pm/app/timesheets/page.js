'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Download, Lock, Plus, Send, X } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@webfudge/ui';
import PMPageHeader from '../../components/PMPageHeader';
import taskService from '../../lib/api/taskService';
import timesheetService, { addDays, downloadCsv, mondayOf, ymd } from '../../lib/api/timesheetService';

const inputClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const cellClass =
  'w-16 rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm tabular-nums focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:border-transparent disabled:bg-transparent';

const STATUS = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Submitted, waiting for approval', cls: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-800' },
  rejected: { label: 'Sent back', cls: 'bg-red-50 text-red-700' },
};
const fmtH = (h) => (Number(h) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });

function Banner({ tone = 'error', children }) {
  const cls = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <p className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

/** Rows (one per task) from the week's entries plus rows the user added. */
function buildRows(entries, extraTasks) {
  const map = new Map();
  for (const e of entries) {
    const id = e.task?.id;
    if (!id) continue;
    const row = map.get(id) || { taskId: id, name: e.task.name, project: e.project?.name || '', billable: e.billable, hours: {} };
    row.hours[e.date] = (row.hours[e.date] || 0) + e.hours;
    row.billable = e.billable;
    map.set(id, row);
  }
  for (const t of extraTasks) if (!map.has(t.id)) map.set(t.id, { taskId: t.id, name: t.name, project: t.project || '', billable: t.billable !== false, hours: {} });
  return [...map.values()];
}

function WeekTab({ initialWeek }) {
  const [weekStart, setWeekStart] = useState(initialWeek);
  const [week, setWeek] = useState(null);
  const [extra, setExtra] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pick, setPick] = useState('');
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setWeek(await timesheetService.getWeek(weekStart));
      setDrafts({});
    } catch (e) {
      setError(e?.message || 'Could not load the timesheet');
    }
  }, [weekStart]);

  useEffect(() => {
    setWeek(null);
    setExtra([]);
    load();
  }, [load]);

  useEffect(() => {
    taskService
      .getAllTasks({ pageSize: 100, sort: 'updatedAt:desc' })
      .then((r) =>
        setTasks(
          (r?.data || []).map((t) => ({
            id: t.id,
            name: t.name || t.attributes?.name,
            billable: t.billable,
            project: (t.projects || [])[0]?.name || '',
          }))
        )
      )
      .catch(() => {});
  }, []);

  const rows = useMemo(() => (week ? buildRows(week.entries, extra) : []), [week, extra]);
  const days = week?.days || [];
  const status = week?.sheet?.status || 'draft';
  const canEdit = Boolean(week?.canEdit);
  const dayTotals = days.map((d) => rows.reduce((a, r) => a + (r.hours[d] || 0), 0));
  const total = dayTotals.reduce((a, b) => a + b, 0);
  const billable = rows.filter((r) => r.billable).reduce((a, r) => a + Object.values(r.hours).reduce((x, y) => x + y, 0), 0);

  const saveCell = async (row, day) => {
    const key = `${row.taskId}|${day}`;
    if (!(key in drafts)) return;
    const raw = String(drafts[key]).trim();
    const hours = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      setError('Enter hours between 0 and 24');
      return;
    }
    if (hours === (row.hours[day] || 0)) {
      setDrafts((d) => {
        const n = { ...d };
        delete n[key];
        return n;
      });
      return;
    }
    setError('');
    try {
      const res = await timesheetService.setCell({ date: day, taskId: row.taskId, hours, billable: row.billable });
      setWeek((w) => ({ ...w, entries: res.entries, sheet: { ...w.sheet, status: w.sheet.status === 'rejected' ? 'draft' : w.sheet.status, totalHours: res.totalHours, billableHours: res.billableHours } }));
      setDrafts((d) => {
        const n = { ...d };
        delete n[key];
        return n;
      });
    } catch (e) {
      setError(e?.message || 'Could not save');
    }
  };

  const toggleBillable = async (row) => {
    if (!Object.keys(row.hours).length) {
      setExtra((x) => x.map((t) => (t.id === row.taskId ? { ...t, billable: !row.billable } : t)));
      return;
    }
    try {
      const res = await timesheetService.setRowBillable(weekStart, row.taskId, !row.billable);
      setWeek((w) => ({ ...w, entries: res.entries }));
    } catch (e) {
      setError(e?.message || 'Could not save');
    }
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    setOk('');
    try {
      await timesheetService.submit(weekStart);
      setOk('Week submitted for approval. It is locked until a manager approves or sends it back.');
      await load();
    } catch (e) {
      setError(e?.message || 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  const exportWeek = () =>
    downloadCsv(
      `timesheet_${weekStart}.csv`,
      rows,
      [
        { label: 'Task', key: 'name' },
        { label: 'Project', key: 'project' },
        { label: 'Billable', get: (r) => (r.billable ? 'Yes' : 'No') },
        ...days.map((d) => ({ label: d, get: (r) => r.hours[d] || '' })),
        { label: 'Total', get: (r) => Object.values(r.hours).reduce((a, b) => a + b, 0) },
      ]
    );

  const addRow = () => {
    const t = tasks.find((x) => String(x.id) === String(pick));
    if (t && !rows.some((r) => r.taskId === t.id)) setExtra((x) => [...x, t]);
    setPick('');
  };

  const st = STATUS[status] || STATUS.draft;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[11rem] text-center text-sm font-medium text-gray-900">
            {new Date(`${weekStart}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} –{' '}
            {new Date(`${addDays(weekStart, 6)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(ymd(mondayOf()))}>
            This week
          </Button>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>
          {status === 'approved' || status === 'submitted' ? <Lock className="h-3 w-3" aria-hidden /> : null}
          {st.label}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={exportWeek} disabled={!rows.length}>
            <Download className="mr-1 h-4 w-4" aria-hidden />
            CSV
          </Button>
          {canEdit ? (
            <Button onClick={submit} disabled={busy || !total}>
              <Send className="mr-1 h-4 w-4" aria-hidden />
              Submit week
            </Button>
          ) : null}
        </div>
      </div>

      {status === 'rejected' && week?.sheet?.decisionNote ? (
        <Banner>
          Sent back by {week.sheet.decidedBy?.name || 'your manager'}: {week.sheet.decisionNote}
        </Banner>
      ) : null}
      {error ? <Banner>{error}</Banner> : null}
      {ok ? <Banner tone="ok">{ok}</Banner> : null}

      {!week ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <Card className="overflow-x-auto border border-gray-200 p-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 font-medium">Task</th>
                <th className="px-2 py-2 font-medium">Billable</th>
                {days.map((d) => (
                  <th key={d} className="px-2 py-2 text-right font-medium">
                    {dayLabel(d)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rowTotal = Object.values(r.hours).reduce((a, b) => a + b, 0);
                return (
                  <tr key={r.taskId} className="border-b border-gray-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{r.name}</p>
                      {r.project ? <p className="text-xs text-gray-500">{r.project}</p> : null}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={r.billable}
                        disabled={!canEdit}
                        onChange={() => toggleBillable(r)}
                        aria-label={`${r.name} billable`}
                      />
                    </td>
                    {days.map((d) => {
                      const key = `${r.taskId}|${d}`;
                      const value = key in drafts ? drafts[key] : r.hours[d] ? String(r.hours[d]) : '';
                      return (
                        <td key={d} className="px-2 py-2 text-right">
                          <input
                            className={cellClass}
                            inputMode="decimal"
                            value={value}
                            disabled={!canEdit}
                            aria-label={`${r.name} ${d}`}
                            onChange={(e) => setDrafts((x) => ({ ...x, [key]: e.target.value }))}
                            onBlur={() => saveCell(r, d)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-gray-900">{fmtH(rowTotal)}</td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={days.length + 3} className="px-3 py-8 text-center text-sm text-gray-500">
                    No time this week yet. {canEdit ? 'Add a task below, or start a timer on any task.' : ''}
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium text-gray-900">
                <td className="px-3 py-2" colSpan={2}>
                  Total <span className="ml-2 text-xs font-normal text-gray-500">{fmtH(billable)} h billable</span>
                </td>
                {dayTotals.map((t, i) => (
                  <td key={days[i]} className="px-2 py-2 text-right tabular-nums">
                    {t ? fmtH(t) : ''}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{fmtH(total)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <select className={inputClass} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Add a task row">
            <option value="">Add a task…</option>
            {tasks
              .filter((t) => !rows.some((r) => r.taskId === t.id))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.project ? ` · ${t.project}` : ''}
                </option>
              ))}
          </select>
          <Button variant="outline" onClick={addRow} disabled={!pick}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Add row
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ApprovalsTab() {
  const [status, setStatus] = useState('submitted');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await timesheetService.approvals(status));
    } catch (e) {
      setRows([]);
      setError(e?.message || 'Could not load timesheets');
    }
  }, [status]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const act = async (fn, msg) => {
    setError('');
    setOk('');
    try {
      await fn();
      setOk(msg);
      setRejecting(null);
      setNote('');
      await load();
    } catch (e) {
      setError(e?.message || 'Could not save');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700" htmlFor="ts-status">
          Show
        </label>
        <select id="ts-status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="submitted">Waiting for approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Sent back</option>
          <option value="all">All</option>
        </select>
      </div>
      {error ? <Banner>{error}</Banner> : null}
      {ok ? <Banner tone="ok">{ok}</Banner> : null}
      {rows === null ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !rows.length ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Nothing here.</p>
      ) : (
        <Card className="divide-y divide-gray-100 border border-gray-200 p-0">
          {rows.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{s.user?.name}</p>
                <p className="text-xs text-gray-500">
                  Week of {new Date(`${s.weekStart}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                  {fmtH(s.totalHours)} h ({fmtH(s.billableHours)} billable)
                  {s.decisionNote ? ` · "${s.decisionNote}"` : ''}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${(STATUS[s.status] || STATUS.draft).cls}`}>{(STATUS[s.status] || STATUS.draft).label.split(',')[0]}</span>
              {s.status === 'submitted' ? (
                rejecting === s.id ? (
                  <form
                    className="flex w-full flex-wrap gap-2 md:w-auto"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(() => timesheetService.reject(s.id, note), `Sent back to ${s.user?.name}.`);
                    }}
                  >
                    <input className={`${inputClass} flex-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What needs fixing?" aria-label="Reason" required />
                    <Button type="submit" variant="outline">
                      Send back
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setRejecting(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => act(() => timesheetService.approve(s.id), `Approved ${s.user?.name}'s week.`)}>
                      <Check className="mr-1 h-4 w-4" aria-hidden />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejecting(s.id)}>
                      <X className="mr-1 h-4 w-4" aria-hidden />
                      Send back
                    </Button>
                  </div>
                )
              ) : null}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function ReportTab({ isApprover }) {
  const today = new Date();
  const [from, setFrom] = useState(ymd(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(ymd(today));
  const [groupBy, setGroupBy] = useState('client');
  const [status, setStatus] = useState('approved');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    timesheetService
      .report({ from, to, groupBy, status })
      .then((r) => setReport(r.data))
      .catch((e) => {
        setReport(null);
        setError(e?.message || 'Could not load the report');
      });
  }, [from, to, groupBy, status]);

  const label = { person: 'Person', project: 'Project', client: 'Client' }[groupBy];

  const exportEntries = async () => {
    const rows = await timesheetService.entries({ from, to, status });
    downloadCsv(`time-entries_${from}_to_${to}.csv`, rows, [
      { label: 'Date', key: 'date' },
      { label: 'Person', get: (r) => r.user?.name },
      { label: 'Client', get: (r) => r.client?.name },
      { label: 'Project', get: (r) => r.project?.name },
      { label: 'Task', get: (r) => r.task?.name },
      { label: 'Hours', key: 'hours' },
      { label: 'Billable', get: (r) => (r.billable ? 'Yes' : 'No') },
      { label: 'Status', key: 'status' },
      { label: 'Note', key: 'note' },
    ]);
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 border border-gray-200 p-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">From</span>
          <input type="date" className={inputClass} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">To</span>
          <input type="date" className={inputClass} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Group by</span>
          <select className={inputClass} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="client">Client</option>
            <option value="project">Project</option>
            <option value="person">Person</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Hours</span>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="approved">Approved only</option>
            <option value="all">All (incl. not yet approved)</option>
          </select>
        </label>
        <div className="ml-auto">
          <Button variant="outline" onClick={exportEntries}>
            <Download className="mr-1 h-4 w-4" aria-hidden />
            Export entries CSV
          </Button>
        </div>
      </Card>
      {!isApprover ? <p className="text-sm text-gray-500">Showing your own hours. Managers see the whole team.</p> : null}
      {error ? <Banner>{error}</Banner> : null}
      {report ? (
        <Card className="overflow-x-auto border border-gray-200 p-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 font-medium">{label}</th>
                <th className="px-3 py-2 text-right font-medium">Hours</th>
                <th className="px-3 py-2 text-right font-medium">Billable</th>
                <th className="px-3 py-2 text-right font-medium">Non-billable</th>
                <th className="px-3 py-2 text-right font-medium">Billable %</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.key} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-gray-900">{r.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtH(r.hours)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtH(r.billableHours)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtH(r.nonBillableHours)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.billablePct}%</td>
                </tr>
              ))}
              {!report.rows.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    {status === 'approved' ? 'No approved hours in this period.' : 'No hours in this period.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium text-gray-900">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtH(report.totals.hours)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtH(report.totals.billableHours)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtH(report.totals.nonBillableHours)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {report.totals.hours ? Math.round((report.totals.billableHours / report.totals.hours) * 100) : 0}%
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      ) : null}
    </div>
  );
}

export default function TimesheetsPage() {
  const [tab, setTab] = useState('week');
  const [initialWeek, setInitialWeek] = useState(null);
  const [isApprover, setIsApprover] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w = params.get('week');
    const t = params.get('tab');
    setInitialWeek(w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? ymd(mondayOf(new Date(`${w}T00:00:00`))) : ymd(mondayOf()));
    if (t === 'approvals' || t === 'report') setTab(t);
    timesheetService
      .getWeek(ymd(mondayOf()))
      .then((r) => setIsApprover(Boolean(r?.canApprove)))
      .catch(() => {});
  }, []);

  const tabs = [
    ['week', 'My timesheet'],
    ...(isApprover ? [['approvals', 'Approvals']] : []),
    ['report', 'Hours report'],
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Timesheets"
        subtitle="Log your week, submit it for approval, and report billable hours by client, project or person"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Timesheets', href: '/timesheets' },
        ]}
      />
      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === 'week' && initialWeek ? <WeekTab initialWeek={initialWeek} /> : null}
      {tab === 'approvals' && isApprover ? <ApprovalsTab /> : null}
      {tab === 'report' ? <ReportTab isApprover={isApprover} /> : null}
    </div>
  );
}
