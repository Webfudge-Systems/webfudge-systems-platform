# Platform Consistency Audit

## Summary

Cross-app audit of workspace modules, tables, and shared packages (`@webfudge/ui`, `@webfudge/utils`, `@webfudge/auth`, `@webfudge/config`). List chrome is now aligned on shared `TableResultsCount` / `TableEmptyBelow`; package export maps for auth/config were repaired; Accounts search uses the same `WorkspaceSearchModal` shell as PM/CRM.

## Scope

| Area | Apps / packages |
|------|-----------------|
| Workspace apps | `apps/crm`, `apps/pm`, `apps/accounts` |
| Stub / marketing | `apps/vendor` (stub), `apps/landing` (marketing kit OK) |
| Backend | `apps/backend` (API only — no table UI) |
| Shared | `packages/ui`, `packages/utils`, `packages/auth`, `packages/config` |
| Not in repo | `apps/hr` (lockfile remnant only) |

## What is already consistent

- Production list pages use shared `Table` (`variant="modern"` / `modernEmbedded`) — no `DataTable` / TanStack Table.
- Page headers: thin `*PageHeader` wrappers over `AppPageHeader`.
- Layout: `WorkspaceLayoutContent` + `AccessDeniedPanel` across PM/CRM/Accounts.
- Column prefs: `useTableColumnPreferences` + `TableColumnPicker` on major lists.
- Sort: `useTableSort` / `TableSortDropdown` on key CRM + PM lists.
- Cells, KPIs, modals, dashboards largely imported from `@webfudge/ui`.
- Formatters, list filters, Strapi paging, media helpers in `@webfudge/utils`.

## Fixes applied in this pass

1. **`TableEmptyBelow` / `TableResultsCount`** — styles matched CRM list empties (`border-t`, `text-lg`); adopted on CRM/PM/Accounts list pages (+ client-account detail contacts tabs).
2. **`@webfudge/auth`** — added missing `./components`, `./hooks`, `./services` index entry files.
3. **`@webfudge/config`** — added `./constants` module so the package export map resolves.
4. **Accounts `GlobalSearchModal`** — uses `WorkspaceSearchModal` (coming-soon content kept).
5. **CRM `/sales/leads`** — redirects to `/sales/lead-companies` (removed legacy stub UI).

## Remaining gaps (priority)

| Priority | Issue | Recommendation |
|----------|--------|----------------|
| High | PM ↔ CRM **client accounts** list/detail ~duplicated (~1.2k lines each) | Extract shared module or package surface; keep app-specific RBAC/URLs as props |
| High | **Sort parity** — CRM proposals/invoices/tasks/projects/meetings/automations and all Accounts lists lack `TableSortDropdown` | Extend existing `useCrmTableSort` / Accounts hook pattern |
| Medium | CRM **dashboard HTML tables** (`ModalDataTable`, Sales* widgets, LeadsAssigned*) | Prefer `Table variant="modernEmbedded"` |
| Medium | **Accounts page chrome** — `bg-white min-h-full` vs CRM/PM transparent padding | Align shell background/padding with workspace apps |
| Medium | Accounts **filters** missing vs CRM/PM filter modals | Reuse `@webfudge/utils` `listFilters` + shared filter modal pattern |
| Low | No shared Confirm/Toast/DatePicker/FileUpload field in UI | Add only when a second app needs the same UX |
| Low | `TableCrmCells` naming is CRM-centric but used by PM | Optional rename/split later — not blocking |
| Low | Package `.d.ts` declared but missing; `STRUCTURE.md` outdated | Types / docs hygiene |
| Out of scope | Vendor stub, HR not present | Build when productized |

## Canonical list-page pattern

```jsx
import {
  Table,
  TableResultsCount,
  TableEmptyBelow,
  TableColumnPicker,
  TableSortDropdown,
  Pagination,
  LoadingSpinner,
  TabsWithActions,
  KPICard,
} from '@webfudge/ui'

<TableResultsCount count={totalItems} />
<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
  {loading ? (
    <div className="flex justify-center p-12">
      <LoadingSpinner size="lg" message="Loading…" />
    </div>
  ) : (
    <>
      <Table columns={columns} data={rows} variant="modern" {...tableResizeProps} />
      {rows.length === 0 && (
        <TableEmptyBelow
          icon={SomeIcon}
          title="No items found"
          description="…"
          action={<Button variant="primary">Add</Button>}
        />
      )}
      {totalPages > 1 && (
        <Pagination … />
      )}
    </>
  )}
</div>
```

Use `bordered={false}` on `TableEmptyBelow` for empty kanban/full shells without a table header above.

## Package inventory (reuse first)

| Package | Use for |
|---------|---------|
| `@webfudge/ui` | Table stack, cells, forms, Modal, KPI/dashboard, AppShell/headers, EntityActivity*, WorkspaceSearchModal |
| `@webfudge/utils` | formatters, `listFilters`, `paginateStrapiList`, media upload, crmShared industry/contact helpers, calendar |
| `@webfudge/auth` | AuthProvider, ProtectedRoute, authService, user profile helpers |
| `@webfudge/config` | theme / brand / constants |

Do **not** put landing marketing motion components into `@webfudge/ui`. Prefer app-local wrappers when one app needs different visuals (`protect-shared-ui-components` rule).

## Usage / Migration

- New list modules: follow the canonical pattern above; import helpers from `@webfudge/ui`, not copy markup.
- Before adding a local table/empty/search shell, check packages first.
- Next recommended workstream: **client-accounts dedupe** and **sort parity** on remaining CRM + Accounts lists.
