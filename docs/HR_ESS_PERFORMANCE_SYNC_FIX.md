# HR ↔ ESS Performance Sync Fix

## Summary
HR performance data (goals, reviews, feedback, appraisals, PIPs) was stored only in browser `localStorage`. Because HR runs on port **3008** and ESS on **3009**, each app had a separate storage bucket — so records created in HR never appeared in ESS.

This update adds org-scoped API persistence and stronger employee matching so ESS shows the correct records for the logged-in employee.

## Scope
- `apps/backend/src/api/hr-performance-workspace/` — new Strapi content type + sync endpoints
- `packages/utils/src/hrPerformance/` — shared workspace read/write + employee match helpers
- `apps/hr/lib/performance*Service.js` — persist workspace to API after writes
- `apps/hr/components/performance/PerformanceWorkspaceHydrator.jsx`
- `apps/ess/lib/performanceEssService.js`
- `apps/ess/components/performance/PerformanceWorkspaceHydrator.jsx`
- HR performance forms (goal, appraisal, PIP, feedback) — store membership IDs

## Details
### API workspace
- `GET /api/hr-performance-workspace/current` — any authenticated org member
- `PUT /api/hr-performance-workspace/current` — HR admin only
- Payload keys: `goals`, `reviewCycles`, `feedbackPending`, `feedbackReceived`, `appraisals`, `pips`

### Client sync
- On HR/ESS login, `PerformanceWorkspaceHydrator` fetches workspace data into local storage keys (`hr.performance.*`).
- If API is empty but HR local data exists, HR pushes local data to API once (migration).
- HR writes schedule a debounced API persist.

### Employee matching (ESS)
ESS filters individual records using all known identifiers:
- `id`, `membershipId`, `userId`, `employeeId`, `email`, and name fallback

Forms now also persist `assigneeMembershipId` / `employeeMembershipId` when picking employees.

## Usage / Migration
1. **Restart Strapi** after pulling this change so `hr-performance-workspace` is registered.
2. Open **HR** while logged in as an HR admin — existing local performance data uploads to the API automatically.
3. Open **ESS** as the assigned employee — performance tabs hydrate from the API.
4. Re-create or edit records if an older row still does not match (missing employee linkage).

## Test plan
1. HR: create individual goal for employee **TESTER2** → refresh ESS as TESTER2 → goal appears under **Goals**.
2. Repeat for appraisal, PIP, and feedback request.
3. Review cycles appear for all employees (org-wide).
4. Confirm data survives closing/reopening ESS (loaded from API, not HR-only localStorage).
