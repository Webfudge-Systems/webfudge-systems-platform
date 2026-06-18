# HR Employee and Accounts User Sync

## Summary

HR employee management now reads and writes against the same organization user APIs used by the Accounts app. This makes employee creation and updates in HR appear in Accounts Users, and new users added in Accounts appear in HR Employees.

## Scope

- `apps/hr/lib/employeeSyncService.js`
- `apps/hr/app/(employees)/employees/page.js`
- `apps/hr/app/(employees)/employees/new/page.js`
- `apps/hr/app/(employees)/employees/[id]/edit/page.js`
- `apps/hr/app/(employees)/employees/[id]/page.js`
- `apps/hr/components/employees/EmployeeForm.jsx`

## What Changed

- Added a new HR-side sync service that uses org-scoped APIs:
  - `GET /organizations/:orgId/users`
  - `GET /departments`
  - `GET /organizations/:orgId/roles`
  - `POST /organizations/:orgId/invite-users`
  - `PATCH /organizations/:orgId/users/:membershipId`
- Replaced mock-only employee list loading with live synced employee rows mapped from Accounts memberships.
- Updated Employee create/edit forms to:
  - use Accounts department catalog for the Department field
  - use a dropdown for Reporting manager with role-based options (`Admin`, `Manager`)
- Wired create/edit/delete actions to membership APIs so HR changes are reflected in Accounts.
- Added local HR metadata persistence (designation, join date, location, employment details) keyed by membership id for HR-specific profile fields not managed by Accounts users UI.

## Functional Behavior

- Add in HR -> appears in Accounts Users.
- Add in Accounts Users -> appears in HR Employees after list refresh/navigation.
- Department choices in HR now come from Accounts departments.
- Reporting manager in HR is now role-driven and consistent with Accounts roles (`admin`, `manager`).

## Notes

- Accounts membership status is normalized in HR as:
  - active -> `Active`
  - invited/unconfirmed -> `Probation`
  - suspended -> `Exited`
- HR profile-specific fields continue to render, with synchronized identity/access data from Accounts as the source of truth.
