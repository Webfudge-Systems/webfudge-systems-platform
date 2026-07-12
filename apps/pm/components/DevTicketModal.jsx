'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@webfudge/ui';
import TaskAssigneesPicker from './TaskAssigneesPicker';
import { PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from './PMStatusBadge';
import {
  DEV_TICKET_TYPE_OPTIONS,
  TASK_CATEGORIES,
  buildDevTicketKey,
  devMetadataToPayload,
  normalizeDevMetadata,
} from '../lib/taskDev';

const EMPTY = {
  name: '',
  description: '',
  status: 'SCHEDULED',
  priority: 'medium',
  ticketType: 'implementation',
  assigneeUserIds: [],
};

export default function DevTicketModal({
  isOpen,
  onClose,
  onSubmit,
  parentTask,
  users = [],
  assigneeUsers = null,
  ticketIndex = 1,
  saving = false,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...EMPTY, assigneeUserIds: [] });
  }, [isOpen, parentTask?.id]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    if (!form.name.trim() || !parentTask?.id) return;
    const ticketKey = buildDevTicketKey(parentTask.id, ticketIndex);
    onSubmit?.({
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      parentId: parentTask.id,
      projectId: parentTask.projectId || null,
      taskCategory: TASK_CATEGORIES.DEVELOPMENT,
      assigneeUserIds: form.assigneeUserIds.slice(0, 1),
      devMetadata: devMetadataToPayload(
        normalizeDevMetadata({
          isDevTicket: true,
          ticketType: form.ticketType,
          ticketKey,
          pipelineStage: 'backlog',
          workType: parentTask.devMetadata?.workType || 'feature',
          area: parentTask.devMetadata?.area || 'frontend',
        })
      ),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add dev ticket"
      size="lg"
      contentClassName="space-y-5"
    >
      <p className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-sm text-violet-950">
        Ticket under{' '}
        <span className="font-semibold">{parentTask?.name || 'development task'}</span>
        {parentTask?.id ? (
          <span className="ml-1 font-mono text-xs text-violet-700">
            ({buildDevTicketKey(parentTask.id, ticketIndex)})
          </span>
        ) : null}
      </p>

      <Input
        label="Ticket title"
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        placeholder="e.g. API integration, UI checkout flow"
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Ticket type"
          value={form.ticketType}
          options={DEV_TICKET_TYPE_OPTIONS}
          onChange={(v) => update('ticketType', v)}
        />
        <Select
          label="Priority"
          value={form.priority}
          options={PRIORITY_OPTIONS}
          onChange={(v) => update('priority', v)}
        />
        <Select
          label="Status"
          value={form.status}
          options={TASK_STATUS_OPTIONS}
          onChange={(v) => update('status', v)}
        />
      </div>

      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => update('description', e.target.value)}
        rows={3}
        resize="none"
        placeholder="Scope, technical notes, or acceptance hints"
      />

      <div>
        <p className="mb-2 block text-sm font-medium text-black">Assignee</p>
        <TaskAssigneesPicker
          userIds={form.assigneeUserIds}
          users={assigneeUsers || users}
          onChange={(next) => update('assigneeUserIds', next.slice(0, 1))}
          disabled={saving}
          maxAssignees={1}
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving || !form.name.trim()}>
          {saving ? 'Creating…' : 'Create ticket'}
        </Button>
      </div>
    </Modal>
  );
}
