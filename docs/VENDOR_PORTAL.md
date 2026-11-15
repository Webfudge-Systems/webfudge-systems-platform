# Vendor portal (Fudge Vendor)

Internal Webfudge staff dashboard for every organization using the platform: their apps, trials,
plans, payments and users. App: `apps/vendor` (port 3004). API: `/api/vendor/*` in the Strapi backend.

## Access

Only accounts whose email is in `PLATFORM_ADMIN_EMAILS` on the API can use it (comma-separated).
Unset means nobody. Everyone else who signs in sees "Staff access only".

```bash
# API service (Railway → Variables)
PLATFORM_ADMIN_EMAILS=you@webfudge.in,ops@webfudge.in

# apps/vendor/.env.local — point at the API whose customers you want to see
NEXT_PUBLIC_API_URL=https://api.webfudgesystems.in
```

The portal signs in on its own `/login` page with a normal Webfudge account. Leave
`NEXT_PUBLIC_PLATFORM_MODE` unset for this app. Add the portal's domain to `CORS_ORIGINS` on the API
if that variable is set.

## Pages

| Page | What it shows |
|---|---|
| Dashboard `/` | MRR/ARR, paying orgs, active trials, 30-day revenue, conversion, at-risk count; revenue by app (12 months), plan mix, app adoption, growth, trials ending in 7 days, needs-attention list, newest orgs, recent payments |
| Organizations `/organizations` | Every org with stage (paying, trial, free, read-only, churned, suspended), apps, MRR, members, lifetime revenue, last active. Tabs, search, sort, CSV export |
| Organization `/organizations/:id` | Apps & plans, members, payments, invitations, company and billing details. Actions: **Extend trial**, **Suspend**, **Reactivate** |
| Subscriptions `/subscriptions` | Every app subscription with state, access, seats, MRR, end/renewal date. Filter by app |
| Billing `/billing` | Every Razorpay payment: net, GST, total, status, payment ID |
| Users `/users` | Every account, their organizations and roles, verification, last active |
| Reports `/reports` | 30d / 90d / 6m / 12m / all: revenue by app over time, sign-ups, trials vs conversions vs churn, revenue by app/plan/cycle/type, MRR by app, orgs by stage/industry/size, top orgs by revenue. CSV for each |
| Apps & plans `/apps` | Catalogue with subscribers, seats and MRR per plan |

## How numbers are worked out

- **MRR**: paid, running subscriptions only. Plan price × seats; yearly plans are spread over 12 months with their discount. Trials and Free count as 0. Excludes GST.
- **Revenue**: paid billing payments by payment date. Net excludes GST, gross includes it.
- **Trial → paid (dashboard)**: subscriptions with at least one paid payment ÷ subscriptions whose trial is over or that paid.
- **Conversions (reports)**: first paid payment on a subscription within the range; rate = conversions ÷ trials started in the range.
- **Churn**: subscriptions that reached "locked" (7 days after their trial or period ended) within the range.
- **At risk**: any app read-only, past due, set to cancel, or a trial with 3 days or less left.

The API loads everything once and caches it for 30 seconds; **Refresh** bypasses the cache. Staff
actions are logged as `[vendor] <email> <action>` in the API log.

## Staff actions

- **Extend trial** (1–90 days): adds days to the trial end, or to today if it already ended, and unlocks the app.
- **Suspend**: sets every subscription and the organization to `suspended`; all apps lock at once. Data is kept.
- **Reactivate**: free plans and paid plans go back to `active`, trials back to `trial`; normal expiry rules then apply.

## Code

- `apps/backend/src/api/vendor/` — routes and controller (staff check, data loading, actions)
- `apps/backend/src/utils/vendor-metrics.js` — pure functions for the dataset, overview and reports
- `apps/vendor/` — Next.js app built on `@webfudge/ui` (same shell, sidebar style, KPI cards and tables as PM/CRM)
