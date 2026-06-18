# HR Department Distribution Chart Update

## Summary

Redesigned the HR dashboard **Department distribution** card to match PM/CRM donut patterns and other HR insight widgets (`Workforce`, `Attendance`). The donut lives in **`apps/hr/components/dashboard/HRDepartmentDistributionDonut.jsx`** (not `@webfudge/ui`).

## Scope

- **HR:** `apps/hr/components/dashboard/HRDepartmentDistributionDonut.jsx`
- **HR:** `apps/hr/components/dashboard/DepartmentDistributionChart.jsx`

## Details

### Before
- Compact hand-rolled SVG donut + simple dot legend
- Segment colors followed sort order (colors jumped when sorting)

### After
- `DashboardInsightShell` header (badge, subtitle, sort dropdown) unchanged
- **Donut:** `DashboardChartCanvas` + `DonutChartFrame` + Recharts pie (CRM manager style)
- **Legend:** `DashboardProgressRow` list with hover sync to chart segments
- **Stable colors:** assigned alphabetically by department name; sort only reorders rows
- **Exports:** `HRDepartmentDistributionDonut`, `HR_SEGMENT_COLORS`, `HR_SEGMENT_BAR_COLORS`

## Usage

```jsx
import HRDepartmentDistributionDonut from '@/components/dashboard/HRDepartmentDistributionDonut'

<HRDepartmentDistributionDonut
  segments={[{ id: 'eng', label: 'Engineering', value: 6 }]}
  centerLabel="total"
/>
```

Pass `color` / `barColor` on segments when palette must stay fixed across sorts.
