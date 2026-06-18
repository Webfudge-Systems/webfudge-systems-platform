# HR Topbar – PM UI Alignment

## Summary

HR workspace topbar (`HRPageHeader` / `AppPageHeader`) was aligned with PM: time-based dashboard greeting, shared search styling via `WorkspaceSearchInput`, automatic back control on inner pages, and PM-matching page shell spacing.

## Scope

- **App:** `apps/hr` — `HRPageHeader.jsx`, `HRModulePage.jsx`, dashboard page, `lib/pageHeader.js`
- **UI package:** `WorkspaceHeader` now uses `WorkspaceSearchInput`; `AppPageHeader` defers search styling to that shared component

## Details

- Dashboard title: `Good Morning/Afternoon/Evening, {email-prefix}` (same as PM)
- Default search placeholder: `Search anything...`
- `showBack` defaults to true on all routes except `/dashboard`
- Page shell: `p-4 space-y-4 bg-white min-h-full` (PM parity)
- **Dashboard KPIs:** `DashboardKpiRow` + `KPICard` (`colorScheme="orange"`, PM-style count subtitles). Shared `KPICard` uses `bg-orange-50` icon wells, `text-orange-500` glyphs, `strokeWidth={2.25}`.
- **Current good widget:** `UpcomingEventsWidget` mirrors PM `UpcomingDeadlinesWidget` — glass `Card`, date badges, mini calendar, `Button` / `EmptyState` from `@webfudge/ui`
- **Insight cards:** `PendingApprovalsWidget` (sidebar, above Current good), `WorkforceStatusWidget` + `AttendanceSnapshotWidget` (main column) — all use `DashboardInsightShell`, `DashboardProgressRow`, `InsightCountBadge`, `EmptyState`, and PM-style “View all” actions

## Usage

```jsx
<HRModulePage>
  <HRPageHeader
    title={buildDashboardTitle(user)}
    subtitle={getCurrentDate()}
    breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
    showSearch
  />
</HRModulePage>
```
