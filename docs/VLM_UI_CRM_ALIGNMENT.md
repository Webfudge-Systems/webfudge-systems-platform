# VLM UI/UX CRM Alignment Update

## Summary

Updated the Webfudge VLM app (`apps/(automobile)/vlm`) to use the shared `@webfudge/ui` workspace patterns consistently with CRM, PM, and HR. All module pages now follow the same shell, KPI row, tabs, table, and detail layouts used across the platform.

## Scope

- **App:** `apps/(automobile)/vlm`
- **Shared UI:** `@webfudge/ui` (`WorkspaceLayoutContent`, `AppPageHeader`, `KPICard`, `Table`, `TableCrmCells`, `ActivitiesTimeline`, `DashboardInsightShell`, etc.)
- **No changes** to `packages/ui` component visuals (workspace rule)

## Shell & layout

| Before | After |
|--------|-------|
| `AppShell` only | `WorkspaceLayoutContent` with hide-mode sidebar, PWA key, branding |
| Custom gradient sidebar links | PM/CRM-style tile nav with `SidebarProductBranding`, logo, collapse toggle |
| `WorkspaceHeader` wrapper | `AppPageHeader` wrapper with back-button logic |
| Ad-hoc `p-4 md:p-6` page padding | `VLMModulePage` (`min-h-full bg-white p-4 space-y-4`) |

### New app-local components

- `components/layout/VLMModulePage.jsx` — page shell
- `components/layout/VLMKpiRow.jsx` — KPI grid
- `components/shared/VLMDataTableCard.jsx` — table container
- `lib/pageHeader.js` — breadcrumb helpers
- `lib/vlmDisplay.js` — vehicle label, date formatting, stats

## Pages updated

| Route | Changes |
|-------|---------|
| `/vlm/vehicles` | KPI row, status pills, `EmptyState`, shared table cells |
| `/vlm/vehicles/[id]` | KPI summary, `InfoSection`/`InfoRow` overview, `ActivitiesTimeline`, tab tables |
| `/vlm/allocations` | Full list page with KPIs, tabs, search, table |
| `/vlm/service` | Full list page with KPIs, search, table |
| `/vlm/warranty` | Full list page with KPIs, status tabs, table |
| `/vlm/reports` | Dashboard-style KPI row + `DashboardInsightShell` quick links |

## Usage

Run VLM with the automobile workspace dev script:

```bash
npm run dev:auto
```

VLM defaults to port **3002** in its `package.json` dev script.

## Migration notes

- Page headers on list routes no longer show a back button; detail routes do (same as HR/CRM).
- Sidebar active state uses `bg-brand-primary` tiles instead of orange-to-pink gradient links.
- Vehicle timeline tab uses shared `ActivitiesTimeline` instead of a custom card list.
