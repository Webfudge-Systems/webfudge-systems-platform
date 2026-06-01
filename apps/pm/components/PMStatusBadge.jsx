'use client';

import { Badge } from '@webfudge/ui';

export const TASK_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'INTERNAL_REVIEW', label: 'In Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const PROJECT_STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const TASK_STATUS_META = {
  SCHEDULED: { variant: 'primary', label: 'To Do' },
  IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
  INTERNAL_REVIEW: { variant: 'purple', label: 'In Review' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' },
  OVERDUE: { variant: 'danger', label: 'Overdue' },
};

const PROJECT_STATUS_META = {
  PLANNING: { variant: 'primary', label: 'Planning' },
  ACTIVE: { variant: 'cyan', label: 'Active' },
  IN_PROGRESS: { variant: 'orange', label: 'In Progress' },
  ON_HOLD: { variant: 'purple', label: 'On Hold' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' },
  OVERDUE: { variant: 'danger', label: 'Overdue' },
};

const PRIORITY_META = {
  high: { variant: 'danger', label: 'High' },
  medium: { variant: 'warning', label: 'Medium' },
  low: { variant: 'success', label: 'Low' },
};

export function getTaskStatusMeta(status) {
  return TASK_STATUS_META[status] || { variant: 'default', label: status || '—' };
}

export function getProjectStatusMeta(status) {
  return PROJECT_STATUS_META[status] || { variant: 'default', label: status || '—' };
}

export function getPriorityMeta(priority) {
  return PRIORITY_META[(priority || '').toLowerCase()] || { variant: 'default', label: priority || '—' };
}

/** Light tinted fill for inline table status/priority selects (matches {@link Badge} hues). */
export const STATUS_SELECT_FILL_CLASS = {
  primary: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  orange: 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100',
  purple: 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100',
  success: 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100',
  danger: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100',
  default: 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100',
};

export const PRIORITY_SELECT_FILL_CLASS = {
  high: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100',
  medium: 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100',
  low: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
};

export function getStatusSelectFillClass(status) {
  const { variant } = getTaskStatusMeta(status);
  return STATUS_SELECT_FILL_CLASS[variant] || STATUS_SELECT_FILL_CLASS.default;
}

export function getPrioritySelectFillClass(priority) {
  return PRIORITY_SELECT_FILL_CLASS[(priority || '').toLowerCase()] || PRIORITY_SELECT_FILL_CLASS.medium;
}

/** Shared className + chevron for filled PM table selects. */
export function pmTableSelectFillProps(value, kind = 'status') {
  const fill =
    kind === 'priority' ? getPrioritySelectFillClass(value) : getStatusSelectFillClass(value);
  return {
    className: `rounded-lg py-1.5 text-xs font-semibold uppercase tracking-wide shadow-sm ${fill}`,
    chevronClassName: 'text-current opacity-60',
  };
}

export function PMStatusBadge({ status, type = 'task', className }) {
  const meta = type === 'project' ? getProjectStatusMeta(status) : getTaskStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}

export function PMPriorityBadge({ priority, className }) {
  const meta = getPriorityMeta(priority);
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}
