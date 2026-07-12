'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@webfudge/ui';
import { CheckSquare, ExternalLink, GitBranch, GitPullRequest } from 'lucide-react';
import { Card } from '@webfudge/ui';
import DevPipelineShowcase from './DevPipelineShowcase';
import DevTeamRolesPanel from './DevTeamRolesPanel';
import DevTicketsPanel from './DevTicketsPanel';
import TaskDevFormFields from './TaskDevFormFields';
import TaskDevRolePickers from './TaskDevRolePickers';
import {
  DEV_AREA_OPTIONS,
  DEV_ENVIRONMENT_OPTIONS,
  DEV_SEVERITY_OPTIONS,
  DEV_TICKET_TYPE_OPTIONS,
  DEV_WORK_TYPE_OPTIONS,
  isDevelopmentMajorTask,
  isDevelopmentTask,
  isDevTicket,
  normalizeDevMetadata,
  optionLabel,
} from '../lib/taskDev';

function DetailItem({ label, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-gray-900">{children}</div>
    </div>
  );
}

function CardEditFooter({
  canEdit,
  editing,
  saving,
  editLabel,
  onEdit,
  onSave,
  onCancel,
}) {
  if (editing) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
        <Button type="button" variant="primary" size="sm" disabled={saving} onClick={onSave}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    );
  }
  if (!canEdit) return null;
  return (
    <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 text-center">
      <button
        type="button"
        onClick={onEdit}
        className="text-sm font-semibold text-orange-600 hover:underline"
      >
        Edit {editLabel}
      </button>
    </div>
  );
}

export default function TaskDevDetailsPanel({
  task,
  users = [],
  canEdit = false,
  saving = false,
  onPipelineStageChange,
  onAddTicket,
  onOpenTicket,
  onSaveDevMetadata,
  className = '',
}) {
  const [editingSection, setEditingSection] = useState(null);
  const [devDraft, setDevDraft] = useState(null);
  const [saveError, setSaveError] = useState('');

  const cancelEdit = useCallback(() => {
    setEditingSection(null);
    setDevDraft(null);
    setSaveError('');
  }, []);

  useEffect(() => {
    cancelEdit();
  }, [task?.id, cancelEdit]);

  const openEdit = useCallback(
    (section) => {
      if (!canEdit) return;
      setDevDraft(normalizeDevMetadata(task?.devMetadata));
      setSaveError('');
      setEditingSection(section);
    },
    [canEdit, task?.devMetadata]
  );

  const saveEdit = useCallback(async () => {
    if (!devDraft || !onSaveDevMetadata) return;
    setSaveError('');
    try {
      await onSaveDevMetadata(devDraft);
      setEditingSection(null);
      setDevDraft(null);
    } catch (error) {
      setSaveError(error?.message || 'Could not save changes');
    }
  }, [devDraft, onSaveDevMetadata]);

  if (!isDevelopmentTask(task)) {
    return (
      <Card variant="elevated" className={`rounded-xl p-6 text-center ${className}`}>
        <p className="text-sm text-gray-600">
          This is a general task. Switch to Development in edit to track pipeline, team roles, and dev tickets.
        </p>
      </Card>
    );
  }

  const meta = normalizeDevMetadata(task.devMetadata);
  const criteriaDone = meta.acceptanceCriteria.filter((c) => c.done).length;
  const criteriaTotal = meta.acceptanceCriteria.length;
  const major = isDevelopmentMajorTask(task);
  const ticket = isDevTicket(task);
  const editingRoles = editingSection === 'roles';
  const editingScope = editingSection === 'scope';

  return (
    <div className={`space-y-5 ${className}`}>
      {ticket && task.parentTask ? (
        <Card variant="elevated" className="rounded-xl px-5 py-4">
          <p className="text-sm text-gray-600">
            Dev ticket under{' '}
            <Link href={`/tasks/${task.parentId}`} className="font-semibold text-orange-700 hover:underline">
              {task.parentTask.name}
            </Link>
            {meta.ticketKey ? (
              <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                {meta.ticketKey}
              </span>
            ) : null}
          </p>
        </Card>
      ) : null}

      <DevPipelineShowcase
        task={task}
        canEdit={canEdit && !editingSection}
        saving={saving}
        onStageChange={onPipelineStageChange}
      />

      <div className={`grid grid-cols-1 gap-5 ${major ? 'lg:grid-cols-3 lg:items-start' : ''}`}>
        <Card
          variant="elevated"
          padding={false}
          className={`overflow-hidden rounded-xl ${major ? 'lg:col-span-2' : ''}`}
        >
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {ticket ? 'Ticket details' : 'Development scope'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {editingScope
                ? 'Update classification, delivery links, and acceptance criteria.'
                : ticket
                  ? 'Classification and delivery links for this ticket.'
                  : 'Engineering classification, delivery links, and done criteria.'}
            </p>
          </div>

          {editingScope ? (
            <div className="space-y-4 px-6 py-5">
              <TaskDevFormFields
                value={devDraft}
                onChange={setDevDraft}
                disabled={saving}
                users={users}
                showTeamRoles={false}
                isTicket={ticket}
                embedded
              />
              {saveError && editingScope ? <p className="text-sm text-red-600">{saveError}</p> : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 border-b border-gray-100 px-6 py-5 sm:grid-cols-2">
                {ticket ? (
                  <DetailItem label="Ticket type">{optionLabel(DEV_TICKET_TYPE_OPTIONS, meta.ticketType)}</DetailItem>
                ) : (
                  <DetailItem label="Work type">{optionLabel(DEV_WORK_TYPE_OPTIONS, meta.workType)}</DetailItem>
                )}
                <DetailItem label="Area">{optionLabel(DEV_AREA_OPTIONS, meta.area)}</DetailItem>
                {!ticket && meta.workType === 'bug' && meta.severity ? (
                  <DetailItem label="Severity">{optionLabel(DEV_SEVERITY_OPTIONS, meta.severity)}</DetailItem>
                ) : null}
                <DetailItem label="Story points">{meta.storyPoints || '—'}</DetailItem>
                <DetailItem label="Estimate">{meta.estimateHours ? `${meta.estimateHours}h` : '—'}</DetailItem>
                <DetailItem label="Environment">{optionLabel(DEV_ENVIRONMENT_OPTIONS, meta.environment)}</DetailItem>
                {!ticket ? <DetailItem label="Release">{meta.releaseVersion || '—'}</DetailItem> : null}
              </div>

              <div className="grid grid-cols-1 gap-4 border-b border-gray-100 px-6 py-5 sm:grid-cols-2">
                <DetailItem label="Branch">
                  {meta.branch ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-gray-800">
                      <GitBranch className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                      {meta.branch}
                    </span>
                  ) : (
                    '—'
                  )}
                </DetailItem>
                <DetailItem label="Repository">{meta.repo || '—'}</DetailItem>
                <DetailItem label="Pull request" className="sm:col-span-2">
                  {meta.prUrl ? (
                    <a
                      href={meta.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 hover:underline"
                    >
                      <GitPullRequest className="h-3.5 w-3.5" aria-hidden />
                      Open PR
                      <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                    </a>
                  ) : (
                    '—'
                  )}
                </DetailItem>
              </div>

              {!ticket ? (
                <div className="px-6 py-5">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-orange-600" aria-hidden />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Acceptance criteria
                      {criteriaTotal > 0 ? (
                        <span className="ml-2 font-normal text-gray-500">
                          ({criteriaDone}/{criteriaTotal} done)
                        </span>
                      ) : null}
                    </h3>
                  </div>
                  {criteriaTotal === 0 ? (
                    <p className="text-sm text-gray-500">No acceptance criteria defined.</p>
                  ) : (
                    <ul className="space-y-2">
                      {meta.acceptanceCriteria.map((item) => (
                        <li
                          key={item.id}
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                            item.done
                              ? 'border-emerald-100 bg-emerald-50/80 text-emerald-950'
                              : 'border-gray-100 bg-gray-50/80 text-gray-800'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                              item.done
                                ? 'border-emerald-400 bg-emerald-500 text-white'
                                : 'border-gray-300 bg-white text-transparent'
                            }`}
                            aria-hidden
                          >
                            ✓
                          </span>
                          <span className={item.done ? 'line-through opacity-80' : ''}>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </>
          )}

          <CardEditFooter
            canEdit={canEdit && Boolean(onSaveDevMetadata)}
            editing={editingScope}
            saving={saving}
            editLabel={ticket ? 'ticket details' : 'development scope'}
            onEdit={() => openEdit('scope')}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        </Card>

        {major ? (
          <div className="flex flex-col lg:col-span-1">
            <div className="flex min-h-full flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {editingRoles ? (
                <div className="flex flex-1 flex-col space-y-4 p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Team & roles</h3>
                    <p className="mt-0.5 text-xs text-gray-500">Assign Developer, BA, QA, Tester, and Tech Lead.</p>
                  </div>
                  <TaskDevRolePickers
                    value={devDraft}
                    onChange={setDevDraft}
                    users={users}
                    disabled={saving}
                    compact
                  />
                  {saveError && editingRoles ? <p className="text-sm text-red-600">{saveError}</p> : null}
                </div>
              ) : (
                <DevTeamRolesPanel task={task} users={users} compact className="border-0" />
              )}
              <CardEditFooter
                canEdit={canEdit && Boolean(onSaveDevMetadata)}
                editing={editingRoles}
                saving={saving}
                editLabel="team & roles"
                onEdit={() => openEdit('roles')}
                onSave={saveEdit}
                onCancel={cancelEdit}
              />
            </div>
          </div>
        ) : null}
      </div>

      {major ? (
        <DevTicketsPanel
          task={task}
          tickets={task.subtasks}
          canEdit={canEdit && !editingSection}
          saving={saving}
          onAddTicket={onAddTicket}
          onOpenTicket={onOpenTicket}
        />
      ) : null}
    </div>
  );
}
