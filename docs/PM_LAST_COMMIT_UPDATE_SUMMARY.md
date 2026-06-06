# PM Update — Cross-Suite Sync Guide

> **Audience:** `greenway-suite`, `xtrawrkx-suite`, and any fork that mirrors Webfudge PM.  
> **Purpose:** Single reference so humans and **Cursor** can port the same PM changes into another codebase.  
> **Source of truth:** `webfudge-platform` — base commit `5a36f712` (5 Jun 2026) + follow-ups (same day): **Reporter edit/delete**, **task list pagination / tab counts**, **task create “vanished tasks” fix** (visibility + merge-on-save + table UI pagination), **assigner backfill script**.

---

## Quick runbook — `greenway-suite` & `xtrawrkx-suite`

Use this when **porting** or **re-deploying** PM from `webfudge-platform` into either suite.

### 1. Copy the guide

- Copy **`docs/PM_LAST_COMMIT_UPDATE_SUMMARY.md`** into the target repo (same path recommended).
- Or paste the **Cursor prompt** below into the target repo chat.

### 2. Port order (always)

```
Backend (Strapi)  →  restart API  →  PM frontend  →  smoke-test  →  production deploy
```

| Step | `greenway-suite` / `xtrawrkx-suite` action |
|------|---------------------------------------------|
| **A. Backend** | Port `task/controllers/task.js` visibility (`assigner` in `$or`), reporter gates, populate, create defaults — plus any earlier sections you have not shipped yet (privacy, permissions, etc.) |
| **B. Restart** | Restart Strapi / Railway API service after backend deploy |
| **C. PM lib** | Port `taskListUtils.js` (**include `mergeTasksById`**), `taskService.js` (**`paginateTaskApi`**, **`fetchAllTasks*`**, assigner stream in **`fetchPMTasksByAssignee`**), `pmOrgRoles.js` |
| **D. PM pages** | Port `my-tasks/page.js`, `app/page.js`, `projects/[slug]/page.js` — **`loadTasks({ mergeWithPrevious: true })`** after create; **`TABLE_PAGE_SIZE = 12`** table pagination |
| **E. PM components** | Port `ProjectTasksPanel.jsx` tab badges + table pagination |
| **F. Path mapping** | Match by **responsibility**, not exact path — see §5 (e.g. `apps/pm` vs `xtrawrkx-pm-dashboard` vs `packages/pm`) |

### 3. Production deploy checklist (both suites)

1. Deploy **backend** + **restart** Strapi.
2. Deploy **PM frontend** (Vercel / host).
3. Hard-refresh My Tasks; confirm **All Tasks** count increments on create (no swap).
4. Check **page 2** of the task table (12 rows per page — older tasks may be there).
5. Optional data fix — only if reporters missing (see **§4.1 Production recovery**).

### 4. Optional — assigner backfill (production Postgres)

Only when tasks exist in DB but Members still cannot see tasks they created:

```bash
cd apps/backend
# Point at production Postgres (do NOT use local SQLite accidentally)
set DATABASE_CLIENT=postgres
set DATABASE_URL=postgresql://...

npm run backfill:task-assigners:dry-run
npm run backfill:task-assigners
```

Or run in Railway Postgres **one statement at a time**:

```sql
INSERT INTO tasks_assigner_lnk (task_id, user_id)
SELECT t.id, asg.user_id
FROM tasks t
JOIN tasks_assignee_lnk asg ON asg.task_id = t.id
LEFT JOIN tasks_assigner_lnk asn ON asn.task_id = t.id
WHERE asn.task_id IS NULL AND asg.user_id IS NOT NULL;
```

**Important:** target table is **`tasks_assigner_lnk`** (Reporter), not `tasks_assignee_lnk`.

Script location: `apps/backend/scripts/backfill-task-assigners.js`  
NPM: `backfill:task-assigners`, `backfill:task-assigners:dry-run`

---

## How to use this doc (Cursor / developers)

1. Open the **target suite** repo (`greenway-suite` or `xtrawrkx-suite`).
2. Work **backend first**, then **PM frontend** — order matters for schema and API gates.
3. For each section below, use the **Sync checklist** and **File mapping** to find equivalent paths in the target repo (paths may differ; match by module/responsibility).
4. Replace blanket `isPmMember` / `memberScopedTasks` UI gates with `canEditTaskInPm` / `canDeleteTaskInPm` from `pmOrgRoles.js`.
5. After each section, run the **Verification** steps at the bottom.
6. **Do not** rename Strapi field `assigner` — only UI labels become **Reporter**.

### Suggested Cursor prompt (paste into target repo)

```
Read docs/PM_LAST_COMMIT_UPDATE_SUMMARY.md (or this file if copied over).
Port all PM changes from webfudge-platform into this repo:
1) project isPrivate + rbac helpers
2) task controller permission refactor
3) pmOrgRoles.js helpers including isTaskReporter
4) taskListUtils.js
5) Reporter label + Project Manager on tasks
6) subtask promote + single assignee
7) replace isPmMember gates with canEditTaskInPm/canDeleteTaskInPm
8) task list pagination — fetchAllTasks* helpers + major-task tab badges
9) task create vanish fix — backend assigner visibility; mergeTasksById + mergeWithPrevious on save; paginateTaskApi partial-page loop; TABLE_PAGE_SIZE 12 table UI; assigner stream in fetchPMTasksByAssignee
Match existing code style. Backend before frontend. List files changed when done.
```

---

## Change overview

| # | Feature | Backend | PM frontend | Breaking? |
|---|---------|---------|-------------|-----------|
| 1 | Private projects (`isPrivate`) | Schema + controllers + `rbac.js` | Add/edit forms, list lock, meta badge | No — default `false` |
| 2 | Task permissions (team-scoped assignees) | `task.js` create/update validation | `pmOrgRoles.js`, modals, tables | No |
| 3 | Reporter edit + delete (Member) | `task.js` update + delete gates | `isTaskReporter`, `canEdit/DeleteTaskInPm` | No — expands Member access |
| 4 | Assigner → Reporter (UI labels only) | — | Tables, modals, detail, sort labels | No |
| 5 | Project Manager on task rows | `buildTaskPopulateConfig` | `taskService`, `dataTransformers`, `taskListUtils` | No |
| 6 | Subtasks: single assignee, promote to major | `clampSubtaskToSingleAssignee` | `promoteSubtaskToMajorTask`, modals | No |
| 7 | Major-task list filtering | — | `taskListUtils`, dashboard, My Tasks | No |
| 8 | Task list pagination & tab counts | — (uses existing `GET /tasks` pagination) | `taskService` fetch helpers, My Tasks, dashboard, project Tasks tab | No |
| 9 | Task create “vanished tasks” fix | `assigner` in list `$or`; `userMayViewTask` reporter check | `mergeTasksById`, merge-on-save reload, table 12/page, `paginateTaskApi` loop fix | No |

---

## 1. Private projects (`isPrivate`)

### Behavior

| Org role | Public project | Private project |
|----------|----------------|-----------------|
| **Admin** | See + edit all | See + edit all |
| **Manager** | See all; edit only if assigned PM | Hidden unless on team; edit only if assigned PM |
| **Member** | Only if on project team | Only if on project team |

### Sync checklist — backend

- [ ] Add to **project schema** (`schema.json`):

```json
"isPrivate": {
  "type": "boolean",
  "default": false
}
```

- [ ] In **`rbac.js`**, add and export:
  - `projectIsPrivate(project)`
  - `buildProjectListFiltersForUser(ctx, orgId, userId)` — Manager: public OR on team; Member: on team only; Admin: org filter only
  - `userCanViewProjectRow(ctx, project, userId)` — Manager may view public projects without being on team
- [ ] **Project controller** `find`: use `buildProjectListFiltersForUser` instead of hard-coded member `$or`
- [ ] **Project controller** `findOne` + `summary`: gate with `userCanViewProjectRow` for non-admins (not only members)
- [ ] **Task controller**: replace `projectIdsForMember` → `projectIdsVisibleToUser`; replace `memberMayViewTask` → `userMayViewTask` (pass `ctx` for role-aware private checks)
- [ ] Regenerate Strapi types if the target repo uses `contentTypes.d.ts`
- [ ] Restart Strapi after deploy

### Sync checklist — PM frontend

- [ ] `pmOrgRoles.js`: `canToggleProjectPrivacy()` — admin only
- [ ] `dataTransformers.js` `transformProject`: map `isPrivate`
- [ ] `projects/add/page.js` + `projects/[slug]/edit/page.js`: admin-only **Private project** checkbox; send `isPrivate` on create/update
- [ ] `projects/page.js`: `Lock` icon next to name when `row.isPrivate`
- [ ] `ProjectDetailMetaBar.jsx`: **Private** badge with lock icon

---

## 2. Task permissions & assignment rules

### Member task access matrix (current rules)

| Member relationship to task | Full edit | Status only | Delete |
|---------------------------|-----------|-------------|--------|
| Assignee or collaborator | Yes | — | No |
| **Reporter** (creator / `assigner`) | **Yes** | — | **Yes (own tasks only)** |
| Visible but none of above | No | Yes | No |

Admin/Manager: full edit + delete on visible tasks (unchanged).

### Create / assign behavior

| Actor | Create project task | Create subtask | Assignee picker | Assign admin/manager on team |
|--------|---------------------|----------------|----------------|------------------------------|
| Org Admin | Yes | Yes | Project team when project selected | Yes, immediate |
| Org Manager | Yes | Yes | Project team when project selected | Yes, immediate |
| Member on project team | Yes (pending approval) | Yes if assignee on parent | Project team only | Yes, pending approval |
| Member (parent assignee only) | No | Yes on parent | Parent project team | Yes, pending approval |
| Member (reporter only) | — | No | — | Full edit + delete own created tasks |

### Sync checklist — backend (`task/controllers/task.js`)

- [ ] `userIsTaskAssigneeOrCollaborator(task, userId)`
- [ ] **`userIsTaskReporter(task, userId)`** — `assignerPkFromEntity(task) === userId`
- [ ] `memberMayCreateTask` — project team OR subtask on assigned parent; inherit parent `projects` when omitted
- [ ] `assertAssigneesOnProjectTeams` — return `400` if assignee not on project team (not `403`)
- [ ] `resolveProjectIdsFromProjectsInput` — resolve `documentId` + numeric ids
- [ ] `clampSubtaskToSingleAssignee` — subtasks max one assignee
- [ ] **`update`**: Member full edit if `userIsTaskAssigneeOrCollaborator` **OR** `userIsTaskReporter`; else whitelist `MEMBER_TASK_UPDATE_FIELDS` (`status` only)
- [ ] **`delete`**: require `write` (not `manage`); non-admin view gate via `userMayViewTask`; Member delete only if `userIsTaskReporter`; populate `assigner` on delete fetch
- [ ] `buildTaskPopulateConfig`: deep-populate `projects.projectManager` (not `projects: true`)
- [ ] On **create**: auto-set `data.assigner = ctx.state.user.id` when unset
- [ ] **`find` (PM scope, non-admin)**: visibility `$or` includes **`{ assigner: uid }`** so Reporters see tasks they created (not only assignee/collaborator/project)
- [ ] **`userMayViewTask`**: populate `assigner`; return true when `userIsTaskReporter`

### Sync checklist — PM frontend (`pmOrgRoles.js`)

Add or align these exports:

```javascript
getPmOrgRoleKind()
canCreateProjectsInPm(project)
canEditProjectInPm(project, userId)
canToggleProjectPrivacy()
isProjectTeamMember(project, userId)
canCreateTaskInProject(project, userId)
canApproveTaskAssignmentsInPm()
isTaskAssigneeOrCollaborator(task, userId)
isTaskReporter(task, userId)          // assignerId / assigner.id
canEditTaskInPm(task, userId)        // admin/manager OR assignee/collaborator/reporter
canDeleteTaskInPm(task, userId)      // admin/manager OR reporter (member)
canCreateSubtaskOnTask(task, userId) // admin/manager OR parent assignee/collaborator
```

### Sync checklist — PM UI gates

Replace `isPmMember` / `memberScopedTasks` blocking **all** edits with per-row checks:

| Surface | Use |
|---------|-----|
| Status/priority/assignee disabled | `!canEditTaskInPm(row, currentUserId)` |
| Edit menu / pencil | `canEditTaskInPm(row, currentUserId)` |
| Delete menu / trash | `canDeleteTaskInPm(row, currentUserId)` |
| Add subtask | `canCreateSubtaskOnTask(row, currentUserId)` |
| Promote subtask | `getPmOrgRoleKind() !== 'member'` (keep as-is) |

**Files to update in source repo (find equivalents in target):**

- `apps/pm/app/my-tasks/page.js`
- `apps/pm/app/projects/[slug]/page.js`
- `apps/pm/app/tasks/[id]/page.js`
- `apps/pm/components/ProjectTasksPanel.jsx`
- `apps/pm/components/TaskSubtasksTableExtras.jsx`
- `apps/pm/components/TaskDetailsCard.jsx` — prop `canEdit` (not `isPmMember`)

### Assignee picker (`QuickCreateTaskModal.jsx`)

- [ ] Props: `assigneePickerScopedToProject`, `requiresAssignmentApproval`, `assigneeUsers`
- [ ] When project selected: list **project team only** (PM + `teamMembers`)
- [ ] Pass `requiresAssignmentApproval={memberScopedTasks}` from project detail / My Tasks
- [ ] Member assignments → pending approval flow (existing `approve-assignment` / `reject-assignment` routes)

---

## 3. Reporter label & Project Manager display

### UI label rename (display only)

| Old label | New label |
|-----------|-----------|
| Assigner / ASSIGNER | Reporter / REPORTER |

**Keep** Strapi + JS fields: `assigner`, `assignerId`, `assignerName`.

**Files with label changes:** `QuickCreateTaskModal`, `TaskDetailsCard`, `my-tasks/page.js`, `ProjectTasksPanel`, `TaskSubtasksTableExtras`, `tasks/[id]/page.js`, `tableSortColumns.js`.

### Project Manager on tasks

- [ ] **`taskService.js`**: all list/detail queries include `'populate[projects][populate][projectManager]': '*'`
- [ ] **`dataTransformers.js` `transformTask`**: add `projectManager`, `projectManagerId`, `projectManagerName` from first linked project; subtasks inherit
- [ ] **`taskListUtils.js`** (new file): `enrichTaskWithProjectManager`, `enrichTasksWithProjectManager`
- [ ] **UI**: Task Details Card row; task detail activity sidebar; subtasks table **PROJECT MANAGER** column

---

## 4. Subtasks & major-task lists

### New file: `apps/pm/lib/taskListUtils.js`

| Export | Purpose |
|--------|---------|
| `filterMajorTasks(tasks)` | Drop subtasks whose parent is in the same list |
| `isMajorTask(task, tasks)` | Top-level row check |
| `buildChildrenByParentId(tasks, { excludeTaskIds })` | Inline expand map |
| `enrichTaskWithProjectManager(task, projects)` | Backfill PM from projects list |
| `enrichTasksWithProjectManager(tasks, projects)` | Batch enrich |
| **`mergeTasksById(apiTasks, previousTasks)`** | Union API rows with prior state by `id` (API wins); used after create reload |

### Promote subtask → major task

- [ ] `taskService.promoteSubtaskToMajorTask(id)` → `updateTask(id, { parentId: null })`
- [ ] UI: **Make major task** action + confirm modal (admin/manager only)
- [ ] Surfaces: My Tasks, Project Tasks panel, task detail header + subtask row actions

### Single assignee on subtasks

- [ ] Backend `clampSubtaskToSingleAssignee` on create/update when `parent` set
- [ ] Subtask table: column **ASSIGNEE** (singular), `TaskAssigneesPicker` with `maxAssignees={1}`

### Dashboard / My Tasks counts

- [ ] `app/page.js` dashboard stats: use `filterMajorTasks` for KPIs
- [ ] My Tasks: KPIs/tabs use major tasks; **My Tasks** tab still shows assigned subtasks as own rows

### Task list pagination & tab count sync (follow-up)

**Symptom:** After creating a task, the new row appeared but **All Tasks** badge, **Showing X results**, and KPI **Total Tasks** stayed at the old number (e.g. 19 instead of 20). An older task silently dropped off the list when sorted by `updatedAt:desc`.

**Cause (two layers):**

1. List pages called single-page APIs — UI state held one page; counts used that truncated array.
2. After save, **`loadTasks()` replaced** the full in-memory list with the API response; if the API returned N rows, one older task disappeared (swap behavior).
3. For **Members**, backend list visibility omitted **`assigner`** — tasks created with reporter only could be missing from fetches until visibility fix shipped.

**Backend (follow-up — port to suites):**

- Task `find` `$or` for non-admin PM lists: **`{ assigner: uid }`** alongside assignee, collaborators, visible projects.
- **`userMayViewTask`**: treat Reporter like assignee for view gate.
- No schema change. Task `find` accepts `pagination[page]`, `pagination[pageSize]` (max **500** via `readListQuery`). Default page size when omitted is **25**.

**New helpers in `apps/pm/lib/api/taskService.js`** (module-level `paginateTaskApi` + class methods):

| Symbol | Role |
|--------|------|
| `paginateTaskApi(fetchPage, options)` | Internal — fetches page 1, 2, … while each batch length **=== pageSize**; stops on partial/empty page (do **not** trust `meta.pageCount` alone); merges by Strapi `id` |
| `fetchAllTasks(options)` | Org-wide PM lists — wraps `getAllTasks` |
| `fetchAllTasksByProject(projectId, options)` | Project detail Tasks tab — wraps `getTasksByProject` |
| `fetchPMTasksByAssignee(userId, options)` | Dashboard “my tasks” — paginates **assignee**, **collaborators**, and **assigner** (`stream: 'assigner'`) streams, merges, then `filterPmScopedTasks` |
| `getPMTasksByAssignee(userId, options)` | Thin wrapper — calls `fetchPMTasksByAssignee` |
| `getTaskStats()` | Uses `fetchAllTasks` instead of a single `pageSize: 500` call |

Default list sort for fetch helpers: `updatedAt:desc`. Default page size: **100** (max **500** per request).

**Table UI pagination (12 rows)** — separate from API fetch:

- **`TABLE_PAGE_SIZE = 12`** in `my-tasks/page.js` and `ProjectTasksPanel.jsx`.
- Tab badges / KPIs / “Showing X results” use **full** `majorTasks.length`, not the page slice.
- Table view slices `sortedTableRootTasks` for display only; Kanban/list/timeline still use full list.

**Page load pattern** (My Tasks + project detail):

```javascript
// loadTasks
const rawList = await taskService.fetchAllTasks({ pageSize: 500, sort: 'updatedAt:desc', ...filters });
const list = rawList.map(transformTask).filter(Boolean);
setAllTasks(list);

// loadTasks({ silent: true, mergeWithPrevious: true }) — after create (keeps tasks API omitted)
setAllTasks((prev) => mergeTasksById(list, prev));
```

**Save pattern** (`handleSaveTask` / `saveTask`):

1. `createTask` / `updateTask` → `transformTask(res?.data)`
2. **`setAllTasks(prev => mergeTasksById([savedTask], prev))`** — optimistic
3. **`loadTasks({ silent: true, mergeWithPrevious: true })`** — refetch + union with previous state (API authoritative; prior rows fill gaps)
4. Do **not** blind-replace state with refetch only on create

### Production recovery — “vanished” tasks (§4.1)

**Tasks were almost never deleted.** Production DB may show **61** tasks while PM showed **~20** — gap is filters + unfixed UI, not data loss.

| Check | Action |
|-------|--------|
| Confirm data exists | `SELECT COUNT(*) FROM tasks;` in Postgres |
| Missing Reporter links | Query in **Quick runbook** §4; if 0 rows, skip SQL backfill |
| PM still short after SQL | Deploy **§9** backend + frontend fixes; restart Strapi |
| CRM-linked tasks | In CRM app (`tasks_deal_lnk`, etc.) — excluded from PM by `filterPmScopedTasks` |
| Subtasks | Expand parent row — not counted in **All Tasks** major-task badge |
| Older PM tasks | Table **page 2** after deploy (12 per page) |

**Do not** run INSERT into `tasks_assignee_lnk` for recovery — use **`tasks_assigner_lnk`** only.

**Where counts must align** (all use **`filterMajorTasks`** for “All Tasks” / status tabs, except My Tasks tab):

| Surface | Count source | Table rows |
|---------|--------------|------------|
| My Tasks `/my-tasks` | `tabsWithBadges.all` = `majorTasks.length` | `sortedTableRootTasks` = major only on All / In Progress / Overdue tabs |
| My Tasks **My Tasks** tab | `allTasks` + `isActiveMyTask` (includes subtasks) | Assigned subtasks as own rows |
| Dashboard KPIs | `filterMajorTasks(allTasks)` | N/A |
| Dashboard **My tasks** widget | `fetchPMTasksByAssignee` → open assignee filter | Widget list |
| Project detail Tasks tab badge | `majorProjectTasks.length` | `ProjectTasksPanel` |
| `ProjectTasksPanel` status tabs | Count **`majorTasks`** (not raw `tasks.length`) | `filterMajorTasks(filteredTasks)` |

**Files touched (webfudge-platform):**

- `apps/pm/lib/api/taskService.js` — pagination helpers
- `apps/pm/app/my-tasks/page.js` — `loadTasks`, `handleSaveTask`
- `apps/pm/app/page.js` — dashboard `fetchAllTasks` + `fetchPMTasksByAssignee`
- `apps/pm/app/projects/[slug]/page.js` — `fetchAllTasksByProject`, `saveTask`, `majorProjectTasks` for badge/KPIs
- `apps/pm/components/ProjectTasksPanel.jsx` — tab badges from `majorTasks`

**Intentionally unchanged:** `projects/page.js` (server-paginated project list, `pageSize: 12`); calendar (`loadWorkspaceCalendar.js` date-range queries).

### Sync checklist — task list pagination (PM frontend only)

- [ ] Add `paginateTaskApi`, `fetchAllTasks`, `fetchAllTasksByProject`, `fetchPMTasksByAssignee` to **`taskService.js`** (match method names exactly)
- [ ] **`paginateTaskApi`**: loop while `batch.length === pageSize`; ignore unreliable `meta.pageCount`
- [ ] **`fetchPMTasksByAssignee`**: third stream **`stream: 'assigner'`** on `_getPMTasksByAssigneePage`
- [ ] Add **`mergeTasksById`** to **`taskListUtils.js`**
- [ ] Point **`getPMTasksByAssignee`** and **`getTaskStats`** at the fetch-all helpers
- [ ] **`my-tasks/page.js`**: `loadTasks` → `fetchAllTasks`; `loadTasks({ silent, mergeWithPrevious })`; optimistic + merge save in `handleSaveTask`; **`TABLE_PAGE_SIZE = 12`** + `Pagination` for table view
- [ ] **`app/page.js`**: org stats via `fetchAllTasks`; assignee widget via `fetchPMTasksByAssignee`
- [ ] **`projects/[slug]/page.js`**: `fetchAllTasksByProject`; `majorProjectTasks = filterMajorTasks(tasks)`; same merge save pattern
- [ ] **`ProjectTasksPanel.jsx`**: tab badges from **`majorTasks`**; table **`TABLE_PAGE_SIZE = 12`**
- [ ] Do **not** replace intentional pagination on **`projects/page.js`** (project grid)

### Sync checklist — task list visibility (backend)

- [ ] **`task/controllers/task.js` `find`**: non-admin PM `$or` includes **`{ assigner: uid }`**
- [ ] **`userMayViewTask`**: populate `assigner`; **`userIsTaskReporter`** returns true for view
- [ ] **`find`**: set **`Cache-Control: no-store`** on list responses
- [ ] **`middlewares/api-cache.js`**: skip **`GET /api/tasks`** (paginated lists go stale in Redis)
- [ ] Restart Strapi after deploy; run **`npm run flush:api-cache -- --org <id>`** once on production after deploy

### Sync checklist — assigner backfill (optional ops)

- [ ] Copy **`apps/backend/scripts/backfill-task-assigners.js`**
- [ ] Add npm scripts **`backfill:task-assigners`** / **`backfill:task-assigners:dry-run`** to backend `package.json`
- [ ] Run against production Postgres only when missing-assigner query returns rows (see Quick runbook §4)

---

## 5. File mapping (webfudge-platform → target suite)

Use this table to locate equivalents. Path prefixes may differ (`apps/pm` vs `xtrawrkx-pm-dashboard` vs `packages/pm`).

### Backend

| Webfudge path | What to port |
|---------------|--------------|
| `apps/backend/src/api/project/content-types/project/schema.json` | `isPrivate` field |
| `apps/backend/src/utils/rbac.js` | Privacy + list/view helpers |
| `apps/backend/src/api/project/controllers/project.js` | List/detail/summary filters |
| `apps/backend/src/api/task/controllers/task.js` | Full permission refactor + reporter gates + **`assigner` list visibility** |
| `apps/backend/scripts/backfill-task-assigners.js` | Optional ops — backfill Reporter from assignee |
| `apps/backend/package.json` | `backfill:task-assigners` npm scripts |
| `apps/backend/types/generated/contentTypes.d.ts` | Regenerate if used |

### PM frontend — lib

| Webfudge path | What to port |
|---------------|--------------|
| `apps/pm/lib/pmOrgRoles.js` | All permission helpers incl. `isTaskReporter` |
| `apps/pm/lib/taskListUtils.js` | **New file** — copy entire module incl. **`mergeTasksById`** |
| `apps/pm/lib/api/dataTransformers.js` | `isPrivate` on project; PM fields on task |
| `apps/pm/lib/api/taskService.js` | PM populate, `promoteSubtaskToMajorTask`, **`fetchAllTasks*`**, **`paginateTaskApi` loop**, assigner stream |
| `apps/pm/lib/tableSortColumns.js` | Reporter column label |

### PM frontend — pages

| Webfudge path | What to port |
|---------------|--------------|
| `apps/pm/app/page.js` | Major-task dashboard stats; **`fetchAllTasks` + `fetchPMTasksByAssignee`** |
| `apps/pm/app/my-tasks/page.js` | Permissions, promote, Reporter, enrich; **fetch + merge save + table pagination (12/page)** |
| `apps/pm/app/projects/page.js` | Lock icon |
| `apps/pm/app/projects/add/page.js` | Private checkbox |
| `apps/pm/app/projects/[slug]/edit/page.js` | Private checkbox |
| `apps/pm/app/projects/[slug]/page.js` | `displayTasks`, subtask permissions; **`fetchAllTasksByProject`, merge save, `majorProjectTasks`** |
| `apps/pm/app/tasks/[id]/page.js` | Full permission model, PM column, promote |

### PM frontend — components

| Webfudge path | What to port |
|---------------|--------------|
| `apps/pm/components/ProjectDetailMetaBar.jsx` | Private badge |
| `apps/pm/components/ProjectTasksPanel.jsx` | `canEditTaskInPm` gates, promote modal; **major-task tab badges + table pagination (12/page)** |
| `apps/pm/components/QuickCreateTaskModal.jsx` | Scoped picker props |
| `apps/pm/components/TaskAssigneesPicker.jsx` | `maxAssignees` support |
| `apps/pm/components/TaskDetailsCard.jsx` | Reporter label, PM row, `canEdit` |
| `apps/pm/components/TaskSubtasksTableExtras.jsx` | Reporter, promote, permission gates |

---

## 6. API / schema contract (for non-Webfudge backends)

If the target suite talks to the same Strapi API, ensure:

| Item | Detail |
|------|--------|
| **Task list** | `GET /api/tasks` with `pagination[page]`, `pagination[pageSize]` (max 500); no new fields |
| **Project field** | `isPrivate: boolean` (default false) |
| **Task field** | `assigner` relation (unchanged) — UI calls it Reporter |
| **Task populate** | `populate[projects][populate][projectManager]=*` on list/detail |
| **Member task update** | Full body allowed when user is assignee, collaborator, or assigner |
| **Member task delete** | `DELETE /api/tasks/:id` with write permission; only if user is assigner |
| **Assignee validation** | `400` "Assignees must be members of the project team" |
| **Approval routes** | `POST /tasks/:id/approve-assignment`, `reject-assignment` (unchanged) |

No database migration required — `isPrivate` defaults to public.

---

## 7. Deployment order

```
1. Deploy backend (schema + controllers + rbac + task list assigner visibility)
2. Restart Strapi
3. (Optional) Run assigner backfill if production query shows missing reporters
4. Deploy PM frontend (pmOrgRoles → taskListUtils → services → pages → components)
5. Smoke-test verification below
```

### Suite-specific notes

| Target | Typical PM app path | Backend path |
|--------|---------------------|--------------|
| **webfudge-platform** | `apps/pm/` | `apps/backend/` |
| **greenway-suite** | Match your fork (often `apps/pm` or `packages/pm`) | Same Strapi app path as platform |
| **xtrawrkx-suite** | Often `xtrawrkx-pm-dashboard` or mirrored `apps/pm` | Same pattern — one Strapi API |

Copy **`docs/PM_LAST_COMMIT_UPDATE_SUMMARY.md`** into each suite before porting so Cursor and QA share one checklist.

---

## 8. Verification checklist (share with QA)

### Private projects

- [ ] Admin sees Private checkbox on add/edit project
- [ ] Manager **cannot** see private project in list unless on team
- [ ] Manager **can** see all public projects
- [ ] Lock icon + Private badge render correctly

### Member as Reporter (e.g. user "Sanket")

- [ ] Member who is **Reporter** but not assignee can edit status, priority, assignees
- [ ] Edit/Delete actions visible on rows where user is Reporter
- [ ] Member can **delete** only tasks they created (Reporter)
- [ ] Member **cannot** delete tasks where they are only assignee

### Member as assignee

- [ ] Full edit on assigned tasks
- [ ] Cannot delete unless also Reporter

### Assignment

- [ ] Assignee picker shows project team only when project selected
- [ ] Member assigning teammate → pending approval badge
- [ ] Admin/Manager approve/reject works

### Reporter / PM display

- [ ] All tables show **Reporter** not Assigner
- [ ] Project Manager column/row populated on task detail

### Subtasks

- [ ] Subtask limited to one assignee
- [ ] Admin/Manager can **Make major task**
- [ ] Dashboard counts exclude nested subtasks (major tasks only)

### Task list counts (pagination follow-up)

- [ ] My Tasks **All Tasks** badge matches **Showing X results** after create/delete
- [ ] Creating a task increments count; no older major task disappears from the list
- [ ] Project detail **Tasks** tab badge matches panel table count
- [ ] Dashboard KPI **To Do / In Progress / Done / Overdue** reflect all major tasks (not one page)
- [ ] `ProjectTasksPanel` **All Tasks** badge equals major-task rows, not raw list length including nested subtasks
- [ ] Table view shows **page 1 of N** when more than 12 major tasks; page 2 lists older tasks
- [ ] Member who created a task (Reporter) sees it in list after deploy (backend assigner visibility)

### Production recovery (suites on Postgres)

- [ ] `SELECT COUNT(*) FROM tasks` matches expectation (tasks not deleted)
- [ ] Missing-assigner query returns 0 rows **or** backfill was run successfully
- [ ] PM task count rises toward visible major-task total after frontend + backend deploy

---

## 9. Related docs (webfudge-platform)

| Doc | Topic |
|-----|-------|
| [PM_PROJECT_PRIVATE_FLAG.md](./PM_PROJECT_PRIVATE_FLAG.md) | Private project detail |
| [PM_TASK_PERMISSIONS_UPDATE.md](./PM_TASK_PERMISSIONS_UPDATE.md) | Assignee + reporter rules |
| [PM_REPORTER_AND_PROJECT_MANAGER_UPDATE.md](./PM_REPORTER_AND_PROJECT_MANAGER_UPDATE.md) | Label + PM display |
| [PM_ORG_ROLE_SCOPING.md](./PM_ORG_ROLE_SCOPING.md) | Admin / Manager / Member matrix |
| [PM_TASK_ASSIGNMENT_APPROVAL.md](./PM_TASK_ASSIGNMENT_APPROVAL.md) | Pending assignment flow |
| [TASK_SUBTASKS_UPDATE.md](./TASK_SUBTASKS_UPDATE.md) | Subtask hierarchy base |

---

## 10. Changelog

| Date | Change |
|------|--------|
| 5 Jun 2026 | Base release `5a36f712` — privacy, permissions, Reporter, PM display, subtasks |
| 5 Jun 2026 | Follow-up — Member **Reporter** gets full edit + delete on own created tasks (`isTaskReporter`, backend update/delete gates) |
| 5 Jun 2026 | Follow-up — **Task list pagination**: `fetchAllTasks*` in `taskService.js`; My Tasks, dashboard, project Tasks tab, and `ProjectTasksPanel` tab badges stay in sync after create |
| 5 Jun 2026 | Follow-up — **Task create vanish fix**: backend `assigner` list visibility; `mergeTasksById` + `mergeWithPrevious` on save; `paginateTaskApi` partial-page loop; table UI 12/page; assigner stream in `fetchPMTasksByAssignee`; **`backfill-task-assigners`** script + production recovery notes |
| 5 Jun 2026 | Follow-up — **Redis task list cache**: exclude `GET /api/tasks` from API cache; flush stale keys; production has **59** tasks / **~31** major — My Tasks must use `fetchAllTasks` (Admin sees all org tasks) |

---

_Last updated: 5 Jun 2026 — intended for sync to **greenway-suite** and **xtrawrkx-suite**. Copy this file into target repos before porting._
