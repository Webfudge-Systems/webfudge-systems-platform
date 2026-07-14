# HR Performance Reviews Functional Sync

## Summary
The HR Performance Reviews module is now functionally complete for core cycle management flows (create, view, edit, delete) with improved modal action consistency and explicit ESS sync signaling.

## Scope
- `apps/hr/components/performance/PerformanceReviewsContent.jsx`
- `apps/hr/components/performance/ReviewCycleDetailModal.jsx`
- `apps/hr/lib/performanceReviewsService.js`

## What Changed
- Added ESS cross-app update signaling from the reviews service:
  - `REVIEWS_ESS_UPDATED_EVENT = 'ess:performance-updated'`
  - emitted on create/update/delete write operations
- Added `notifyReviewsUpdated()` helper to dispatch both HR and ESS review update events.
- Standardized review row/table and detail-modal action behavior:
  - edit action is disabled for seed/sample review cycles
  - delete remains disabled for seed/sample review cycles
  - action titles now clearly communicate edit availability

## Functional Behavior
- **Create Review Cycle**
  - validates required cycle name and period
  - persists in `hr.performance.reviewCycles`
  - triggers HR + ESS update events
- **View Review Cycle Modal**
  - opens from row click and action button
  - consistent modal action area using shared UI components
- **Edit Review Cycle Modal**
  - available only for custom cycles
  - seed/sample cycles are read-only
- **Delete Review Cycle**
  - available only for custom cycles
  - triggers HR + ESS update events

## ESS Sync
- ESS performance page already listens to:
  - `ess:performance-updated`
  - `hr:reviews-updated`
- Review cycle changes from HR now reliably refresh ESS review cycle panels and KPI context without manual reload.
