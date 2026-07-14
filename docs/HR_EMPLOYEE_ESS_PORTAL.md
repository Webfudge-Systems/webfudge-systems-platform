# HR Employee Self-Service (ESS) Portal

## Summary

`apps/ess` is the employee-facing counterpart to `apps/hr` (HR admin). Employees log in with the same auth system, view only their own data, and perform self-service actions (mark attendance, apply leave, view payslips). All writes go to the same Strapi backend used by HR admin — changes sync automatically through shared database reads.

## Scope

| Area | Package / path |
|------|----------------|
| ESS app | `apps/ess/` (`@webfudge/ess`) |
| HR admin (sync UI) | `apps/hr/app/(attendance)/attendance/page.js`, `apps/hr/lib/regularizationSyncService.js` |
| Backend APIs | `apps/backend/src/api/attendance-regularization`, `company-holiday`, leave cancel |
| Shared UI | `packages/ui`, `packages/auth` |

## Dev setup

```bash
# From repo root
npm run dev:ess   # http://localhost:3009
npm run dev:hr            # http://localhost:3008 (admin)
npm run dev:backend       # Strapi API
```

Copy `apps/ess/.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to your Strapi URL.

## Routes

| Route | Purpose |
|-------|---------|
| `/overview` | Personal dashboard (KPIs, week attendance, leave balance, activity) |
| `/attendance` | Calendar, mark attendance, regularization requests |
| `/leave` | Balances, apply leave, request history, team calendar |
| `/payroll` | Latest payslip, history, salary breakdown |
| `/expenses` | Submit reimbursement claims, track status (synced with HR Expenses) |
| `/performance` | Goals, review cycles, feedback, appraisal (synced with HR performance data) |
| `/activity` | Activity timeline with filters |
| `/login` | Shared auth login (redirects to `/overview`) |

## Employee scoping

- `useCurrentEmployee()` resolves the logged-in auth user → org membership → employee row via `listSyncedEmployees()`.
- `EmployeeGate` blocks pages when no employee record exists yet.
- All API calls pass `organizationUser: membershipId` from the resolved employee — never from URL or user-editable IDs.
- Backend write controllers enforce self-scoping via `apps/backend/src/utils/hr-self-scope.js` (non-admin users can only act on their own `organizationUser`).

## Backend additions

### Attendance regularization

- Content type: `attendance-regularization`
- Endpoints: CRUD + `POST /attendance-regularizations/:id/approve|reject`
- ESS submits requests; HR approves in **Attendance → Regularization** tab

### Company holidays

- Content type: `company-holiday` (`name`, `date`, `organization`)
- `GET /company-holidays?from=&to=` for overview and leave calendar

### Leave cancellation

- `cancelled` added to leave-request status enum
- `POST /leave-requests/:id/cancel` — preserves history (replaces hard DELETE for employee cancel)

## Sync behaviour

| ESS action | Visible in HR admin |
|------------|---------------------|
| Mark attendance | Attendance → Today / Monthly Log |
| Apply leave | Leave → Requests (Pending) |
| Cancel leave | Leave → Requests (Cancelled) |
| Regularization request | Attendance → Regularization |
| Submit expense claim | Expenses → Claims / Approvals |
| View payslip | N/A (read-only) |

| HR admin action | Visible in ESS |
|-----------------|----------------|
| Approve/reject leave | Leave → My Requests |
| Approve regularization | Attendance calendar updated |
| Run payroll / generate payslip | Payroll → Latest Payslip |
| Approve/reject expense claim | Expenses → status updates |
| Reimburse expense (payout) | Expenses → Paid |
| Update employee profile | Overview / Payroll breakdown |

## Employee login (ESS)

When HR creates an employee via **Add New Employee**:

1. A platform user account is created for the **work email** (same auth as ESS and HR).
2. **ESS login password** — optional field on the create form:
   - If HR sets a password → that password is used for ESS login.
   - If left blank → backend generates a temporary password.
3. **Send login credentials by email** — enabled by default. When checked, the employee receives their email and password (set or auto-generated) so they can sign in at ESS (`npm run dev:ess`).

For employees already created without credentials, reset their password in **Accounts → Users** (org admin) or recreate with the updated flow.


- Activity timeline uses existing `crm-activity` records; attendance/leave/payroll CRUD events are not auto-logged yet.
- Leave balances use default policy entitlements from `leaveShared.js` until per-org policy API exists.
- Team leave calendar shows approved leaves for same department only.

## Key files

- Shell: `apps/ess/components/LayoutContent.jsx`, `ESSSidebar.jsx`
- Scoping: `apps/ess/lib/currentEmployee.js`, `hooks/useCurrentEmployee.js`
- Sync services: `apps/ess/lib/*SyncService.js`
