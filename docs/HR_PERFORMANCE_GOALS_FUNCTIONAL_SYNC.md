# HR Performance Goals Functional Sync

## Summary
The HR Performance Goals module is now fully functional for core CRUD flows (create, view, edit, delete), with improved modal consistency using shared `@webfudge/ui` patterns and direct sync behavior for ESS performance views.

## Scope
- `apps/hr/components/performance/PerformanceGoalsContent.jsx`
- `apps/hr/components/performance/GoalForm.jsx`
- `apps/hr/components/performance/AddGoalModal.jsx`
- `apps/hr/components/performance/GoalEditModal.jsx`
- `apps/hr/components/performance/GoalDetailModal.jsx`
- `apps/hr/components/performance/PerformanceDetailTabPanels.jsx`
- `apps/hr/lib/performanceGoalsService.js`
- `apps/hr/lib/performancePage.js`
- `apps/ess/lib/performanceEssService.js`

## What Changed
- Added individual-goal assignment fields (`assigneeId`, `assigneeName`) in goal persistence and normalization.
- Enforced validation for:
  - department-scoped goals requiring department
  - individual-scoped goals requiring employee assignment
- Added ESS update event emission from HR goals writes (`ess:performance-updated`) for cross-app refresh.
- Switched goal form review cycle options to dynamic `listReviewCycles()` data instead of static mock imports.
- Added employee selector for individual-scoped goals in add/edit modals.
- Wired HR goals page to load real employee options from synced employee service.
- Expanded goals search matching to include assignee, department, and review cycle.
- Updated goal detail UX:
  - edit action disabled for seed/sample goals
  - individual-assigned employee shown in objective details
- Updated scope label formatting to show assignee context for individual goals.
- Updated ESS goal filtering to include individual goals by assignee ID/name match.
- Updated ESS PIP listing to merge custom local PIPs with seed PIPs.

## Functional Behavior
- **Create Goal**
  - Works for company, department, and individual scope
  - Validates required context fields by scope before save
- **View Goal Modal**
  - Uses consistent shared modal/card sections
  - Shows assigned employee when scope is individual
- **Edit Goal Modal**
  - Fully functional for custom goals
  - Seed goals remain read-only
- **Delete Goal**
  - Allowed only for custom goals
  - Seed goals are protected
- **ESS Sync**
  - Goal changes in HR refresh ESS performance data
  - Individual goals are visible to matching employee profiles

## Notes
- Shared UI visuals in `packages/ui` were not modified; behavior and composition updates were implemented at app layer.
