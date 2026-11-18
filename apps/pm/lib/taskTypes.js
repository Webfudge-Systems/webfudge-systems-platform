/** Task types (ticket W4). Stored on task.taskType; default 'task'. */
export const TASK_TYPES = {
  task: { label: 'Task', badge: 'bg-gray-100 text-gray-700' },
  bug: { label: 'Bug', badge: 'bg-red-50 text-red-700' },
  deliverable: { label: 'Deliverable', badge: 'bg-sky-50 text-sky-700' },
  milestone: { label: 'Milestone', badge: 'bg-amber-50 text-amber-800' },
};

export const TASK_TYPE_OPTIONS = Object.entries(TASK_TYPES).map(([value, { label }]) => ({ value, label }));

export function taskTypeMeta(type) {
  return TASK_TYPES[type] || TASK_TYPES.task;
}
