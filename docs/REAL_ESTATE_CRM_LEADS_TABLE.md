# Fudge Estate — Leads Table & Tabs Upgrade

## Summary

The Fudge Estate **Leads** list (`apps/real-estate-crm/app/leads/page.tsx`) was upgraded to match the
main CRM **Lead Companies** page (`apps/crm/app/sales/lead-companies/page.js`) in features, style, and
UI. The page now uses the shared `@webfudge/ui` table toolkit instead of a fixed, static table.

## Scope

- **App:** `apps/real-estate-crm`
- **File:** `app/leads/page.tsx` (rewritten)
- **Types:** `types/webfudge-ui.d.ts` (added ambient exports)
- **Shared UI reused (no changes):** `TabsWithActions`, `Table`, `TableColumnPicker`,
  `TableSortDropdown`, `TableRowActionMenuPortal`, `useTableColumnPreferences`, `useTableSort`,
  `Pagination`, `KPICard`, `Modal`, `Button`, `Select`, `EmptyState`, `LoadingSpinner`.

## Details

### Tabs

- Tier tabs (**All leads / Hot / Warm / Cold**) now render **count badges** sourced from the same
  tier-count query that feeds the KPI cards, so tab counts and KPI cards always agree.
- Tabs live inside a `TabsWithActions` toolbar (`variant="modern"`) with a full action row.

### Toolbar (matches CRM lead-companies)

- **Search** (debounced, over name / phone / email).
- **Add** (routes to `/leads/new`).
- **Filter** (opens the existing filter modal).
- **Column visibility** (eye) — opens `TableColumnPicker`.
- **Sort** — opens `TableSortDropdown`; active state highlighted.

### Table

- `Table` upgraded with **resizable columns** and drag-to-reorder via `useTableColumnPreferences`
  (persisted to `localStorage`: visibility, order, widths).
- **Fixed columns:** row-select checkbox, **Lead**, and **Actions**. Everything between them is
  toggleable/reorderable: Project, Budget, Timeline, Purpose, Page time, Score, Tier, Status,
  Assigned, Source, Phone, Email, Created.
- **Sortable headers** for scalar fields (name, score, tier, status, budgetRange, timeline, purpose,
  pageTimeSeconds, source, createdAt). Click a header or use the sort dropdown.
- **Row actions column:** More menu (open & schedule visit, copy URL), Edit, Mail, Delete.
- **Delete confirmation modal** (uses `deleteLead`), then refreshes list + tier counts.
- Existing **bulk select** (status / assignee) and **KPI cards** are retained.

### Sorting note

The backend `readListQuery` (`apps/backend/src/utils/content-api-helpers.js`) sorts by a **single**
field. Like the CRM lead-companies page, only the first sort rule is sent to the API
(`sort=<key>:<dir>`, default `score:desc`); additional rules remain in the UI panel.

## Usage / Migration

No migration needed. Column layout preferences are per-browser (`localStorage` keys prefixed
`reCrm.leads.*`). Use **Reset to default** in the column picker to restore defaults.
