# CRM & PM Filter Modals Update

## Summary
Expanded and wired up list-page filter modals across CRM and PM. Pages that previously had placeholder filter buttons or minimal options now use a consistent **draft → Apply → Clear all** flow. Shared date/range helpers live in `@webfudge/utils` (`listFilters`).

## Scope

### PM
- `apps/pm/app/my-tasks/page.js` — status, priority, project, assignee, reporter, due date, tags, title
- `apps/pm/app/projects/page.js` — status, owner, client name, created range, project name

### CRM
- `apps/crm/app/sales/deals/page.js` — stage, priority, assignee, value, close date, company, title
- `apps/crm/app/clients/proposals/page.js` — status, value, client, created, valid-until, title
- `apps/crm/app/clients/invoices/page.js` — status, amount, bill-to, invoice date, due date
- `apps/crm/app/clients/tasks/page.js` — added lead company, client account, deal, project filters

### Shared utilities
- `packages/utils/src/listFilters/index.js` — `matchesCreatedDateRange`, `matchesDueDateRange`, `matchesNumericRange`, `hasActiveListFilters`

### Already functional (unchanged)
- CRM: lead companies, contacts, client accounts, projects, automations
- PM: client accounts

## Details

### Behavior
1. Click the filter icon in the page header or toolbar.
2. Set criteria in the modal (draft state).
3. **Apply Filters** commits criteria and refreshes the visible list.
4. **Clear all** resets draft and applied filters.
5. Tabs and search continue to combine with modal filters.
6. Pagination resets to page 1 when filters change.

### PM My Tasks
Previously only Priority and Project were shown; changes applied immediately without a proper apply step. Now supports full task filtering with client-side matching (API still pre-filters by priority/project when set).

### PM Projects
Added client name, created date range, and project name filters. Kanban and table views respect filtered/sorted project lists.

## Usage
Open any updated list page → filter icon → set options → **Apply Filters**. The filter icon highlights when any modal filter is active (`hasActiveFilters`).
