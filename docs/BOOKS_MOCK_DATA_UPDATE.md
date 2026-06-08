# Books App Mock Data Update

## Summary

The Books app list pages, dashboard, banking, reports, and time-tracking views now load from centralized mock data in `apps/books/lib/mock-data/` instead of empty tables or live Strapi API calls. This gives a consistent demo experience across Sales, Purchases, Items, Banking, Accountant, Documents, and Home hub pages.

## Scope

- **New:** `apps/books/lib/mock-data/` (`entities`, `list-rows`, `items`, `banking`, `accountant`, `documents`, `helpers`, `index`)
- **Updated:** All Books list `page.tsx` files that previously used `data={[]}` or `booksApi` fetches
- **Unchanged:** `lib/api.ts` remains for future Strapi wiring; login and form/new pages are not affected
- **Home hub:** Existing `homeHubMock.ts` for Activity / Announcements / Recent Updates is unchanged

## Mock data layout

| Module | Export examples | Used by |
|--------|-----------------|---------|
| `entities.ts` | `MOCK_CUSTOMERS`, `MOCK_INVOICES`, `MOCK_EXPENSES`, … | Dashboard, customers, invoices, projects, timesheet |
| `list-rows.ts` | `MOCK_ESTIMATES`, `MOCK_BILL_ROWS`, `MOCK_VENDOR_ROWS`, … | Sales/Purchases list shells |
| `items.ts` | `MOCK_ITEMS`, `MOCK_PRICE_LISTS`, … | Items module |
| `banking.ts` | `MOCK_BANKING_OVERVIEW`, `MOCK_BANK_ACCOUNTS` | Banking + Reports |
| `accountant.ts` | `MOCK_MANUAL_JOURNALS`, `MOCK_CHART_OF_ACCOUNTS`, … | Accountant module |
| `documents.ts` | `MOCK_DOCUMENTS`, `MOCK_BANK_STATEMENTS` | Documents module |

Monetary entity fields use **paise** (integer), matching the Books API convention. List-row `amount` fields use display strings (e.g. `₹12,400.00`) where tables render without `formatCurrency`.

## Supabase

Books does **not** use Supabase. A legacy `lib/supabase.ts` stub was not referenced anywhere (no imports, not in `package.json`). No Supabase env vars are required for Books.

## Usage / migration

To extend demo data, edit the relevant file under `lib/mock-data/` and re-export from `index.ts` if needed.

To switch a page back to the API later, replace mock imports with the appropriate `booksApi` / `bankingApi` call and map the response as before.
