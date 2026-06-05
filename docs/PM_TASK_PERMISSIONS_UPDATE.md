# PM Task Permissions Update

## Summary

Fixed task creation and assignee rules so project-scoped membership drives who can be assigned, org **Members** can create subtasks on tasks they are assigned to, and assigning admins/managers on the project team no longer fails with a misleading 403.

## Scope

- **Backend**: `apps/backend/src/api/task/controllers/task.js`
- **PM app**: `pmOrgRoles.js`, `taskService.js`, `QuickCreateTaskModal.jsx`, project detail, task detail, my-tasks, `ProjectTasksPanel`, `TaskSubtasksTableExtras`

## Behavior

| Actor | Create project task | Create subtask | Assignee picker | Assign to higher org role on project team |
|--------|---------------------|----------------|-----------------|-------------------------------------------|
| Org Admin | Yes (any project) | Yes | Project team only when project selected | Yes, immediate |
| Org Manager | Yes (any project) | Yes | Project team only when project selected | Yes, immediate |
| Org Member on project team | Yes (pending approval) | Yes if assignee on parent | Project team only | Yes, pending approval |
| Org Member (task assignee only) | No | Yes on that parent task | Parent’s project team | Yes, pending approval |
| Org Member (task reporter only) | No | No | — | Full edit + delete own created tasks |

### Assignee list

- Task create/edit modals show **only project team members** (assignees + project manager) when a project is selected or locked.
- Org role does not filter the list — admins and managers on the project team appear like any other teammate.

### Member task creation

- Members may assign anyone on the **project team**, including users with a higher organization role. Assignments stay **pending** until an admin or manager approves (unchanged approval flow).
- Backend validates assignees are on the project team (`400` if not). Project membership for create is checked separately (`403` only when the creator is not on the team and not an assignee on the parent for subtasks).

### Subtasks

- Members who are assignee or collaborator on a parent task may add subtasks (project page, my-tasks inline row, task detail).
- Parent task’s projects are inherited on the server when the client omits `projects`.

### Admins

- Org admins continue to bypass member row-level restrictions on create/delete/update (existing `isPmOrgAdminRole` behavior).

## Migration / deploy

Restart Strapi after deploying backend changes. No schema migration required.
