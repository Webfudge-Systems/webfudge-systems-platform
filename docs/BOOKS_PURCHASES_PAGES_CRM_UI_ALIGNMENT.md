# Books Purchases Pages – CRM UI Alignment

## Summary
All **8 Purchases list pages** use the same `BooksListPageShell` pattern as Items and Sales: KPI cards, module tabs, status filters, search, column picker, multi-column sort, export, delete modal, and row click → detail. Data persists via mock stores (localStorage). No changes to `packages/ui/components`.

## Scope
- App: `apps/books`
- Routes (each in its own `page.tsx`):
  - `/purchases/vendors`
  - `/purchases/expenses`
  - `/purchases/recurring-expenses`
  - `/purchases/purchase-orders`
  - `/purchases/bills`
  - `/purchases/payments-made`
  - `/purchases/recurring-bills`
  - `/purchases/vendor-credits`

## Key files
| Area | Path |
|------|------|
| List shell | `apps/books/app/_components/BooksListPageShell.tsx` |
| Table columns | `apps/books/app/_components/booksPurchasesTableColumns.tsx` |
| Seeds | `apps/books/lib/mock-data/purchases/seeds.ts` |
| Stores | `apps/books/lib/mock-data/purchases/stores.tsx` |
| List helpers | `apps/books/lib/purchases/listHelpers.ts` |
| Create mappers | `apps/books/lib/purchases/formMappers.ts` |
| Detail (docs) | `apps/books/app/_components/BooksPurchasesDocDetailPage.tsx` |
| Detail (vendors) | `apps/books/app/_components/BooksVendorDetailPage.tsx` |
| Create (vendors) | `apps/books/app/_components/BooksVendorNewPage.tsx` |
| Dynamic create | `apps/books/app/purchases/[module]/new/page.tsx` |
| Sort entities | `apps/books/lib/tableSortColumns.ts`, `tableSortValues.ts` |

## Functionality
- **Stores:** `BooksPurchasesStoresProvider` nested in `BooksRecordsStoreProvider`
- **CRUD:** List + delete + create (redirect to detail) + detail view for all modules
- **Currency:** Indian formatting via `formatIndianCurrency` on vendor payables/credits
- **Sort entities:** `vendor`, `purchaseExpense`, `recurringExpense`, `purchaseOrder`, `bill`, `paymentMade`, `recurringBill`, `vendorCredit`

## Usage
Run `npm run dev:books` and navigate Purchases tabs. Add records via **+** or topbar Add; row click opens detail; delete from table actions column.
