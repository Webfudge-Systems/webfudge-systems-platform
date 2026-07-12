# HR Leave Functional Build

## Summary

Implemented end-to-end leave management: Strapi `leave-request` API, HR sync service, and wired Leave page (requests, balances, policies, calendar sidebar) with create, approve, reject, delete, export, and quick-action apply leave.

## Scope

### Backend
- `apps/backend/src/api/leave-request/` — content type, CRUD, approve/reject actions

### Frontend
- `apps/hr/lib/leaveSyncService.js` — API client
- `apps/hr/lib/leaveShared.js` — policies, balance computation, events
- `apps/hr/lib/leavePage.js` — stats, filters, sort helpers
- `apps/hr/components/leave/CreateLeaveRequestModal.jsx`
- `apps/hr/components/leave/LeaveRequestDetailModal.jsx`
- `apps/hr/app/(leave)/leave/page.js` — live data wiring
- `apps/hr/components/quick-actions/ApplyLeaveQuickForm.jsx`
- `apps/hr/components/quick-actions/HRQuickActionDrawer.jsx`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leave-requests` | List org leave requests |
| POST | `/api/leave-requests` | Create pending request |
| POST | `/api/leave-requests/:id/approve` | Approve pending |
| POST | `/api/leave-requests/:id/reject` | Reject pending |
| DELETE | `/api/leave-requests/:id` | Delete request |

Headers: `Authorization: Bearer`, `X-Organization-Id` (same as Employees/Payroll).

## Leave page features

- **Requests tab:** list, search, status filter, sort, columns, approve/reject/view/delete
- **Apply Leave modal:** employee from synced roster, leave type, dates, reason
- **Balances tab:** computed from default policies minus approved usage (current year)
- **Policies tab:** default CL/SL/PL/Comp-Off policy cards
- **Calendar tab:** “Who’s on leave this week” from approved requests
- **Export:** CSV download of all requests
- **KPIs:** pending, approved, rejected, total (live counts)

## Usage

1. Restart Strapi backend after pulling (registers `leave-request` content type).
2. Log in to HR with org selected.
3. Go to **Leave** → **+ Apply Leave** → submit request.
4. Approve/reject from row actions or detail modal.
5. Check **Balances** after approvals.

## Notes

- Leave policies are config defaults in `leaveShared.js` (not editable API yet).
- Calendar full month view is placeholder; weekly list uses live data.
- CSV import not implemented (header button shows message).
- Employee detail Leave tab still uses mock data (optional follow-up).

## Migration

None. Existing mock file `mock-data/leave.js` remains for reference; Leave page no longer imports it.
