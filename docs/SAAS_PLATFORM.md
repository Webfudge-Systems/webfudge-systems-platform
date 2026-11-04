# Webfudge SaaS platform

How self-serve sign-up, organizations, per-app trials and Razorpay billing work on the SaaS
deployment (`webfudgesystems.in`), and what to set before going live. Internal (`webfudge.in`)
is unaffected: everything below only switches on with `PLATFORM_MODE=saas` (API) and
`NEXT_PUBLIC_PLATFORM_MODE=saas` (apps). See [INTERNAL_AND_SAAS_DEPLOYMENTS.md](./INTERNAL_AND_SAAS_DEPLOYMENTS.md)
for how the two deployments are separated.

## Where things live

| Site | App | What it does |
|---|---|---|
| `webfudgesystems.in` | `apps/landing` | Website: home, CRM, Projects, pricing, customers, services, about, contact, legal |
| `accounts.webfudgesystems.in` | `apps/accounts` | Sign-up, sign-in, onboarding, Home hub, Apps & billing, invoices, profile, admin console |
| `crm.` / `pm.webfudgesystems.in` | `apps/crm`, `apps/pm` | The apps. Sign-in goes through Accounts; trial / read-only / locked states are shown |
| `api.webfudgesystems.in` | `apps/backend` | Strapi API |

One sign-in covers every subdomain: the token cookie is set on `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`
(`.webfudgesystems.in`). Signing out anywhere signs out everywhere.

## The customer journey

1. **Sign up** (`/signup`) — name, work email, password (8+ characters, letters and numbers), optional mobile.
2. **Verify** (`/verify`) — 6-digit code by email, valid 10 minutes, 5 attempts, resend after 45 seconds.
3. **Organization** (`/setup/organization`) — name, industry, team size. The creator is the owner (Admin).
4. **Apps** (`/setup/apps`) — CRM and/or Projects. Each starts its own 14-day trial; no card.
5. **Team** (`/setup/team`) — email invitations with a role (Member, Manager, Admin). Can be skipped.
6. **Home** (`/home`) — apps with trial status, organizations, invitations, billing and team.

Invited people open `/invite/<token>`: new people set a name and password (the link proves the email);
existing users sign in and accept.

## Trial and plan rules (`apps/backend/src/utils/saas-access.js`)

| State | Access | When |
|---|---|---|
| Trial | Full | 14 days from starting the app |
| Trial ended | Read-only | 7 days after the trial ends |
| Active (paid) | Full | Until the end of the paid period |
| Expired / cancelled | Read-only, then locked | 7 days read-only after the period ends, then locked |
| Free plan | Full | No end date; up to 3 members |
| Locked | None | Data kept 90 days (not deleted automatically) |

The API enforces this in `src/middlewares/app-access.js`: CRM data (`lead-companies`, `contacts`,
`deals`, `proposals`, `meetings`, `crm-activities`, `invoices`) needs CRM; `projects`, `tasks`,
`documents` and `client-accounts` open with either app. Read-only blocks every write.
Members plus pending invitations can't exceed the Free plan limit or the seats paid for.

Reminder emails go out daily at 09:30 IST (`config/cron-tasks.js`): 4 days and 1 day before a
trial ends, when it ends, when an app locks, 7 days and 1 day before a paid period ends.

## Plans and prices

Plans are the `Plan` collection in the Strapi admin (one set per app). The defaults are created
once on a SaaS API's first start and are never overwritten, so edit prices there:

| Plan | Price per user / month | Notes |
|---|---|---|
| Free | ₹0 | up to 3 users |
| Standard | ₹499 | |
| Professional | ₹999 | marked Popular |
| Enterprise | ₹1,499 | |

Yearly = 12 months less `yearlyDiscountPercent` (15%). Prices exclude GST (18%, `BILLING_GST_RATE`).
The website reads plans from `/api/saas/catalog` every hour.

## Billing with Razorpay

Payments are made in advance with Razorpay Checkout (orders API), which takes UPI, cards and
netbanking. No card is stored by Webfudge.

- `POST /api/billing/quote` prices a change: **new** (trial, free, expired, or a plan/cycle change, with
  credit for unused paid time), **seats** (more users, pro rata to the period end) or **renewal**
  (same plan, next period paid in advance).
- `POST /api/billing/checkout` creates the Razorpay order and a `Billing Payment` row.
- The browser opens Checkout; `POST /api/billing/verify` checks the signature and activates the plan.
- `POST /api/billing/webhook` does the same from Razorpay's side (covers closed tabs and slow UPI).
  Both paths are idempotent.
- Paid payments get an invoice number `WF-<year>-<id>` and a printable tax invoice at
  `accounts…/billing/invoices/<id>` (CGST+SGST when the buyer's state matches `BILLING_SELLER_STATE`, otherwise IGST).

### Turning payments on

1. Finish Razorpay KYC. The website already has the pages Razorpay checks: `/legal/terms`,
   `/legal/privacy`, `/legal/refunds`, `/contact`, and pricing.
2. Razorpay Dashboard → Settings → API Keys → generate **test** keys.
3. On the SaaS API service set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
4. Dashboard → Settings → Webhooks → add `https://api.webfudgesystems.in/api/billing/webhook` with events
   `order.paid`, `payment.captured`, `payment.failed`; set the secret as `RAZORPAY_WEBHOOK_SECRET`.
5. Make a test payment from Accounts → Apps & billing (Accounts shows a "test mode" notice).
6. Swap to live keys and a live webhook secret.

Until step 3, Apps & billing explains that online payments are being switched on and points people to
`NEXT_PUBLIC_SUPPORT_EMAIL`. Trials and the Free plan work without Razorpay.

## Settings

API (`apps/backend`): `PLATFORM_MODE=saas`, `JWT_SECRET`, `ACCOUNTS_URL`, `RESEND_API_KEY`, `MAIL_FROM`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `BILLING_SELLER_*`, `BILLING_SAC_CODE`.

Accounts / CRM / PM: `NEXT_PUBLIC_PLATFORM_MODE=saas`, `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.webfudgesystems.in`,
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ACCOUNTS_APP_URL`, `NEXT_PUBLIC_CRM_APP_URL`, `NEXT_PUBLIC_PM_APP_URL`,
`NEXT_PUBLIC_SITE_URL`.

Website: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ACCOUNTS_APP_URL`, `NEXT_PUBLIC_SITE_URL`, contact form mail settings.

All keys are listed with comments in each app's `.env.example`.

## Before launch

- [ ] Resend: verify `webfudgesystems.in` (DNS records), set `RESEND_API_KEY` and `MAIL_FROM`.
- [ ] Razorpay: KYC, test keys, webhook, one test payment, then live keys.
- [ ] Replace placeholder numbers in `apps/landing/data/site.js` (`kpis`) and add `company.gstin`.
- [ ] Customer quotes: get approval, then set `approved: true` with name and role in `apps/landing/data/customers.js`.
- [ ] Legal pages (`apps/landing/data/legal.js`): lawyer review, including the refund terms.
- [ ] Invoice settings: `BILLING_SELLER_GSTIN`, address, SAC code (ask your CA).
- [ ] Real screenshots from a demo organization to replace the drawn mockups (`components/mocks`).
- [ ] Transparent logo files for EVI, PositiEV and BikeWo.

## API reference

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/signup`, `/auth/login`, `/auth/verify-email`, `/auth/resend-code` | public |
| POST | `/api/auth/password/forgot`, `/auth/password/reset` | public |
| PUT / POST | `/api/auth/profile`, `/auth/password/change` | signed in |
| GET | `/api/saas/catalog` | public |
| GET | `/api/saas/home`, `/api/saas/access` | signed in |
| POST | `/api/saas/organizations` | signed in |
| GET | `/api/saas/organizations/:id` | member |
| POST | `/api/saas/organizations/:id/trials`, `/onboarding-complete`, `/invitations` | admin |
| GET / DELETE | `/api/saas/organizations/:id/invitations[/:invitationId]` | admin |
| GET | `/api/saas/invitations/:token` | public |
| POST | `/api/saas/invitations/:token/accept`, `/decline` | signed in (invited email) |
| POST | `/api/saas/invitations/:token/register` | public (new person) |
| GET | `/api/billing/organizations/:id` | member (history: admin) |
| POST | `/api/billing/quote`, `/checkout` | admin |
| POST | `/api/billing/verify` | signed in |
| POST | `/api/billing/webhook` | Razorpay (signed) |
| POST | `/api/billing/organizations/:id/free`, `/cancel` | admin |
| PUT | `/api/billing/organizations/:id/details` | admin |
| GET | `/api/billing/invoices/:paymentId` | admin |
