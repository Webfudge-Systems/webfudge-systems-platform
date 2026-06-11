# PM — Project Private Flag

## Summary

Projects can now be marked **private** by org admins. A private project is hidden from managers who are not on the project team. Admins always see (and can edit) every project regardless of the private flag. Members are unaffected — they were already restricted to their own team projects.

## Visibility matrix

| Role | Public project | Private project |
|------|---------------|-----------------|
| **Admin** | ✅ see + edit all | ✅ see + edit all |
| **Manager** | ✅ see; edit only own | 🔒 hidden unless PM or team member; edit only own |
| **Member** | only if on team | only if on team |

## Scope

| Area | Change |
|------|--------|
| `apps/backend/src/api/project/content-types/project/schema.json` | Added `isPrivate` boolean field (default `false`) |
| `apps/backend/src/utils/rbac.js` | Added `projectIsPrivate`, `buildProjectListFiltersForUser`, `userCanViewProjectRow` helpers |
| `apps/backend/src/api/project/controllers/project.js` | `find`, `findOne`, `summary` now use the new helpers instead of hard-coding member-only logic |
| `apps/backend/src/api/task/controllers/task.js` | `find`, `findOne`, `update`, upcoming tasks — replaced `projectIdsForMember`/`memberMayViewTask` with `projectIdsVisibleToUser`/`userMayViewTask` that carry `ctx` for role-aware private checks |
| `apps/pm/lib/pmOrgRoles.js` | Added `canToggleProjectPrivacy()` — returns true only for admin |
| `apps/pm/lib/api/dataTransformers.js` | `transformProject` now maps `isPrivate` |
| `apps/pm/app/projects/add/page.js` | Admin sees "Private project" checkbox; value sent on create |
| `apps/pm/app/projects/[slug]/edit/page.js` | Admin sees "Private project" checkbox; value sent on update; form pre-fills from existing record |
| `apps/pm/app/projects/page.js` | Lock icon shown next to private project names in the list table |
| `apps/pm/components/ProjectDetailMetaBar.jsx` | "Private" badge shown in the project detail header bar |

## Usage

1. An **Admin** opens Add Project or Edit Project and checks "Private project" to restrict visibility.
2. Non-admin managers visiting the projects list or a direct URL to a private project they are not assigned to receive a 403 from the backend and no data reaches the frontend.
3. **Members** are unaffected — their visibility was already limited to projects where they appear as PM or team member.

## Migration

No data migration needed. Existing projects have `isPrivate` default `false` (public), so current manager access is preserved unless an admin explicitly marks a project private.
