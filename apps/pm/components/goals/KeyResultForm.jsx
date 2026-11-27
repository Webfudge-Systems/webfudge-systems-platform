'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@webfudge/ui';
import taskService from '../../lib/api/taskService';
import { inputClass, userName } from './goalUi';

const STATUS_LABEL = { SCHEDULED: 'To do', ACTIVE: 'Active', IN_PROGRESS: 'In progress', INTERNAL_REVIEW: 'In review', ON_HOLD: 'On hold', COMPLETED: 'Done', CANCELLED: 'Cancelled', OVERDUE: 'Overdue' };

/**
 * Create / edit a key result. Task-based key results link whole projects (all their top-level tasks
 * count) and / or individual tasks; progress then follows those tasks automatically.
 */
export default function KeyResultForm({ initial, users, projects, busy, onSave, onCancel }) {
  const [d, setD] = useState(() => ({
    title: initial?.title || '',
    metricType: initial?.metricType || 'number',
    startValue: initial ? String(initial.startValue ?? 0) : '0',
    targetValue: initial ? String(initial.targetValue ?? 100) : '',
    unit: initial?.metricType === 'percent' ? '' : initial?.unit || '',
    ownerId: initial?.owner?.id ? String(initial.owner.id) : '',
    projectIds: (initial?.projects || []).map((p) => p.id),
    tasks: initial?.tasks || [],
  }));
  const [pickProject, setPickProject] = useState('');
  const [projectTasks, setProjectTasks] = useState(null);
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!pickProject) return setProjectTasks(null);
    let live = true;
    setProjectTasks(undefined);
    taskService.getTasksByProject(pickProject, { pageSize: 200, sort: 'name:asc' }).then((res) => {
      if (!live) return;
      const rows = Array.isArray(res?.data) ? res.data : [];
      setProjectTasks(rows.map((t) => ({ id: t.id, name: t.name || t.attributes?.name, status: t.status || t.attributes?.status })));
    });
    return () => {
      live = false;
    };
  }, [pickProject]);

  const taskIds = useMemo(() => new Set(d.tasks.map((t) => t.id)), [d.tasks]);
  const toggleTask = (t) => set('tasks', taskIds.has(t.id) ? d.tasks.filter((x) => x.id !== t.id) : [...d.tasks, t]);
  const toggleProject = (id) => set('projectIds', d.projectIds.includes(id) ? d.projectIds.filter((x) => x !== id) : [...d.projectIds, id]);

  const isTasks = d.metricType === 'tasks';
  const valid = d.title.trim() && (isTasks || (d.targetValue !== '' && Number.isFinite(Number(d.targetValue))));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const payload = { title: d.title, metricType: d.metricType, ownerId: d.ownerId ? Number(d.ownerId) : null };
        if (isTasks) {
          payload.projectIds = d.projectIds;
          payload.taskIds = d.tasks.map((t) => t.id);
        } else {
          payload.startValue = Number(d.startValue || 0);
          payload.targetValue = Number(d.targetValue);
          payload.unit = d.metricType === 'percent' ? '%' : d.unit;
        }
        onSave(payload);
      }}
    >
      <div className="grid gap-3 md:grid-cols-6">
        <label className="text-sm md:col-span-3">
          <span className="mb-1 block font-medium text-gray-700">Key result</span>
          <input className={inputClass} value={d.title} onChange={(e) => set('title', e.target.value)} required placeholder="Reach 200 newsletter signups" />
        </label>
        <label className="text-sm md:col-span-1">
          <span className="mb-1 block font-medium text-gray-700">Measured by</span>
          <select className={inputClass} value={d.metricType} onChange={(e) => set('metricType', e.target.value)} disabled={!!initial}>
            <option value="number">Number</option>
            <option value="percent">Percent</option>
            <option value="tasks">Linked tasks</option>
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-gray-700">Owner</span>
          <select className={inputClass} value={d.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
            <option value="">Objective owner</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userName(u)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isTasks ? (
        <div className="grid gap-3 md:grid-cols-6">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">Start value</span>
            <input className={inputClass} value={d.startValue} onChange={(e) => set('startValue', e.target.value)} inputMode="decimal" />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">Target</span>
            <input className={inputClass} value={d.targetValue} onChange={(e) => set('targetValue', e.target.value)} inputMode="decimal" required placeholder={d.metricType === 'percent' ? '100' : '200'} />
          </label>
          {d.metricType === 'number' ? (
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">Unit (optional)</span>
              <input className={inputClass} value={d.unit} onChange={(e) => set('unit', e.target.value)} placeholder="signups" />
            </label>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-sm font-medium text-gray-700">Whole projects</legend>
            <p className="mb-2 text-xs text-gray-500">Every top-level task in these projects counts, including tasks added later.</p>
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {projects.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" checked={d.projectIds.includes(p.id)} onChange={() => toggleProject(p.id)} />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
              {!projects.length ? <p className="text-xs text-gray-400">No projects you can see.</p> : null}
            </div>
          </fieldset>
          <fieldset className="rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-sm font-medium text-gray-700">Individual tasks</legend>
            <select className={`${inputClass} mb-2`} value={pickProject} onChange={(e) => setPickProject(e.target.value)} aria-label="Pick tasks from project">
              <option value="">Pick tasks from a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {projectTasks === undefined ? <p className="text-xs text-gray-400">Loading tasks…</p> : null}
              {(projectTasks || []).map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" checked={taskIds.has(t.id)} onChange={() => toggleTask(t)} />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <span className="text-xs text-gray-400">{STATUS_LABEL[t.status] || t.status}</span>
                </label>
              ))}
              {projectTasks && !projectTasks.length ? <p className="text-xs text-gray-400">No tasks in this project.</p> : null}
            </div>
            {d.tasks.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2">
                {d.tasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTask(t)}
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-800 hover:bg-orange-100"
                    aria-label={`Unlink ${t.name}`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </fieldset>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || !valid}>
          {initial ? 'Save key result' : 'Add key result'}
        </Button>
      </div>
    </form>
  );
}
