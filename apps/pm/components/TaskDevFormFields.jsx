'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@webfudge/ui';
import {
  DEV_AREA_OPTIONS,
  DEV_ENVIRONMENT_OPTIONS,
  DEV_SEVERITY_OPTIONS,
  DEV_TICKET_TYPE_OPTIONS,
  DEV_WORK_TYPE_OPTIONS,
  newAcceptanceCriterion,
  normalizeDevMetadata,
} from '../lib/taskDev';
import TaskDevRolePickers from './TaskDevRolePickers';

export default function TaskDevFormFields({
  value,
  onChange,
  disabled = false,
  showTeamRoles = true,
  isTicket = false,
  users = [],
  embedded = false,
}) {
  const meta = normalizeDevMetadata(value);

  const patch = (partial) => {
    onChange?.({ ...meta, ...partial });
  };

  const updateCriterion = (id, partial) => {
    patch({
      acceptanceCriteria: meta.acceptanceCriteria.map((item) =>
        item.id === id ? { ...item, ...partial } : item
      ),
    });
  };

  const addCriterion = () => {
    patch({
      acceptanceCriteria: [...meta.acceptanceCriteria, newAcceptanceCriterion()],
    });
  };

  const removeCriterion = (id) => {
    patch({
      acceptanceCriteria: meta.acceptanceCriteria.filter((item) => item.id !== id),
    });
  };

  const fields = (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isTicket ? (
          <Select
            label="Ticket type"
            value={meta.ticketType}
            options={DEV_TICKET_TYPE_OPTIONS}
            onChange={(v) => patch({ ticketType: v })}
            disabled={disabled}
          />
        ) : (
          <Select
            label="Work type"
            value={meta.workType}
            options={DEV_WORK_TYPE_OPTIONS}
            onChange={(v) => patch({ workType: v })}
            disabled={disabled}
          />
        )}
        <Select
          label="Area"
          value={meta.area}
          options={DEV_AREA_OPTIONS}
          onChange={(v) => patch({ area: v })}
          disabled={disabled}
        />
        {meta.workType === 'bug' ? (
          <Select
            label="Severity"
            value={meta.severity}
            options={DEV_SEVERITY_OPTIONS}
            onChange={(v) => patch({ severity: v })}
            disabled={disabled}
          />
        ) : null}
        <Input
          label="Story points"
          type="number"
          min={0}
          step={0.5}
          value={meta.storyPoints}
          onChange={(e) => patch({ storyPoints: e.target.value })}
          disabled={disabled}
          placeholder="e.g. 3"
        />
        <Input
          label="Estimate (hours)"
          type="number"
          min={0}
          step={0.5}
          value={meta.estimateHours}
          onChange={(e) => patch({ estimateHours: e.target.value })}
          disabled={disabled}
          placeholder="e.g. 8"
        />
        <Input
          label="Branch"
          value={meta.branch}
          onChange={(e) => patch({ branch: e.target.value })}
          disabled={disabled}
          placeholder="feat/checkout-api"
        />
        <Input
          label="PR / MR URL"
          type="url"
          value={meta.prUrl}
          onChange={(e) => patch({ prUrl: e.target.value })}
          disabled={disabled}
          placeholder="https://github.com/…/pull/42"
        />
        <Input
          label="Repository"
          value={meta.repo}
          onChange={(e) => patch({ repo: e.target.value })}
          disabled={disabled}
          placeholder="webfudge-platform"
        />
        <Select
          label="Environment"
          value={meta.environment}
          options={DEV_ENVIRONMENT_OPTIONS}
          onChange={(v) => patch({ environment: v })}
          disabled={disabled}
        />
        {!isTicket ? (
          <Input
            label="Release version"
            value={meta.releaseVersion}
            onChange={(e) => patch({ releaseVersion: e.target.value })}
            disabled={disabled}
            placeholder="v2.4.0"
          />
        ) : null}
      </div>

      {showTeamRoles && !isTicket ? (
        <TaskDevRolePickers value={meta} onChange={onChange} users={users} disabled={disabled} />
      ) : null}

      {!isTicket ? (
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-black">Acceptance criteria</p>
          <Button type="button" variant="outline" size="sm" onClick={addCriterion} disabled={disabled}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            Add
          </Button>
        </div>
        {meta.acceptanceCriteria.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-3 text-xs text-gray-500">
            No criteria yet. Add items that define when this task is done.
          </p>
        ) : (
          <ul className="space-y-2">
            {meta.acceptanceCriteria.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-2.5 h-4 w-4 shrink-0 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  checked={Boolean(item.done)}
                  onChange={(e) => updateCriterion(item.id, { done: e.target.checked })}
                  disabled={disabled}
                  aria-label="Criterion done"
                />
                <Input
                  value={item.text}
                  onChange={(e) => updateCriterion(item.id, { text: e.target.value })}
                  disabled={disabled}
                  placeholder="Criterion description"
                  containerClassName="flex-1 !mb-0"
                />
                <button
                  type="button"
                  onClick={() => removeCriterion(item.id)}
                  disabled={disabled}
                  className="mt-1 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="Remove criterion"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{fields}</div>;
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Development details</h3>
        <p className="mt-0.5 text-xs text-gray-500">Classification, delivery links, and acceptance criteria.</p>
      </div>
      {fields}
    </section>
  );
}
