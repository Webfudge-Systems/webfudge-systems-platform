# CRM List Pages — Load Performance

## Summary

Lead Companies and Contacts list pages were slow because they downloaded **all** rows (and, for leads, **all contacts**) on every visit. Both pages now use **server-side pagination** (15 rows per request), **dedicated stats endpoints** for KPI/tab counts, and **scoped backend queries** instead of client-side filtering.

## Root causes

### Lead Companies (`/sales/lead-companies`)

1. **`mergeContactsFromContactsApi: true`** — On each page load, the frontend called `contactService.getAll()` with a large page size even though the backend already attaches contacts for the current page via scoped `_lnk` hydration.
2. **Backend contact attach fallback** — When populate failed, the controller loaded up to 5,000 org-wide contacts per list request.

### Contacts (`/sales/contacts`)

1. **`contactService.getAll()` on mount** — Loaded up to 100 contacts per page but walked client-side filter/sort on the downloaded set; large orgs still paid for many pages.
2. **Client-side filter/sort/paginate** — Search, tabs, and advanced filters ran in the browser on the full dataset.
3. **Filter dropdowns from full list** — Assignee/source options were derived by scanning every loaded contact.

## Changes

### Backend (`apps/backend`)

**Lead companies**

- `attachContactsToLeadCompanies` — Reads `contacts_lead_company_lnk` for the current page's lead IDs, then loads only those contacts.
- `GET /lead-companies/stats` — Fast counts per status + source/type facets.
- `buildLeadListFilters` — Merges full `query.filters` (search, tabs, date range, assignee, etc.).

**Contacts**

- `GET /contacts/stats` — Fast counts for total, withEmail, withPhone, withCompany + source/preferred-method facets.
- `find` — Merges full `query.filters` via `buildContactListFilters`.
- `attachRelationsToContacts` via `crm-relation-attach.js` for Strapi 5 populate gaps.

### CRM frontend

**Lead Companies page**

- Removed `mergeContactsFromContactsApi: true` on list load; relies on backend scoped attach.
- Server-side pagination via `leadCompanyService.buildListParams` + `getAll`.
- Tab/KPI counts from `leadCompanyService.getStats()`.

**Contacts page**

- Server-side pagination via `contactService.buildListParams` + `getAll`.
- Tab/KPI counts from `contactService.getStats()`.
- Assignee filter options from org users API.
- Debounced search; filters/tabs/sort sent to API.

**Services**

- `contactService.buildListParams` / `getStats` — mirror lead-companies list pattern.
- `leadCompanyService.buildListParams` / `getStats` — dedicated backend stats endpoint.
- `leadCompanyService.mergeContactsOntoLeadCompanies` — When used (dashboard `fetchAll` + merge), fetches contacts by lead ID chunks instead of full org scan.

## Usage / migration

- Restart the Strapi backend after deploy so `/contacts/stats` and `/lead-companies/stats` are registered.
- Hard refresh CRM (or clear Redis API cache if enabled).
- Dashboard widgets that need full datasets still use `fetchAll()`; list UI does not.

## Scope

| Area | Files |
|------|--------|
| Backend shared | `src/utils/crm-relation-attach.js` |
| Backend lead | `src/api/lead-company/controllers/lead-company.js`, `routes/lead-company.js` |
| Backend contact | `src/api/contact/controllers/contact.js`, `routes/contact.js` |
| CRM services | `lib/api/leadCompanyService.js`, `lib/api/contactService.js` |
| CRM pages | `app/sales/lead-companies/page.js`, `app/sales/contacts/page.js` |

## Relation attach (CRM + PM)

Strapi 5 `entityService` populate often returns **empty** for manyToOne / inverse oneToMany relations even when `_lnk` rows exist. List endpoints hydrate via `apps/backend/src/utils/crm-relation-attach.js`:

| Entity | Attached relations |
|--------|-------------------|
| Contact | `leadCompany`, `clientAccount`, `assignedTo` |
| Client account | `contacts[]`, `assignedTo` |
| Deal | `assignedTo`, `leadCompany`, `clientAccount`, `contact` |
| Project | `projectManager`, `teamMembers` |
| Task | `assignee`, `assigner`, `collaborators` |

## Before / after

| Before | After |
|--------|--------|
| Lead list: stats + 100 rows + full contact merge | Lead list: stats + 1 paginated request (~15 rows + scoped contacts) |
| Contacts list: client filter on downloaded set | Contacts list: stats + 1 paginated request |
| KPI/tab counts wait for full download | KPI/tab counts from stats immediately |

## Related

- Redis API cache: `docs/REDIS_CACHE.md`
- Task list cache (excluded from Redis): `docs/TASK_LIST_CACHE_FIX.md`
