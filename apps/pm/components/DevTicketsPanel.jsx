'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Avatar, Button, Card, EmptyState } from '@webfudge/ui';
import { Plus, Ticket } from 'lucide-react';
import { getTaskStatusMeta } from './PMStatusBadge';
import {
  DEV_TICKET_TYPE_OPTIONS,
  devTicketsFromSubtasks,
  normalizeDevMetadata,
  optionLabel,
} from '../lib/taskDev';

function ticketKeyLabel(ticket) {
  const meta = normalizeDevMetadata(ticket?.devMetadata);
  return meta.ticketKey || `T-${ticket?.id}`;
}

export default function DevTicketsPanel({
  task,
  tickets = [],
  canEdit = false,
  saving = false,
  onAddTicket,
  onOpenTicket,
  className = '',
}) {
  const rows = useMemo(() => devTicketsFromSubtasks(tickets), [tickets]);
  const doneCount = rows.filter((t) => t.strapiStatus === 'COMPLETED').length;

  return (
    <Card variant="elevated" padding={false} className={`overflow-hidden rounded-xl ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-orange-600" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Dev tickets</h3>
            <p className="text-xs text-gray-500">
              {rows.length === 0
                ? 'Break this major task into implementation, test, and review tickets.'
                : `${doneCount} of ${rows.length} completed`}
            </p>
          </div>
        </div>
        {canEdit ? (
          <Button type="button" size="sm" onClick={onAddTicket} disabled={saving}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            Add ticket
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8">
          <EmptyState
            title="No dev tickets yet"
            description="Create tickets for backend, frontend, QA, deployment, and other work streams."
            action={
              canEdit ? (
                <Button type="button" size="sm" onClick={onAddTicket} disabled={saving}>
                  Create first ticket
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Key</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Ticket</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Assignee</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((ticket) => {
                const meta = normalizeDevMetadata(ticket.devMetadata);
                const statusMeta = getTaskStatusMeta(ticket.strapiStatus || 'SCHEDULED');
                const assignee = ticket.assignees?.[0];
                return (
                  <tr
                    key={ticket.id}
                    className="cursor-pointer transition hover:bg-orange-50/40"
                    onClick={() => onOpenTicket?.(ticket)}
                  >
                    <td className="whitespace-nowrap px-5 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                        {ticketKeyLabel(ticket)}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-3 py-3">
                      <Link
                        href={`/tasks/${ticket.id}`}
                        className="truncate font-medium text-gray-900 hover:text-orange-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ticket.name || 'Untitled ticket'}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600">
                      {optionLabel(DEV_TICKET_TYPE_OPTIONS, meta.ticketType)}
                    </td>
                    <td className="px-3 py-3">
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar
                            size="sm"
                            src={assignee.avatar}
                            fallback={assignee.initials || assignee.name?.charAt(0)}
                            alt={assignee.name}
                            className="!h-7 !w-7 text-xs"
                          />
                          <span className="truncate text-sm text-gray-700">{assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs font-medium capitalize text-violet-700">
                      {(meta.pipelineStage || 'backlog').replace(/_/g, ' ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
