# PM: Reporter Label & Project Manager Display

## Summary

Two cosmetic/UX improvements to the PM task views:

1. The "Assigner" field has been renamed to **Reporter** throughout the frontend UI.
2. The **Project Manager** of the project a task belongs to is now visible on every task.

## Scope

- `apps/pm/lib/api/taskService.js`
- `apps/pm/lib/api/dataTransformers.js`
- `apps/pm/lib/tableSortColumns.js`
- `apps/pm/components/TaskDetailsCard.jsx`
- `apps/pm/components/QuickCreateTaskModal.jsx`
- `apps/pm/components/ProjectTasksPanel.jsx`
- `apps/pm/components/TaskSubtasksTableExtras.jsx`
- `apps/pm/app/tasks/[id]/page.js`
- `apps/pm/app/my-tasks/page.js`

## Details

### Assigner → Reporter

All visible labels that previously said "Assigner" or "ASSIGNER" now read "Reporter" / "REPORTER". Internal code variables (`assignerId`, `assignerName`, `assigner`, etc.) and the backend Strapi field name (`assigner`) remain unchanged — only the display labels were updated.

Affected surfaces:
- Quick Create Task modal label
- Task Details Card edit form and read view
- My Tasks table column header and toggleable column list
- Project Tasks Panel table column header
- Subtasks table column header
- Task Detail page activity summary sidebar
- Task Detail page subtask table column header
- Sort column labels

### Project Manager Display

The project manager of the primary project associated with a task is now fetched, transformed, and exposed on every task object as `projectManager`, `projectManagerId`, and `projectManagerName`.

**API layer (`taskService.js`):** All task fetch queries now include `populate[projects][populate][projectManager]=*`.

**Backend (`task/controllers/task.js`):** `buildTaskPopulateConfig` now deep-populates `projects.projectManager` instead of `projects: true`, which previously dropped the nested owner relation.

**Frontend fallback (`taskListUtils.js`):** `enrichTaskWithProjectManager` / `enrichTasksWithProjectManager` resolve the PM from the loaded projects list when the task payload omitted it (task detail, My Tasks, project detail).

**Data transformer (`dataTransformers.js`):** `transformTask` now extracts `projectManager` from the first project in the list and adds `projectManager`, `projectManagerId`, and `projectManagerName` to the task model. Subtasks also inherit the parent project's manager.

**UI surfaces:**
- **Task Details Card** (`TaskDetailsCard.jsx`): A new "Project Manager" `GridRow` is rendered beneath the Project cell, showing the PM's avatar, name, and email (read-only).
- **Task Detail page** (`tasks/[id]/page.js`): The Activity tab's summary sidebar now includes a "Project Manager" row. The subtask table also gains a "PROJECT MANAGER" column.
- **My Tasks / Project Tasks / Subtasks tables**: Columns remain focused on Reporter — the project manager is visible in the detail card instead of cluttering the list view.

## Migration Notes

No database or API schema changes are required. The project manager data was already stored on the project entity; this update simply ensures it is populated and forwarded to the frontend for task views.
