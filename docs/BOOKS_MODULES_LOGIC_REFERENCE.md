# Books App — Module Logic Reference

Complete reference for **every Books module**: what it does, how the UI works, what data it uses, and what the Strapi backend implements.

For **integration status and wiring tasks**, see [BOOKS_FUNCTIONALITY_GUIDE.md](./BOOKS_FUNCTIONALITY_GUIDE.md).

---

## Summary

Books (`apps/books`, port **3005**) is a Zoho Books–style accounting app with **52 routes**, a shared CRM-aligned list/add UI, and a **full Strapi API surface**. Most list pages and all create forms are UI scaffolding; live data today is concentrated in **Home**, **Customers**, **Invoices**, **Projects**, **Timesheet**, and **Banking**.

| Layer | Location |
|-------|----------|
| Pages | `apps/books/app/` |
| API client | `apps/books/lib/api.ts` |
| Types | `apps/books/lib/types.ts` |
| Route meta / tabs | `apps/books/lib/routes.ts`, `lib/tabs.ts` |
| Shared list shell | `apps/books/app/_components/BooksListPageShell.tsx` |
| Create form shell | `apps/books/app/_components/BooksCrmAddEntityPage.tsx` |
| Layout / auth | `apps/books/components/layout/LayoutContent.tsx` |
| Backend aggregates | `apps/backend/src/api/books/` |
| Org-scoped CRUD | `apps/backend/src/utils/books-crud.js` |

---

## Cross-cutting architecture

### Request flow

```mermaid
flowchart LR
  Page[Next.js page] --> ApiClient[lib/api.ts]
  ApiClient -->|"Bearer + X-Organization-Id"| Strapi[Strapi :1337]
  Strapi --> CRUD[books-crud.js]
  Strapi --> BooksCtrl[/books/* controllers]
```

Every API call sends:

- `Authorization: Bearer <token>` (`strapi_token` or `auth-token` in localStorage)
- `X-Organization-Id` (`current-org-id` in localStorage)
- Base URL: `NEXT_PUBLIC_STRAPI_URL` → `NEXT_PUBLIC_API_URL` → fallback `http://localhost:1338`

**Customers** are Strapi `/contacts` with `isCustomer: true`, not a separate content type.

**Monetary values** are integers in **paise/cents** everywhere in the API. Display with `formatCurrency` from `@webfudge/utils`.

### Navigation

| Sidebar item | Default route | Sub-tabs from `lib/tabs.ts` |
|--------------|---------------|-----------------------------|
| Dashboard | `/home` | Dashboard, Activity, Recent Updates |
| Items | `/items/all` | All Items, Price Lists, Inventory Adjustments |
| Banking | `/banking` | (none) |
| Sales | `/sales` → redirects to `/sales/customers` | 9 sales sub-modules |
| Purchases | `/purchases` → `/purchases/vendors` | 8 purchase sub-modules |
| Time Tracking | `/time-tracking/projects` | Projects, Timesheet |
| Accountant | `/accountant` → `/accountant/manual-journals` | 5 accountant sub-modules |
| Reports | `/reports` | (none) |
| Documents | `/documents` | All Documents, Bank Statements |

`LayoutContent` redirects module roots (e.g. `/sales`) to the first tab. `getAddHref()` in `lib/routes.ts` maps the current path to its create URL.

### Feature toggles

`ConfigureFeaturesModal` persists optional modules to `localStorage` (`books-features`):

- **Sales (hideable):** Estimates, Retainer Invoices, Sales Orders, Delivery Challans
- **Purchases (hideable):** Purchase Orders

Hub pages (`/sales`, `/purchases`) filter cards via `lib/books-features.ts`.

### Shared UI patterns

#### `BooksListPageShell`

Used by Sales, Purchases, and Accountant list pages (via thin re-export aliases).

| Feature | Logic |
|---------|-------|
| KPI row | Props-driven; each page computes totals client-side |
| Tabs | Optional; page filters `data` by tab key |
| Search | Client-side JSON stringify of row values |
| Column picker | `BooksTableColumnPicker` — visibility + drag order, persisted per route in localStorage |
| Export | CSV download of visible columns |
| Filter modal | Optional `filterModalBody`; many pages use placeholder |
| Empty state | Icon + title + description when `data` is empty |
| Row click | Optional `onRowClickHref` — **no `[id]` detail routes exist yet** |

#### `BooksCrmAddEntityPage`

Generic multi-section create form (Input / Select / Textarea). Validates required fields client-side. **Submit is a 500ms timeout only** — no API call. All `*/new` pages use this until wired.

#### `ModulePage`

Fallback list wrapper with **2 hardcoded placeholder rows** when no real data is passed. Used for Documents, Price Lists, Inventory Adjustments, and Projects/new.

### Data wiring legend

| Label | Meaning |
|-------|---------|
| **LIVE** | Fetches Strapi on mount |
| **STATIC** | UI complete, `data={[]}` or hardcoded rows |
| **MOCK** | `homeHubMock.ts` or `ModulePage` defaults |
| **FORM-ONLY** | Create form UI, fake submit |

### Org activation

`POST /books/activate` (Owner/Admin only) runs `bootstrapBooksOrg`:

- Seeds **26 default chart-of-accounts** entries (assets, liabilities, equity, income, COGS, expenses)
- Sets `booksActivated: true` on the organization
- Idempotent — safe to call again

---

## Module: Home / Dashboard

### Routes

| Route | Component | Data |
|-------|-----------|------|
| `/home` | `(dashboard)/home/page.tsx` | **LIVE** |
| `/home/activity` | `BooksHomeActivityPage` | **MOCK** (`HOME_ACTIVITY_MOCK`) |
| `/home/recent-updates` | `BooksHomeRecentUpdatesPage` | **MOCK** (`HOME_RECENT_UPDATES_MOCK`) |
| `/home/announcements` | Redirect | → `/home` |

### Dashboard (`/home`) logic

**Data fetch (parallel on mount):**

- `booksApi.fetchInvoices()`
- `booksApi.fetchExpenses()`
- `booksApi.fetchTimeEntries()` (tasks)
- `booksApi.fetchCustomers()`
- `booksApi.fetchBills()`
- `booksApi.fetchVendors()`

Does **not** call `dashboardApi.kpis()` — KPIs are computed client-side from raw entity arrays.

**KPI calculations:**

| KPI | Logic |
|-----|-------|
| Total receivables | Sum `balanceDue` on invoices with status Sent/Viewed/Partial/Overdue |
| Total payables | Sum `balanceDue` on bills with open statuses |
| Net position | Receivables − payables |
| Month revenue | Sum `total` on Paid invoices in current calendar month |
| MoM trend | Compare current vs previous month invoiced totals; `trendToKpiProps()` maps to KPICard change arrows |
| Unbilled hours | Sum hours on billable, not-invoiced time entries |
| Unbilled expenses | Sum billable expenses not yet invoiced |

**Charts:**

- `buildAnalyticsAreaMonthly()` — 8-month invoice revenue area chart
- `buildProfitLossMonths()` — income vs expense bars from invoices + expenses by month

**Widgets:**

- `BooksQuickAccessCard` — shortcut counts (customers, invoices, bills, projects, etc.)
- `TotalBalanceCard` / `StackedBankCards` — derived from fetched data (not `bankingApi`)
- `MonthlySpendingLimitCard` — spend gauge; limit defaults to 0
- `RecentActivitiesTable` — top 12 invoices mapped to activity rows

### Activity hub (`/home/activity`)

- Tabs: All, Sales, Purchases, Banking, Contacts, Accountant
- Search filters mock timeline entries
- Groups by Today / Yesterday / This week
- KPI counts derived from mock data length per module

### Recent Updates hub (`/home/recent-updates`)

- Audit-style table: Created / Updated / Deleted / Emailed / Paid action pills
- Module filter tabs
- Column picker (same pattern as list pages)
- Backend has `dashboardApi.recentActivities()` but it is **not wired** here

---

## Module: Sales

**Hub:** `/sales` — card grid linking to 9 sub-modules; optional modules hidden via feature toggles.

**List shell:** `BooksSalesListShell` → `BooksListPageShell`

**API namespace:** `customersApi`, `invoicesApi`, `estimatesApi`, `creditNotesApi`, `paymentsReceivedApi`, `retainerInvoicesApi`, `salesOrdersApi`, `deliveryChallansApi`, `recurringInvoicesApi`

### Customers (`/sales/customers`) — LIVE

| Aspect | Detail |
|--------|--------|
| API | `booksApi.fetchCustomers()` → `GET /contacts?isCustomer=true` |
| KPIs | Total count, lifetime billed, receivables, unused credits — summed from fetched rows |
| Tabs | All / With Receivables / With Credits / No Receivables — client filter on `receivables` and `unusedCredits` |
| Columns | name, company, email, phone, receivables, unusedCredits |
| Create | `/sales/customers/new` — FORM-ONLY |

**Entity fields (`Customer`):** name, email, phone, company, `ClientType`, currency, billing/shipping address, `unusedCredits`, `receivables`, `lifetimeBilled`, `portalLink`.

### Invoices (`/sales/invoices`) — LIVE

| Aspect | Detail |
|--------|--------|
| API | `booksApi.fetchInvoices()` → `GET /invoices` |
| Tabs | All / Draft / Sent / Paid / Overdue |
| Status badges | Normalized string → Badge variant |
| Columns | date, number, customerId, status, dueDate, total, balanceDue |
| Create | `/sales/invoices/new` — FORM-ONLY; hardcoded customer dropdown options |

**Backend extras:** `PUT /invoices/:id/status`, `POST /invoices/from-time` (billable time → invoice). Invoice controller uses **CRM RBAC** (`requireModuleAccess` for `client_invoices`).

**Entity fields (`Invoice`):** number, customerId, date, dueDate, `InvoiceStatus`, lineItems, subtotal, tax, total, balanceDue, optional projectId / milestoneRef / retainerBalanceRemaining.

### Estimates (`/sales/estimates`) — STATIC

Tabs: Draft / Sent / Accepted. KPIs and counts all zero. API ready: `estimatesApi` with `convertToInvoice`, `updateStatus`.

### Retainer Invoices (`/sales/retainer-invoices`) — STATIC

API: `retainerInvoicesApi`.

### Sales Orders (`/sales/sales-orders`) — STATIC

Feature-gateable. API: `salesOrdersApi`.

### Delivery Challans (`/sales/delivery-challans`) — STATIC

Feature-gateable. API: `deliveryChallansApi`.

### Payments Received (`/sales/payments-received`) — STATIC

Tabs: Cleared / Pending. API: `paymentsReceivedApi`.

### Recurring Invoices (`/sales/recurring-invoices`) — STATIC

API: `recurringInvoicesApi`.

### Credit Notes (`/sales/credit-notes`) — STATIC

API: `creditNotesApi`.

### Dynamic create routes (`/sales/[module]/new`)

`BooksCrmAddEntityPage` with per-module field configs for: estimates, retainer-invoices, sales-orders, delivery-challans, recurring-invoices, credit-notes, payments-received. All FORM-ONLY.

---

## Module: Purchases

**Hub:** `/purchases` — 8 sub-module cards; Purchase Orders can be feature-hidden.

**List shell:** `BooksPurchasesListShell` → `BooksListPageShell`

**API namespace:** `vendorsApi`, `billsApi`, `expensesApi`, `paymentsMadeApi`, `vendorCreditsApi`, `purchaseOrdersApi`, `recurringExpensesApi`

**All list pages are STATIC** (`data={[]}`) — APIs exist but pages do not fetch.

### Vendors (`/purchases/vendors`)

| Aspect | Detail |
|--------|--------|
| Intended API | `vendorsApi.list` → `GET /vendors` |
| Tabs | All / With Payables / With Credits / No Payables |
| Columns | name, company, email, phone, payables, unusedCredits |
| Create | `/purchases/vendors/new` — FORM-ONLY |

### Expenses (`/purchases/expenses`)

Tabs: All / Billable / Reimbursable. Backend: `expensesApi.addToInvoice` links expense to invoice.

**Entity fields (`Expense`):** date, `ExpenseCategory`, vendorId, amount, billable, clientId, projectId, reimbursable, status.

### Recurring Expenses — STATIC

### Purchase Orders — STATIC (feature-gateable)

### Bills — STATIC

Backend: `billsApi.updateStatus`. Entity mirrors invoice structure with vendorId.

### Payments Made — STATIC

### Recurring Bills — STATIC

### Vendor Credits — STATIC

### Dynamic create (`/purchases/[module]/new`)

FORM-ONLY configs for: expenses (with `ExpenseCategory` enum), recurring-expenses, purchase-orders, bills, payments-made, recurring-bills, vendor-credits.

---

## Module: Items

**Hub:** `/items` — links to All Items, Price Lists, Inventory Adjustments.

**API:** `itemsApi` — CRUD + `softDelete` (sets `isActive: false`).

### All Items (`/items/all`) — STATIC

| Aspect | Detail |
|--------|--------|
| Data | 2 hardcoded `ITEM_ROWS` (not API) |
| Tabs | All / Services / Packages — filter by `ItemType` |
| KPIs | Count by type, total catalog value |
| Add href | `/items/all/new` — **route does not exist**; topbar `getAddHref` points to `/items/new` (also missing) |

**Entity fields (`Item`):** name, sku, `ItemType` (Service default for agency workflows), description, rate, taxable, unit.

### Price Lists (`/items/price-lists`) — MOCK

`ModulePage` with 2 placeholder rows. No backend content type wired in UI.

### Inventory Adjustments (`/items/inventory-adjustments`) — MOCK

`ModulePage` stub. No backend wiring in UI.

---

## Module: Banking

**Route:** `/banking` → `BankingOverview.tsx` — **LIVE**

| Aspect | Detail |
|--------|--------|
| API | `bankingApi.overview()` → `GET /books/banking/overview` |
| KPIs | Total balance, account count, uncategorized transaction count, cash & manual total |
| Table | Accounts with search, column picker, CSV export |
| Add account | Button present — **no-op** (no create handler) |
| Filter modal | Placeholder |

### Backend banking logic

`bankingOverview` computes per-account balance = `openingBalance` + sum of transactions. Returns uncategorized count and cash/manual account totals.

### Available but unused in UI

- `bankingApi.accounts` — CRUD on `/bank-accounts`
- `bankingApi.transactions` — list, uncategorized, categorize, bulkCategorize
- `bank-transaction` controller: `categorize`, `bulkCategorize`, `uncategorized` routes

**Entity fields:** `BankAccount` (name, accountNumber, type, balance), `BankTransaction` (accountId, date, description, amount, category, Categorized/Uncategorized status).

---

## Module: Time Tracking

**Tabs:** Projects, Timesheet

**API:** `projectsApi`, `tasksApi`, `timesheetApi`

### Projects (`/time-tracking/projects`) — LIVE

| Aspect | Detail |
|--------|--------|
| API | `booksApi.fetchProjects()` |
| Tabs | All / Active / Completed / Archived |
| KPIs | Total logged hours, billable hours, unbilled amount |
| Columns | name, customerId, billingMethod, budget, status, hours metrics |

**Entity fields (`Project`):** name, customerId, `BillingMethod`, budget, currency, status, totalLoggedHours, billableHours, unbilledAmount.

### Timesheet (`/time-tracking/timesheet`) — LIVE (partial)

| Aspect | Detail |
|--------|--------|
| API | `booksApi.fetchTimeEntries()` (tasks list) |
| UI | Weekly / Daily tabs (same table); Start/Stop timer buttons |
| Timer | **Local state only** — does not call `tasksApi.timerStart` / `timerStop` |
| Generate Invoice | Button present — **no handler** (backend has `invoicesApi.fromTime`) |

Backend `GET /books/timesheet/weekly` builds a 7-day grid by assignee with billable totals — defined in API client but page uses task list instead.

### Projects/new (`/time-tracking/projects/new`) — MOCK

Uses `ModulePage` titled "New Project" instead of a real create form.

---

## Module: Accountant

**Hub:** `/accountant` — 5 module cards.

**List shell:** `BooksAccountantListShell` + optional `BooksChartPlaceholderCard` on manual journals.

**API:** `journalsApi`, `chartOfAccountsApi`

**All list pages STATIC.**

### Manual Journals (`/accountant/manual-journals`)

Placeholder charts for posting trend and entries-by-type. Backend:

- Auto `journalNumber` via sequence
- Debit/credit balance validation on create
- `publish` — updates chart-of-accounts balances by account code
- `reverse` — creates reversing entry
- `GET /books/accountant/posting-trend` — last 6 months published journal counts

**Entity fields (`ManualJournal`):** date, journalNumber, referenceNumber, Draft/Published status, entries[] (account, debit, credit), notes.

### Bulk Update — STATIC

### Currency Adjustments — STATIC

### Chart of Accounts (`/accountant/chart-of-accounts`)

Backend: `chartOfAccountsApi.trialBalance`. Seeded on org activation (26 default accounts).

### Transaction Locking — STATIC

### Create routes (`/accountant/[module]/new`)

FORM-ONLY for all 5 sub-modules.

---

## Module: Reports

**Route:** `/reports` → `BooksReportsHub`

| Component | Data | Logic |
|-----------|------|-------|
| Hub KPIs | Static placeholders | Links to report sections |
| `BooksSystemAnalytics` | Fetches invoices, expenses, time, projects, bank accounts | **`zeroMode = true`** forces all KPI display to 0 |
| `BooksFinancialCharts` | Same fetches | **`zeroMode`** — charts show placeholder zeros |
| Balance sheet / Cash flow links | — | Point to `/coming-soon` |

### Backend reports (`reportsApi`) — not wired in UI

| Endpoint | Logic |
|----------|-------|
| `/books/reports/profit-loss` | Income/expenses; accrual vs cash basis; date range |
| `/books/reports/balance-sheet` | COA grouped by asset / liability / equity |
| `/books/reports/cash-flow` | Delegates to books cash-flow controller |
| `/books/reports/sales-by-customer` | Invoice totals and paid per customer |
| `/books/reports/expenses-by-category` | Category breakdown with % |
| `/books/reports/receivables-aging` | 0–30 / 31–60 / 61–90 / 90+ day buckets |
| `/books/reports/payables-aging` | Same for bills |
| `/books/reports/utilization` | Billable vs total hours by user |

### Dashboard aggregates (also unused by home page)

`dashboardApi`: `kpis`, `profitLoss`, `cashFlow`, `recentActivities`, `topExpenses` — all implemented server-side in `apps/backend/src/api/books/controllers/books.js`.

---

## Module: Documents

**Tabs:** All Documents, Bank Statements

| Page | Data |
|------|------|
| `/documents` | **MOCK** — `ModulePage`, 2 fake rows |
| `/documents/bank-statements` | **MOCK** |

**API ready:** `documentsApi` → `GET/POST /documents`

**Entity fields (`Document`):** fileName, fileUrl, uploadedBy, uploadedOn, Processed/Unreadable status, details, inbox (AllDocuments / BankStatements).

Topbar Add is disabled (`getAddHref` returns null for documents).

---

## Module: Threads

**Route:** `/threads` — **STATIC** empty state ("will appear when connected to backend").

Not in sidebar. No API client or Strapi integration defined for Books threads.

---

## Module: Auth & Layout

| Route | Logic |
|-------|-------|
| `/login` | `@webfudge/auth` login form |
| `/unauthorized` | Access denied panel |
| `/` | Redirects to `/home` |
| `/coming-soon` | Placeholder for unfinished features |

**`LayoutContent`:**

- Client-side auth guard — unauthenticated users → `/login`
- Renders Sidebar, Topbar, SubPageTabs, ConfigureFeaturesModal
- Auto-redirects module roots to first tab
- No Next.js `middleware.ts` server guard

**Theme:** `BooksThemeProvider` — dark/light via `books-theme` in localStorage.

---

## Backend reference

### Org-scoped CRUD (`books-crud.js`)

`makeBooksCrudController(uid)` provides:

- `find` — pagination, `search`, `status` query filters
- `findOne`, `create`, `update`, `delete` — all scoped to `ctx.state.orgId`

Used by: items, vendors, bills, expenses, estimates, credit-notes, payments, purchase-orders, recurring-*, bank-accounts, bank-transactions, manual-journals, chart-of-accounts, documents, sales-orders, delivery-challans, retainer-invoices, vendor-credits, and line-item types.

### Custom controller logic (beyond base CRUD)

| Entity | Extra behavior |
|--------|----------------|
| Manual Journal | publish/reverse updates COA balances |
| Invoice | CRM RBAC gate on `client_invoices` |
| Bill | Custom status update routes |
| Estimate | `convertToInvoice`, status routes |
| Expense | `addToInvoice` |
| Bank Transaction | categorize, bulkCategorize, uncategorized |
| Bank Account | `transactions` sub-route |

### Content types (representative)

`invoice`, `bill`, `vendor`, `expense`, `item`, `bank-account`, `bank-transaction`, `manual-journal`, `chart-of-account`, `estimate`, `credit-note`, `purchase-order`, `project`, `task`, `document`, `payment-received`, `payment-made`, `recurring-invoice`, `recurring-expense`, `recurring-bill`, `sales-order`, `delivery-challan`, `retainer-invoice`, `vendor-credit`, plus line-item component types.

---

## Integration maturity matrix

| Module | UI | API wired | Backend |
|--------|-----|-----------|---------|
| Home dashboard | ✅ | Partial (entity fetches, not dashboard KPI endpoint) | ✅ |
| Home activity/updates | ✅ | ❌ Mock | ✅ (`recentActivities`) |
| Customers | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ (CRM-gated) |
| Sales (other 7 lists) | ✅ | ❌ | ✅ |
| Purchases (all 8 lists) | ✅ | ❌ | ✅ |
| Items | ✅ | ❌ Mock/static | ✅ |
| Banking overview | ✅ | ✅ | ✅ |
| Banking CRUD/categorize | Partial | ❌ | ✅ |
| Projects | ✅ | ✅ | ✅ |
| Timesheet | ✅ | Partial (no timer/invoice actions) | ✅ |
| Accountant | ✅ | ❌ | ✅ (+ journal publish) |
| Reports | ✅ | ❌ (`zeroMode`) | ✅ |
| Documents | ✅ | ❌ Mock | ✅ |
| All create forms | ✅ | ❌ Fake submit | ✅ |
| Detail/edit `[id]` routes | ❌ | ❌ | ✅ |
| Threads | Placeholder | ❌ | ❌ |

---

## Related documentation

| Doc | Topic |
|-----|-------|
| [BOOKS_FUNCTIONALITY_GUIDE.md](./BOOKS_FUNCTIONALITY_GUIDE.md) | Integration matrix, phased wiring plan |
| [BOOKS_APP_UPDATE.md](./BOOKS_APP_UPDATE.md) | Initial scaffold (partially outdated API spec) |
| [BOOKS_SALES_PAGES_CRM_UI_ALIGNMENT.md](./BOOKS_SALES_PAGES_CRM_UI_ALIGNMENT.md) | Sales list UI |
| [BOOKS_PURCHASES_PAGES_CRM_UI_ALIGNMENT.md](./BOOKS_PURCHASES_PAGES_CRM_UI_ALIGNMENT.md) | Purchases list UI |
| [BOOKS_ACCOUNTANT_PAGES_CRM_UI_ALIGNMENT.md](./BOOKS_ACCOUNTANT_PAGES_CRM_UI_ALIGNMENT.md) | Accountant list UI |
| [BOOKS_HOME_HUB_PAGES.md](./BOOKS_HOME_HUB_PAGES.md) | Activity / Recent Updates hubs |
| [BOOKS_CRM_STYLE_ADD_PAGES.md](./BOOKS_CRM_STYLE_ADD_PAGES.md) | Add form UI (not API) |
| [ORG_CREATOR_ADMIN_USERS_SYNC.md](./ORG_CREATOR_ADMIN_USERS_SYNC.md) | `current-org-id` behavior |

---

*Last updated: June 2025*
