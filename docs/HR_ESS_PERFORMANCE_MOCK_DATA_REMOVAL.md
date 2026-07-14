# HR/ESS Performance Mock Data Removal

## Summary
Removed seeded mock data from HR and ESS performance modules so Goals, Reviews, Feedback, Appraisals, and PIPs now rely on persisted performance records only.

## Scope
- `apps/hr/lib/performanceGoalsService.js`
- `apps/hr/lib/performanceReviewsService.js`
- `apps/hr/lib/performanceFeedbackService.js`
- `apps/hr/lib/performanceAppraisalsService.js`
- `apps/hr/lib/performancePipsService.js`
- `apps/hr/lib/performancePage.js`
- `apps/hr/app/(performance)/performance/page.js`
- `apps/ess/lib/performanceEssService.js`
- `apps/hr/lib/mock-data/performance.js` (deleted)
- `apps/ess/lib/mock-data/performance.js` (deleted)

## What Changed
- Removed all default seed arrays and seed-merging logic for:
  - goals
  - review cycles
  - feedback requests/received feedback
  - appraisals
  - pips
- Updated aggregate stats helpers to use generic empty-array defaults instead of seeded mock datasets.
- Updated HR performance goals landing page KPI aggregation to load real data from all performance services instead of implicit seeded defaults.
- Removed seed-only feedback branch logic (`completedSeeds`) now that pending seed requests are no longer injected.
- Removed unused performance mock-data files from both HR and ESS.

## Resulting Behavior
- New/empty environments now show generic empty states until users create real data.
- All performance KPIs, tabs, tables, and ESS mirrors reflect only actual persisted records.
- No fallback mock values are shown in performance modules.
