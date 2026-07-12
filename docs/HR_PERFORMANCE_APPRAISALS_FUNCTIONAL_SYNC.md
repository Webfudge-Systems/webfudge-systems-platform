# HR Performance Appraisals Functional Sync

## Summary
The HR Performance Appraisals module now has fully functional core CRUD behavior with consistent modal action states and improved ESS employee sync using explicit employee linkage.

## Scope
- `apps/hr/lib/performanceAppraisalsService.js`
- `apps/hr/components/performance/PerformanceAppraisalsContent.jsx`
- `apps/hr/components/performance/AppraisalForm.jsx`
- `apps/hr/components/performance/AddAppraisalModal.jsx`
- `apps/hr/components/performance/AppraisalEditModal.jsx`
- `apps/hr/components/performance/AppraisalDetailModal.jsx`
- `apps/ess/lib/performanceEssService.js`

## What Changed
- Added ESS update signaling in appraisal writes:
  - `APPRAISALS_ESS_UPDATED_EVENT = 'ess:performance-updated'`
  - dispatched on create/update/delete writes.
- Added appraisal employee linkage field:
  - `employeeId` persisted and normalized with appraisal records.
- Added `notifyAppraisalsUpdated()` helper to dispatch HR + ESS appraisal update events.
- Updated appraisal form to use employee selection via shared `Select` pattern:
  - employee picked from synced HR employee list
  - selected employee name and id are stored in form payload
  - department auto-prefills from selected employee when available
- Wired appraisal add/edit modals to employee options loaded from synced employee service.
- Standardized modal/table action consistency:
  - edit is disabled for non-custom/sample appraisals in table actions
  - edit is disabled for non-custom/sample appraisals in detail modal

## Functional Behavior
- **Create Appraisal**
  - create with employee, rating, revision, promotion, effective date, and status
  - persists employee linkage (`employeeId`) for downstream sync
- **View Appraisal Modal**
  - opens from row click/action with overview panel
  - consistent shared action footer
- **Edit Appraisal**
  - available only for custom appraisals
  - sample appraisals remain read-only
- **Delete Appraisal**
  - available only for custom appraisals

## ESS Sync
- ESS appraisal selector now matches appraisals by:
  - `employeeId` when present (preferred)
  - fallback to name matching for seed/backward-compatible records
- Appraisal changes from HR now refresh ESS views via both HR and ESS update events.
