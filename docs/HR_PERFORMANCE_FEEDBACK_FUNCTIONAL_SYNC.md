# HR Performance Feedback Functional Sync

## Summary
The HR Performance Feedback module is now functional for core workflows (create request, view detail, edit, submit feedback, delete) with modal action consistency improvements and ESS employee-level feedback sync.

## Scope
- `apps/hr/lib/performanceFeedbackService.js`
- `apps/hr/components/performance/PerformanceFeedbackContent.jsx`
- `apps/hr/components/performance/FeedbackRequestForm.jsx`
- `apps/hr/components/performance/AddFeedbackRequestModal.jsx`
- `apps/hr/components/performance/FeedbackEditModal.jsx`
- `apps/hr/components/performance/FeedbackDetailModal.jsx`
- `apps/hr/components/performance/PerformanceDetailTabPanels.jsx`
- `apps/ess/lib/performanceEssService.js`
- `apps/ess/app/(performance)/performance/page.js`

## What Changed
- Added ESS update signaling in feedback service writes:
  - `FEEDBACK_ESS_UPDATED_EVENT = 'ess:performance-updated'`
  - emitted whenever pending/received feedback stores are updated.
- Added employee linkage fields for feedback requests and received feedback:
  - `employeeId`
  - `employeeName`
- Enforced validation for feedback request creation/edit:
  - request label required
  - employee required
- Updated submit-feedback flow to carry employee linkage from pending request to received record.
- Added employee selector to feedback request form (shared UI select pattern).
- Wired feedback page to load employee options from synced employee service and pass to add/edit modals.
- Standardized action availability in table + detail modal:
  - edit disabled for non-custom/sample feedback items
  - pending items still support Give Feedback and Remove request behavior
- Extended feedback detail panels to show associated employee when available.
- Updated ESS filtering to show employee-relevant pending/received feedback by employee id/name linkage.

## Functional Behavior
- **Create Feedback Request**
  - creates pending request with employee, type, due date, review cycle
- **View Feedback Modal**
  - consistent detail modal for pending/received records
  - displays linked employee when present
- **Edit Feedback**
  - editable only for custom records
  - sample records are read-only
- **Give Feedback**
  - converts pending request into received feedback
  - preserves employee linkage for ESS filtering
- **Delete**
  - pending request can be removed
  - received feedback deletion limited to custom records

## ESS Sync
- ESS performance page now calls employee-scoped pending feedback selector.
- HR feedback updates trigger ESS refresh events, so employees see updated feedback state without manual refresh.
