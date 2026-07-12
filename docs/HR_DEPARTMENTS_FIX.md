# HR Employee Departments Fix

## Summary
HR employee create/edit now loads departments from the same org-scoped Strapi API as **Accounts → Departments** (`GET /api/departments`). When an organization has no departments yet, the backend seeds a default catalog on first fetch and on new org onboarding.

## Root cause
- `EmployeeForm` already expected a `departments` prop from `listDepartmentCatalog()`.
- HR and Accounts both call `/departments` with `X-Organization-Id`.
- The local org had **zero** department records, so the dropdown only showed the placeholder option.

## Scope
- **Backend:** `org-departments-bootstrap.js`, department controller `find`, organization `createWithOnboarding`
- **HR:** `lib/api/departmentsService.js`, `employees/new` catalog error message
- **Accounts:** unchanged — same API and data source

## Default departments (auto-seeded once per org)
Engineering, Sales, HR, Finance, Operations, Design, Marketing

## Usage
1. Open **HR → Employees → Add New** — department dropdown should list org departments.
2. Manage departments in **Accounts → Departments** (`http://localhost:3003/departments` in dev).
3. Changes in Accounts appear in HR after refresh (shared API).

## Notes
- Departments are org-scoped; ensure `current-org-id` is set in localStorage (set on login via `@webfudge/auth`).
- To use only custom departments, create them in Accounts; auto-seed runs only when the org has none.
