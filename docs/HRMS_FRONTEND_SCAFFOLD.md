# HRMS Frontend Scaffold (WF People)

## Summary

Added **`apps/hr`** (`@webfudge/hr`) — the WF People HRMS frontend module in the Webfudge monorepo. This phase is **frontend-only**: mock data, no Strapi/API routes. Visual and structural patterns mirror **CRM** and **PM** (Next.js 14 App Router, `@webfudge/ui`, orange brand, `WorkspaceLayoutContent` shell).

## Scope

| Area | Path |
|------|------|
| App | `apps/hr/` |
| Dev port | **3008** (`npm run dev:hr` from repo root) |
| Shared UI | `packages/ui` (`KPICard`, `AppPageHeader`, `TabsWithActions`, `ActivitiesTimeline`, etc.) |
| Auth shell | `@webfudge/auth` + `/login` (same gate as CRM/PM) |

## Architecture

- **Layout:** `app/layout.js` → `AuthProvider` → `LayoutContent` → `WorkspaceLayoutContent` + `HRSidebar`
- **Page header:** `HRPageHeader` wraps `AppPageHeader` with `lib/mockNotificationService.js` (static notifications)
- **Page chrome:** `HRPageLayout` (`bg-gray-50`, `p-4`)
- **Tables:** `HRDataTable` (native `<table>`) — `@webfudge/ui` `Table` uses columns/data API

## Routes

| Route | Page |
|-------|------|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | HR command center |
| `/employees` | Employee directory |
| `/employees/[id]` | Employee profile (7 tabs) |
| `/payroll` | Payroll hub (5 tabs) |
| `/attendance` | Attendance (5 tabs) |
| `/leave` | Leave management (4 tabs) |
| `/recruitment` | ATS (5 tabs) |
| `/recruitment` | Kanban pipeline (visual columns) |
| `/performance` | PMS (5 tabs) |
| `/learning` | LMS (4 tabs) |
| `/expenses` | Expense claims (4 tabs) |
| `/helpdesk` | HR tickets + FAQ |
| `/analytics` | Workforce analytics (5 tabs) |
| `/settings` | Company, departments, roles, notifications, integrations |
| `/login`, `/unauthorized` | Auth pages |

## Mock data

All data lives under `apps/hr/lib/mock-data/`:

- `employees.js`, `leave.js`, `payroll.js`, `attendance.js`, `recruitment.js`
- `expenses.js`, `helpdesk.js`, `performance.js`, `learning.js`
- `dashboard.js`, `analytics.js`, `activities.js`, `settings.js`
- `index.js` re-exports modules

Helpers: `getEmployeeById`, `filterEmployees`.

## How to run

```bash
# From repo root
npm install
npm run dev:hr
```

Open http://localhost:3008 — sign in with the same Strapi credentials as CRM/PM if the backend is running locally.

Copy env from `apps/hr/.env.example` (production URL is **`https://people.webfudge.in`** — see [HR_PRODUCTION_DEPLOY.md](./HR_PRODUCTION_DEPLOY.md)):

```
NEXT_PUBLIC_API_URL=http://localhost:1338
NEXT_PUBLIC_HR_APP_URL=http://localhost:3008
```

## Future integration

1. Replace `lib/mock-data/*` with `lib/api/*` services (pattern: `apps/crm/lib/api`)
2. Wire `lib/rbac.js` to org HR permissions
3. Point `mockNotificationService` at real notifications API
4. Optional: Serwist PWA (CRM uses `@serwist/next`)

## CRM-aligned list pages

These routes use the same shell as CRM lead lists (`min-h-full space-y-6 p-4 md:p-6`, top KPI row, `TabsWithActions`, `Table` `variant="modern"`), not `HRPageLayout` / `HRDataTable`:

| Route | Lib helpers | Tabs |
|-------|-------------|------|
| `/employees` | `lib/employeeStats.js` | — |
| `/attendance` | `lib/attendancePage.js` | Today, Monthly, Shifts, Overtime, Reports |
| `/leave` | `lib/leavePage.js` | Requests, Balances, Calendar, Policies |
| `/expenses` | `lib/expensesPage.js` | Claims, Approvals, Reports, Payouts |
| `/payroll` | `lib/payrollPage.js` | Overview, Structures, Payslips, Compliance, Loans |
| `/recruitment` | `lib/recruitmentPage.js` | Jobs, Pipeline (kanban), Candidates, Interviews, Offers |
| `/performance` | `lib/performancePage.js` | Goals (OKRs), Reviews, Feedback, Appraisals, PIPs |
| `/learning` | `lib/learningPage.js` | Courses, Paths, Assignments, Certificates |
| `/helpdesk` | `lib/helpdeskPage.js` | Tickets, Categories, SLA, FAQ (+ drawer) |
| `/analytics` | `components/analytics/` | Glass dashboard: pill tabs, compact stat row, chart-first panels per report |
| `/settings` | `lib/settingsPage.js` | CRM shell + Accounts-style `FormSectionCard` sidebar |

Each page: `HRPageHeader` with Import/Export, four (or six for payroll) orange `KPICard`s, search/filter/export on tabs, “Showing N results”, empty states with icon + CTA.

## Key files

- `components/layout/HRSidebar.jsx` — sectioned nav (Navigate, Talent, Finance, Support, Admin)
- `components/layout/HRPageHeader.jsx`
- `lib/navigation.js` — nav config
- `lib/expensesPage.js`, `lib/payrollPage.js`, `lib/recruitmentPage.js`, `lib/performancePage.js`, `lib/learningPage.js`, `lib/helpdeskPage.js`, `lib/analyticsPage.js`, `lib/settingsPage.js` — stats, filters, tab badges
- `components/quick-actions/` — sidebar quick actions open centered `HRModal` via `HRQuickActionDrawer` (add employee, apply leave, new expense, post job) without full-page navigation
- `lib/quickActions.js` — action IDs and drawer copy
- `next.config.js` — `/` → `/dashboard` redirect
