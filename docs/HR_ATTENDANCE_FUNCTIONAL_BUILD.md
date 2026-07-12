# HR Attendance Functional Build

## Summary

Implemented end-to-end attendance management with Strapi APIs, daily roster building (including approved leave integration), mark/edit attendance, monthly log, overtime tracking, KPIs, and CSV export.

## Scope

### Backend
- `apps/backend/src/api/attendance-record/` — daily attendance CRUD with upsert per employee/date
- `apps/backend/src/api/overtime-record/` — overtime list/create/approve/delete

### Frontend
- `apps/hr/lib/attendanceSyncService.js` — API client
- `apps/hr/lib/attendanceShared.js` — roster builder, snapshot KPIs, shifts config
- `apps/hr/lib/attendancePage.js` — filters, tabs, sort helpers
- `apps/hr/components/attendance/MarkAttendanceModal.jsx`
- `apps/hr/app/(attendance)/attendance/page.js` — full wiring

## Features

### Today tab
- Shows all **active employees** for selected date
- **Saved attendance** from API overrides inferred status
- **Approved leave** (from Leave module) → auto **On Leave**
- Unmarked employees → **Absent**
- **Mark attendance** modal: status, clock in/out, location, notes
- KPIs: Present, On Leave, Absent, WFH (live counts)
- Approve leave on Leave page refreshes attendance via `hr-leave-updated` event

### Monthly Log tab
- Month picker + table of saved records for that month

### Shifts tab
- Default shift cards with active employee count on morning shift

### Overtime tab
- List overtime records, approve pending, delete

### Reports tab
- Export today or monthly CSV

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/attendance-records?date=` | Records for a day |
| GET | `/api/attendance-records?from=&to=` | Date range |
| POST | `/api/attendance-records` | Create or upsert (same employee + date) |
| PUT | `/api/attendance-records/:id` | Update |
| DELETE | `/api/attendance-records/:id` | Delete |
| GET/POST | `/api/overtime-records` | Overtime list/create |
| POST | `/api/overtime-records/:id/approve` | Approve overtime |

## Usage

1. Restart Strapi backend to register new content types.
2. HR → **Attendance** → pick date → **+ Mark attendance**.
3. Approve leave on **Leave** page → employee shows **On Leave** on attendance for those dates.
4. Use **Export** in header or **Reports** tab for CSV.

## Migration

None. Mock `mock-data/attendance.js` is no longer used by the Attendance page.
