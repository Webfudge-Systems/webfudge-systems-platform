# Books Reports Page — Layout

## Summary

The Books **Reports** hub keeps the same top KPI row as list pages (Items-style grid). The content area below KPIs is a **coming soon** placeholder while full reports and charts are in development.

> **Note:** Chart components under `apps/books/app/reports/components/` were built in an earlier iteration but are not wired to the hub page.

## Scope

- `apps/books/app/reports/_components/BooksReportsHub.tsx` — KPI row only; analytics below
- `apps/books/app/reports/components/BooksSystemAnalytics.tsx` — main chart grid
- `apps/books/app/reports/components/BooksReportsCashFlowChart.tsx` — books-themed cash flow area chart
- `apps/books/app/reports/components/BooksReportsExpenseDonut.tsx` — top expenses donut (`DonutChartFrame`, `DashboardChartCanvas`)
- `apps/books/app/reports/lib/reportChartData.ts` — shared chart data builders + fiscal range filter
- `apps/books/types/webfudge-ui.d.ts` — chart export typings

## Layout (below KPIs)

1. **Toolbar** — report quick links + fiscal period `Select`
2. **Row 1** — `BooksChartViewSwitcher` (revenue & spend / analytics) + `FintechMetricsQuad` (receivables, payables, net cash, unbilled)
3. **Row 2** — `BooksReportsCashFlowChart` + `BooksReportsExpenseDonut`
4. **Row 3** — `FinanceDualChart` + projects summary card
5. **Row 4** — `StackedBankCards` for bank accounts

## Notes

- Monetary values use `formatSalesMoney` (INR, 0 decimals).
- `BooksFinancialCharts.tsx` is superseded by the new components but left in the repo for reference.
- No changes to `packages/ui/components` — only consumption from the Books app.
