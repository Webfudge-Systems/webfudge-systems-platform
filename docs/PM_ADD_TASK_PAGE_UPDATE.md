# PM Add Task Page Update

## Summary
Replaced the “Add Task” modal pop-up in the PM “My Tasks” page with a dedicated route: `apps/pm/app/my-tasks/add/page.js`.

## Scope
- App route added: `apps/pm/app/my-tasks/add/page.js`
- “Add Task” navigation updated in: `apps/pm/app/my-tasks/page.js`
- Sidebar quick action updated: `apps/pm/components/PMSidebar.jsx`

## Behavior Changes
- `My Tasks` “Add Task” now navigates to `/my-tasks/add` (optionally preselecting `status` via query param).
- The modal is kept only for editing existing tasks; creating new tasks is done on the new page.

## UI Notes
- The new page uses `@webfudge/ui` components and matches the section/card structure style used in the PM project add page (icon badges inline with section titles).

