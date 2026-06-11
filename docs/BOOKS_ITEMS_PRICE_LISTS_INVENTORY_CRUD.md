# Books Items: Price Lists & Inventory Adjustments CRUD

## Summary

Price Lists and Inventory Adjustments now match the All Items page pattern: KPI cards, tab bar, CRM-style data table, and full add / view / edit / delete flows with localStorage-backed stores.

## Scope

- **Apps:** `apps/books`
- **List pages:** `items/price-lists/page.tsx`, `items/inventory-adjustments/page.tsx`
- **Entity routes:** detail, edit, and static `new` routes under each module
- **Stores:** `useBooksPriceListsStore`, `useBooksInventoryAdjustmentsStore` (via `BooksRecordsStoreProvider`)
- **Shared UI:** `BooksListPageShell`, `BooksRecordEntityPageHeader`, table column hooks, form configs

## Details

### List pages

Both modules use the same shell as All Items:

- Top KPI row (totals, status breakdowns)
- Secondary pill tabs with counts
- Search, filters, export, and sticky ACTIONS column
- Row click → detail; toolbar add → `/new`

### CRUD routes

| Module | List | New | Detail | Edit |
|--------|------|-----|--------|------|
| Price Lists | `/items/price-lists` | `/items/price-lists/new` | `/items/price-lists/:id` | `/items/price-lists/:id/edit` |
| Inventory Adjustments | `/items/inventory-adjustments` | `/items/inventory-adjustments/new` | `/items/inventory-adjustments/:id` | `/items/inventory-adjustments/:id/edit` |

Static `new/page.tsx` routes prevent `[id]` from catching `id=new`.

### Data persistence

Records are stored in `localStorage` keys:

- `books.mock-price-lists.v1`
- `books.mock-inventory-adjustments.v1`

Create redirects to the new record’s detail page (same as All Items).

### Navigation

`isBooksEntityPage()` in `lib/routes.ts` hides the global topbar on detail, edit, and new routes for both modules.

## Usage

1. Open **Items → Price Lists** or **Inventory Adjustments** from the sidebar.
2. Use **New** or the table **+** to create a record.
3. Use view / edit / delete icons in the ACTIONS column, or open a row to view details.
4. Detail pages include Edit, Share, Download, and Delete in the entity header toolbar.

## Migration

No backend or env changes. Clear browser localStorage for the keys above to reset to seed data.
