# CRM Table Sort & Column Resize

## Summary

Added **multi-column sort** and **drag-to-resize columns** to the main CRM list tables (Lead Companies, Contacts, Deals, and Client Accounts), matching the feature set that already existed in the PM app.

## Scope

| File | Change |
|---|---|
| `apps/crm/lib/tableSortColumns.js` | Sort column definitions for `leadCompany`, `contact`, `deal`, `clientAccount` |
| `apps/crm/lib/tableSortValues.js` | Sort value getters for those entities (incl. lifecycle-ranked client account status) |
| `apps/crm/hooks/useCrmTableSort.js` | Wraps `useTableSort` from `@webfudge/ui` |
| `apps/crm/app/sales/lead-companies/page.js` | Sort + resize wired in |
| `apps/crm/app/sales/contacts/page.js` | Sort + resize wired in |
| `apps/crm/app/sales/deals/page.js` | Sort + resize wired in |
| `apps/crm/app/clients/accounts/page.js` | Sort wired in (client accounts) |

## Details

### Sort

- **Multi-column** — up to 5 sort rules, applied in priority order.
- **Persisted** — each page stores its sort rules in `localStorage` under a unique key (e.g. `crm.leadCompanies.tableSort`, `crm.clientAccounts.tableSort`).
- **Client-side** — sort is applied after filtering on the current loaded page.
- **UI** — a "Sort" button appears in the `TabsWithActions` toolbar (uses the existing `showSort`/`onSortClick`/`hasActiveSort` props that were already built into the component). Clicking opens a `TableSortPanel` dropdown.
- **Header click** — clicking a sortable column header toggles sort; Shift-click adds a multi-column rule.
- **Sort panel** — rule priority numbers, Asc/Desc toggle buttons, up/down reorder, individual remove, and a "Clear all" button.

### Client account status order

Status is ranked by lifecycle (not alphabetically). **Descending** order is:

1. Active
2. Onboarding
3. At Risk
4. Paused
5. Completed
6. Inactive
7. Churned

Ascending reverses that list. The same ranking is used in PM client accounts (`apps/pm/lib/tableSortValues.js`).

### Column Resize

- Drag the handle on the right edge of any column header to resize.
- Double-click the handle resets that column to its default width.
- Width state is kept in component state (per session); extend to `localStorage` if persistence across refreshes is desired.

## Entity Sort Columns

| Entity | Sortable keys |
|---|---|
| `leadCompany` | companyName, status, source, dealValue, contactsCount, assignedTo, type, subType, industry, score, healthScore, city, country, createdAt, updatedAt |
| `contact` | name, email, phone, jobTitle, company, source, assignedTo, city, country, createdAt, updatedAt |
| `deal` | deal, value, stage, priority, probability, company, owner, expectedCloseDate, createdAt, updatedAt |
| `clientAccount` | company, primaryContact, healthScore, dealValue, contactsCount, location, industry, assignedTo, status, createdAt, updatedAt, accountType, billingCycle, website |

## Architecture

The pattern mirrors PM:

```
PM:  usePmTableSort (pm/hooks) → useTableSort (@webfudge/ui) → TableSortPanel (@webfudge/ui)
CRM: useCrmTableSort (crm/hooks) → useTableSort (@webfudge/ui) → TableSortPanel (@webfudge/ui)
```

CRM adds its own entity-specific `tableSortColumns.js` and `tableSortValues.js` (parallel to PM's). The shared sort logic (`useTableSort`, `TableSortPanel`, `Table` with `resizableColumns`) lives entirely in `@webfudge/ui`.
