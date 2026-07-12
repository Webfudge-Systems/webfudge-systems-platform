# HR Performance PIPs Functional Sync

## Summary
The HR Performance PIPs module now supports functional CRUD flows with consistent modal action behavior, employee linkage for PIP records, and ESS sync by employee id.

## Scope
- `apps/hr/lib/performancePipsService.js`
- `apps/hr/components/performance/PerformancePipsContent.jsx`
- `apps/hr/components/performance/PipForm.jsx`
- `apps/hr/components/performance/AddPipModal.jsx`
- `apps/hr/components/performance/PipEditModal.jsx`
- `apps/hr/components/performance/PipDetailModal.jsx`
- `apps/ess/lib/performanceEssService.js`

## What Changed
- Added ESS update signaling in PIP writes:
  - `PIPS_ESS_UPDATED_EVENT = 'ess:performance-updated'`
  - emitted on create/update/delete writes.
- Added `employeeId` support in PIP normalization and persistence.
- Added `notifyPipsUpdated()` helper to dispatch both HR and ESS update events.
- Updated PIP form to use employee selector from synced HR employees:
  - stores `employeeId` and resolved employee name
  - auto-prefills manager when employee manager metadata is available
- Wired PIP add/edit modals to use loaded employee options.
- Standardized table/detail modal action behavior:
  - edit disabled for non-custom/sample PIPs in both table row actions and detail modal.
- Updated ESS PIP selector to match by `employeeId` first, with name fallback for seed/backward-compatible records.

## Functional Behavior
- **Create PIP**
  - create with employee, manager, timeline, milestones, and status
  - stores linkage fields for employee-scoped sync
- **View PIP Modal**
  - opens with existing PIP detail overview panel and consistent action footer
- **Edit PIP**
  - available only for custom PIPs
  - seed/sample PIPs remain read-only
- **Delete PIP**
  - available only for custom PIPs

## ESS Sync
- ESS now resolves employee PIPs using `employeeId` when present.
- HR PIP changes trigger ESS refresh events to keep employee-side performance panels up-to-date.
