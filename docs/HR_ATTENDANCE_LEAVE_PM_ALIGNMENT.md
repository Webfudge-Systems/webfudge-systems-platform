# HR Attendance & Leave PM Alignment

## Summary
Aligned the HR **Attendance** and **Leave** list pages with the same UI patterns used on the **Employees** page and PM task tables: top bar, KPI row, glass tab bar with sort/column controls, and shared `@webfudge/ui` table cells.

## Scope
- `apps/hr/app/(attendance)/attendance/page.js`
- `apps/hr/app/(leave)/leave/page.js`
- `apps/hr/components/attendance/AttendanceTableCells.jsx` (new)
- `apps/hr/components/leave/LeaveTableCells.jsx` (new)

## Details

### Shared page shell (both pages)
- `HRModulePage` with `!space-y-6`
- `HRPageHeader` with `HR_ROOT_BREADCRUMB`, `showProfile`, import/export actions (search moved to tab toolbar)
- `HRKpiRow` + `KPICard` with PM-style subtitles
- `TabsWithActions` `variant="glass"` with search, filter, add (leave), sort, and column visibility
- `Select` for status filter in `afterTabs` (replaces native `<select>`)
- `HRListResultsCount`, `HRDataTableCard`, `Table` `variant="modernEmbedded"`
- `TableEmptyBelow` for empty table states
- `useTableColumnPreferences` + `useTableSort` on primary table tabs (Today / Requests)

### Attendance
- Table cells: avatar + title/subtitle employee column, status pills, location, PM-style date cells for overtime
- Inline row actions: view + delete icon buttons

### Leave
- Table cells: employee column, orange type pill, `TableCellCreated` date columns, status pills
- Pending requests: approve/reject icon buttons plus view/delete actions
- Balances tab uses shared text cells and `modernEmbedded` table

## Usage
No migration required. Column/sort preferences persist in localStorage under `hr.attendance.today.*` and `hr.leave.requests.*`.
