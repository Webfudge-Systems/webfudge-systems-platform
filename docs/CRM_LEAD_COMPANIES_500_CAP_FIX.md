# CRM Lead Companies — 500 Result Cap Fix

## Summary

Lead Companies KPIs correctly showed **1419** total leads, but the table showed **only 500** when Status (or Primary Contact) sort, Kanban, or Members view was active. No frontend deploy was required for the symptom to appear — once the org crossed 500 leads (or Status sort was stored in localStorage), the existing one-shot `pageSize: 5000` fetch was silently clamped by the backend.

## Scope

- `apps/crm/app/sales/lead-companies/page.js` — bulk list load
- `apps/crm/lib/api/leadCompanyService.js` — `fetchAll` pagination
- Related notes: `docs/CRM_LEAD_STATUS_CONVERTED_UPDATE.md`, `docs/LEAD_COMPANIES_LOAD_PERFORMANCE.md`

## Root cause

1. Status / Primary Contact sort (and Kanban / Members) request the **full** filtered set so ordering can run client-side.
2. The page previously called `getAll` once with `pageSize: 5000`.
3. Backend `lead-company` `find` uses `readListQuery({ maxPageSize: 500 })`, so only **500** rows returned.
4. The UI set `totalItems = rows.length` (500), ignoring `meta.pagination.total` (1419).
5. KPIs use `GET /lead-companies/stats` counts, so they stayed correct — hence the mismatch.

## Fix

- Bulk paths call `leadCompanyService.fetchAll(params)`, which pages at **500** until `pageCount` is exhausted.
- `fetchAll` strips any incoming `pagination[*]` from `buildListParams` so the loop owns paging.
- Default server-paginated table (15/page, API sort) is unchanged and already used `meta.pagination.total`.

## Usage / verification

1. Deploy CRM frontend (backend already had the 500 cap).
2. On `/sales/lead-companies`, sort by **Status** — “Showing N results” should match Total Leads KPI.
3. Open Kanban / Members — boards should include leads beyond the first 500.
4. Clear Status sort if you only need paged table loads (lighter traffic).
