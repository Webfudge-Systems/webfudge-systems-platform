# HR Employee & Analytics PM Alignment

## Summary

HR Analytics is routed to a PM-style coming-soon page. Employee list actions include delete, and create/edit/detail flows follow PM dedicated-page patterns.

## Scope

- `apps/hr/app/coming-soon/page.js` — shared placeholder (query `?feature=`)
- `apps/hr/app/(analytics)/analytics/page.js` — redirects to coming soon
- `apps/hr/components/shared/HRTableRowActions.jsx` — edit, email, delete with confirm modal
- `apps/hr/components/employees/EmployeeForm.jsx` — shared form for new/edit
- `apps/hr/components/employees/EmployeeDetailMetaBar.jsx` — PM-style meta strip on detail
- `apps/hr/app/(employees)/employees/new/page.js` — create page
- `apps/hr/app/(employees)/employees/[id]/edit/page.js` — edit page
- `apps/hr/app/(employees)/employees/[id]/page.js` — detail with header actions + tabs

## Usage

- **Analytics:** Sidebar → Analytics → `/coming-soon?feature=analytics-reports`
- **Add employee:** Employees list → Add → `/employees/new` (FAB quick action still available)
- **Edit employee:** Detail → Edit → `/employees/[id]/edit`
- **Delete:** Trash icon in table actions or detail header (mock; list removes row locally)
