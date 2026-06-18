# HR Payroll Functional Build

## Summary
The HR Payroll module was upgraded from a mock UI shell to a functional backend-wired flow. Payroll runs, salary structures, line-item computations, lifecycle transitions, and single-employee payslip generation are now connected through org-scoped Strapi APIs and consumed by the HR app.

## Scope
- `apps/backend/src/api/employee-profile`
- `apps/backend/src/api/salary-structure`
- `apps/backend/src/api/salary-component`
- `apps/backend/src/api/payroll-run`
- `apps/backend/src/api/payroll-line-item`
- `apps/backend/src/api/payslip`
- `apps/hr/lib/payrollSyncService.js`
- `apps/hr/lib/payrollCompute.js`
- `apps/hr/app/(payroll)/payroll/*`
- `apps/hr/components/payroll/*`
- `apps/hr/components/employees/EmployeeForm.jsx`
- `apps/hr/app/(employees)/employees/new/page.js`
- `apps/hr/app/(employees)/employees/[id]/edit/page.js`
- `apps/hr/lib/employeeSyncService.js`

## Backend Changes
- Added new payroll content types:
  - `employee-profile`
  - `salary-structure`
  - `salary-component`
  - `payroll-run`
  - `payroll-line-item`
  - `payslip`
- Added payroll run lifecycle endpoints:
  - `POST /api/payroll-runs/:id/recalculate`
  - `POST /api/payroll-runs/:id/review`
  - `POST /api/payroll-runs/:id/lock`
  - `POST /api/payroll-runs/:id/disburse`
- Added payslip endpoints:
  - `POST /api/payslips/generate`
  - `GET /api/payslips/:id/download`
- Added lock guard validation on payroll runs:
  - blocks lock when any line item has missing salary structure
  - blocks lock when any employee profile has missing bank details
- Added payroll/payslip sequence fields on organization:
  - `payrollSequence`
  - `payslipSequence`
- Added `pdfkit` dependency for server-side payslip PDF output.

## Frontend Changes
- Added `payrollSyncService` for org-aware HR payroll API requests.
- Added `payrollCompute` helpers for centralized placeholder payroll rules.
- Rebuilt payroll list page to load real runs, structures, and payslips from API.
- Added month/year run creation flow and run selector.
- Added draft-only recalculation action.
- Wired review -> lock -> disburse transitions with blocker rendering.
- Replaced static KPI values with values from selected payroll run aggregates.
- Switched payroll row actions to live API actions:
  - view/edit/remove line item
  - generate payslip for a row
- Wired payslips tab download action to server PDF endpoint.
- Reworked salary structure form to:
  - annual CTC input
  - percentage splits (Basic/HRA/Special/FBP)
  - monthly component preview
- Connected salary structure create/edit/detail pages to API.
- Added salary structure dropdown to employee add/edit form.
- Added employee-level Annual CTC in employee add/edit form; payroll uses this as the actual employee salary.
- Extended employee sync flow to persist `salaryStructureId` and upsert employee profile payroll fields.

## Lifecycle Rules Implemented
- Allowed status flow: `draft -> review -> locked -> disbursed`
- Disallowed skipping transition states.
- Lock action requires all line items to pass profile prerequisites.
- Locked/disbursed runs are treated as read-only in payroll row actions.

## Payslip Behavior
- Single employee payslip generation is available per payroll row.
- Generated payslips are listed in the Payslips tab.
- Download links use `GET /api/payslips/:id/download`.
- Output includes employee identity, period, earnings, deductions, and net pay.

## Notes
- Compliance filings and loans/advances remain intentionally out of scope.
- Statutory logic (PF/ESI/PT/TDS) is placeholder-level and centralized for easy refinement.
- Salary decision flow: employee profile `annualCtc` is the salary amount; salary structure supplies the split percentages. If a structure is missing, payroll can still estimate from default percentages but flags the row as missing a structure before lock.
