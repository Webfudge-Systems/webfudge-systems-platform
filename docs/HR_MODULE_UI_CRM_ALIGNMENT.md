# HR Module UI — CRM/PM Alignment

## Summary

Non-dashboard HR module pages now follow the same workspace UI recipe as CRM and PM: `AppPageHeader` topbar (with global search), KPI row, `TabsWithActions` toolbar, and CRM-style data table shells — all using existing `@webfudge/ui` components without modifying the shared package.

## Scope

- **Apps:** `apps/hr`
- **Excluded:** `apps/hr/app/(dashboard)/dashboard` (unchanged)
- **New shared HR chrome:**
  - `components/layout/HRModulePage.jsx` — `space-y-6 p-4 md:p-6` page shell
  - `components/layout/HRKpiRow.jsx` — responsive KPI grid (3/4/5/6 columns)
  - `components/shared/HRDataTableCard.jsx` — bordered table container
  - `components/shared/HRSectionCard.jsx` — `Card variant="elevated"` panel
  - `components/GlobalSearchModal.jsx` — workspace search (employees + quick links)
- **Updated:** `HRPageHeader` wires `renderGlobalSearchModal` like `CRMPageHeader`

## Pages updated

| Route | Changes |
|-------|---------|
| `/employees`, `/employees/new`, `/employees/[id]` | Module shell, KPI row, `TableResultsCount` / `TableEmptyBelow`, detail compact KPIs |
| `/attendance`, `/leave`, `/payroll`, `/expenses` | Full CRM list-page pattern |
| `/recruitment`, `/performance`, `/learning`, `/helpdesk` | Same |
| `/analytics` | Module shell + header search (panels unchanged) |
| `/settings` | Module shell + `HRSectionCard` / `HRDataTableCard` |

## Usage pattern

```jsx
<HRModulePage>
  <HRPageHeader title="…" subtitle="…" breadcrumb={[…]} showActions showSearch />
  <HRKpiRow>
    <KPICard title="…" value={n} icon={Icon} colorScheme="orange" />
  </HRKpiRow>
  <TabsWithActions … />
  <TableResultsCount count={rows.length} />
  <HRDataTableCard>
    <Table variant="modern" … />
    <TableEmptyBelow … />
  </HRDataTableCard>
</HRModulePage>
```

## Migration notes

- Prefer `HRModulePage` over ad-hoc `min-h-full space-y-6 p-4` wrappers.
- Remove local `SECTION_CARD` class strings; use `HRSectionCard` or `HRDataTableCard`.
- Dashboard (`HRPageLayout` / glass widgets) is unchanged.
