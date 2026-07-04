# Task subtasks (parent / children)

## Summary

Tasks support a **parent → subtasks** hierarchy (`parent` / `subtasks` on `api::task.task`). The PM app lists **root-visible** rows (hide a child when its parent is in the same list), adds an **inline expand row** under tasks in My Tasks and project task tables, and a **Subtasks** tab on the task detail page with **Add subtask**. The Strapi task controller validates parent org scope and prevents cycles.

## Scope

| Area | Files / notes |
|------|-----------------|
| Schema | `apps/backend/src/api/task/content-types/task/schema.json` — `parent` (manyToOne self), `subtasks` (oneToMany, mappedBy `parent`) |
| API | `apps/backend/src/api/task/controllers/task.js` — `resolveParentTaskOrError` on create/update when `parent` is sent |
| PM API client | `apps/pm/lib/api/taskService.js` — `populate` for `parent` + `subtasks` (field `name`, not `title`); `normalizeTaskPayload` maps `parentId` → `parent`, strips `subtasks` from writes |
| Transformers | `apps/pm/lib/api/dataTransformers.js` — `parentId`, `parentTask`, `subtasks` / `subtaskCount` on `transformTask` |
| UI shared | `apps/pm/components/TaskSubtasksTableExtras.jsx` — toggle + expand row; `packages/ui/components/Table/Table.jsx` — optional `renderAfterRow` |
| My Tasks | `apps/pm/app/my-tasks/page.js` — `tableRootTasks`, expand state, `QuickCreateTaskModal` + `parentContext` |
| Project tasks | `apps/pm/components/ProjectTasksPanel.jsx`, `apps/pm/app/projects/[slug]/page.js` — same patterns + `onOpenCreateSubtask` |
| Task detail | `apps/pm/app/tasks/[id]/page.js` — Subtasks tab, parent link on Overview, second modal for new subtask |
| Quick create | `apps/pm/components/QuickCreateTaskModal.jsx` — `parentContext`, no recurrence block for subtasks |

## Behavior

- **List rows (All Tasks, In Progress, Overdue, project tables)**: Only **major** (root) tasks appear as top-level rows. Subtasks are hidden from the flat list and shown only when expanding a parent row.
- **My Tasks tab + dashboard My Tasks widget**: Tasks assigned to you appear as their own rows — including **subtasks** assigned to you. **Major tasks that have subtasks are hidden**; only their assigned subtasks show. Major tasks without subtasks still appear when assigned to you. Expanding a parent skips subtasks already shown as root rows (no duplicates).
- **Counts (KPI cards, tab badges, dashboard stats)**: Total / status / overdue counts use **major tasks only**, except the **My Tasks** badge which includes assigned subtasks.
- **Expand**: List-tree icon toggles a row below the task with subtask links + **Add subtask** (opens create modal with `parentId`).
- **Single assignee**: Each subtask may have **one assignee only** (parent tasks still support multiple assignees). Enforced in `TaskAssigneesPicker` (`maxAssignees={1}`), `taskService.normalizeTaskPayload`, and backend `clampSubtaskToSingleAssignee`.
- **Promote to major task**: Admins/managers can detach a subtask (`parentId: null` via `taskService.promoteSubtaskToMajorTask`) so it appears as a root task in project/My Tasks lists. Action: **Make major task** on inline subtask rows, task detail Subtasks tab, or the task header when viewing a subtask directly.
- **Backend**: Parent must exist, belong to the same organization, cannot be self, and cannot create a **cycle** when walking `parent` upward from the new parent.

Shared helpers: `apps/pm/lib/taskListUtils.js` — `isMajorTask`, `filterMajorTasks`, `filterMyTasksTableRoots`, `taskHasSubtasks`, `buildChildrenByParentId`.

## Usage / migration

- **Create subtask from UI**: Task detail → Subtasks → Add subtask; or expand a row in My Tasks / project tasks → Add subtask.
- **API create** (existing Strapi pattern): send `data: { parent: <numeric id>, ... }` or from PM client `parentId` in the object passed to `taskService.createTask` (normalized server-side).
- **Populate**: Use `populate[parent]` and `populate[subtasks]` (or nested populate) on GET; list endpoints already request lightweight subtask fields for badges.

No DB migration beyond the existing `parent` / `subtasks` relations on the Task content type.
