# HR Payroll Sub-Navigation Update

## Summary

Payroll tabs (Overview, Salary Structures, Payslips, Compliance, Loans & Advances) are now separate routes. Navigation lives in the Payroll sub-sidebar panel instead of horizontal tabs on a single page.

## Scope

- `apps/hr/lib/payrollNavigation.js` — payroll sidebar nav items and route-active helpers
- `apps/hr/lib/payrollShared.js` — shared payroll table constants and row mappers
- `apps/hr/hooks/usePayrollRunData.js` — shared payroll run data hook
- `apps/hr/components/payroll/PayrollPageShell.jsx` — shared page chrome (header, KPIs, run toolbar)
- `apps/hr/components/payroll/Payroll*Content.jsx` — section-specific list views
- `apps/hr/lib/navigation.js` — payroll sub-sidebar children updated
- `apps/hr/app/(payroll)/payroll/` — route split

## Routes

| Section | Route |
| --- | --- |
| Overview | `/payroll` |
| Salary Structures | `/payroll/structures` |
| Payslips | `/payroll/payslips` |
| Compliance | `/payroll/compliance` |
| Loans & Advances | `/payroll/loans` |

Detail routes unchanged (`/payroll/[id]`, `/payroll/structures/[id]`, etc.).

## Usage

Open **Payroll** from the main sidebar Navigate grid. The sub-sidebar lists all payroll sections. Each section keeps its own search/actions toolbar; KPI cards and the payroll run selector remain at the top of every payroll page.

## Migration

- Replace `?tab=structures` links with `/payroll/structures`
- `getPayrollTabItems()` in `payrollPage.js` is deprecated for navigation; use `HR_PAYROLL_NAV` from `payrollNavigation.js`
