# Shared UI Revert (HRMS Build)

## Summary

Reverted visual changes made to `@webfudge/ui` while building HRMS so PM/CRM/Books keep the original shared design (e.g. KPI cards with large corner icons and `brand-primary` accents). HR-specific layout needs now live in `apps/hr/components/`.

## Scope

### Reverted in `packages/ui/`

- `KPICard` — icon position/size, orange token classes
- `DashboardInsightShell` — `fillHeight`, extra badge tones
- `DashboardKpiRow` — HR-only prop forwarding
- `DonutChartFrame` — compact variant
- `AppPageHeader` / `WorkspaceHeader` — search input defaults
- Removed `DashboardDistributionDonut` from shared package

### Added in `apps/hr/components/dashboard/`

| Component | Purpose |
|-----------|---------|
| `HRDashboardKpiRow` | Subtitle, `onClick`, per-card overrides |
| `HRDashboardInsightShell` | `fillHeight` tiles, red/emerald badges |
| `HRInsightCountBadge` | Extended badge tones |
| `HRDepartmentDistributionDonut` | Department donut + legend (was shared) |

### Cursor rule

`.cursor/rules/protect-shared-ui-components.mdc` — do not change shared component **UI** unless explicitly requested; use app-local wrappers instead.

## Usage

```jsx
// HR dashboard KPIs
import HRDashboardKpiRow from '@/components/dashboard/HRDashboardKpiRow'

// HR insight widgets
import HRDashboardInsightShell, { HRInsightCountBadge } from '@/components/dashboard/HRDashboardInsightShell'
```

PM/CRM continue using `DashboardKpiRow` and `KPICard` from `@webfudge/ui` unchanged.
