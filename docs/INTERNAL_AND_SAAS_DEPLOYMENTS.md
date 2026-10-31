# Internal & SaaS deployments (Option A)

## Summary

One codebase, two completely separate live systems:

- **Internal**: Webfudge's own CRM and PM. This **is today's production**, with its database, uploaded files and domains exactly as they are. Nothing is moved, copied or migrated.
- **SaaS**: the customer product. It has brand-new, empty infrastructure: its own database, Redis, S3 bucket, secrets and domains.

New code reaches Internal first. It reaches customers only when someone merges `master` into `saas`.

```
feature/*  →  PR  →  master ──auto-deploy──►  INTERNAL  (api.webfudge.in · Webfudge's real data)
                       │
                       │  release PR (master → saas), only once proven internally
                       ▼
                     saas  ──auto-deploy──►  SAAS      (api.webfudgesystems.in · customers)
```

| | Internal | SaaS |
|---|---|---|
| Git branch | `master` (unchanged) | `saas` (new) |
| API | `api.webfudge.in` (existing Railway project) | `api.webfudgesystems.in` (new Railway project) |
| Apps | `crm` / `pm` / `accounts.webfudge.in` | `crm` / `pm` / `accounts.webfudgesystems.in` |
| Marketing site | none | `webfudgesystems.in` (landing) |
| Postgres, Redis, S3 | existing | new, empty |
| `PLATFORM_MODE` | unset or `internal` | `saas` |

**Why the SaaS goes on `webfudgesystems.in`:** Internal keeps every URL it has today, so it needs no changes. The marketing site and the customer apps then share one parent domain, which a single sign-in across apps will need later. You can swap the domains later if you prefer. Domains don't affect data.

## What the code change does (`chore/option-a-two-deployments`)

| File | Change | Effect on Internal |
|---|---|---|
| `apps/backend/src/utils/platform.js` | New `PLATFORM_MODE` (`internal` default, `saas`) and one place for the JWT secret | None. The same fallback secret is kept, so nobody is logged out |
| `auth.js`, `jwt-auth.js` | Use `jwtSecret()` instead of two copies of a hard-coded fallback | None |
| SaaS mode | Refuses to start without `JWT_SECRET`, and rejects unknown `PLATFORM_MODE` values | n/a |
| `config/middlewares.js` | Optional `CORS_ORIGINS` env pins an API to its own frontends | None while unset |
| `GET /api/health` | Returns `{ status, platformMode }` | New read-only endpoint |
| `src/index.js` | Startup log shows the mode | Log line only |
| `apps/backend/scripts/db-row-counts.js` | Read-only row count per table, with `--compare` | Run manually |
| `scripts/db-backup.sh` | `pg_dump` plus a check that the file is readable | Run manually |
| `.github/workflows/ci.yml` | Builds every app on PRs and pushes to `master` / `saas` | None |
| `.gitignore` | Ignores `backups/` | None |

No content-type schema changed, so Strapi will not touch any table when this deploys.

---

## Phase 0 · Safety net (do this first, about 45 minutes)

Nothing in Option A deletes data. This phase exists so that you could recover from anything anyway.

- [ ] **0.1 Railway backup.** Railway → Internal project → Postgres service → **Backups** → *Create backup*. If your plan has no Backups tab, step 0.4 is your backup.
- [ ] **0.2 Find the Postgres version.** Railway → Postgres → **Data** (or any SQL client) → `SELECT version();`. Note the major number (for example 16 or 17).
- [ ] **0.3 Install matching client tools on Windows.** Same major version or newer:
  ```bash
  winget install PostgreSQL.PostgreSQL.17
  ```
  In the installer, tick only **Command Line Tools**. Then in Git Bash:
  ```bash
  export PATH="/c/Program Files/PostgreSQL/17/bin:$PATH"
  pg_dump --version
  ```
- [ ] **0.4 Back up the internal database.** Railway → Postgres → **Connect** → *Public network* → copy the URL. Never paste it into a file in the repo.
  ```bash
  DATABASE_URL='postgresql://…' ./scripts/db-backup.sh internal
  ```
  You should see `✅ backups/internal-<time>.dump (… tables with data)`.
- [ ] **0.5 Snapshot row counts.**
  ```bash
  cd apps/backend
  DATABASE_URL='postgresql://…' npm run db:row-counts -- --out ../../backups/internal-before.json
  ```
- [ ] **0.6 Copy both files off the laptop** (Google Drive, external disk). They hold real customer data, so keep them private.
- [ ] **0.7 Protect uploaded files.** AWS → S3 → internal bucket → *Properties* → **Bucket Versioning → Enable**. Deleted or overwritten files can then be recovered. The files don't move in Option A.
- [ ] **0.8 Prove the backup restores (recommended).** Create a throwaway Railway project with an empty Postgres, then:
  ```bash
  pg_restore --no-owner --no-privileges --dbname='postgresql://<scratch-url>' backups/internal-<time>.dump
  cd apps/backend
  DATABASE_URL='postgresql://<scratch-url>' npm run db:row-counts -- --compare ../../backups/internal-before.json
  ```
  Expect `✅ Identical`. Then delete the throwaway project.
- [ ] **0.9 Check `JWT_SECRET`.** Railway → Internal API service → Variables. If it's missing, Internal currently signs logins with the fallback secret that's in the repo. Don't change it yet: Phase 6 replaces it at a quiet time.

## Phase 1 · Ship the code to Internal (no behaviour change)

- [ ] **1.1** Review and merge the PR from `chore/option-a-two-deployments` into `master`.
- [ ] **1.2** Wait for the Railway deploy. The logs should show `Strapi is bootstrapping (PLATFORM_MODE=internal)`.
- [ ] **1.3** Open `https://api.webfudge.in/api/health` and expect `{"status":"ok","platformMode":"internal"}`.
- [ ] **1.4** Sign in to the internal CRM and PM and open a few leads, deals, projects and tasks.
- [ ] **1.5** Compare row counts. Only growth from people working is expected:
  ```bash
  cd apps/backend
  DATABASE_URL='postgresql://…' npm run db:row-counts -- --compare ../../backups/internal-before.json
  ```
- [ ] **1.6** Railway → Internal API → Variables → add `PLATFORM_MODE=internal`. This makes the mode explicit; it was already the default.

If anything looks wrong: Railway → Deployments → previous deployment → **Redeploy**. The data is untouched either way.

## Phase 2 · Branches and GitHub rules

- [ ] **2.1** Create the SaaS branch from the merged `master`:
  ```bash
  git fetch origin
  git push origin origin/master:refs/heads/saas
  ```
- [ ] **2.2** GitHub → repo → Settings → **Branches** → add a rule for `master` and another for `saas`:
  - Require a pull request before merging
  - Require status checks: **build** (from CI)
  - Block force pushes and deletion
- [ ] **2.3** Agree the team rule: everything merges to `master` first. A SaaS release is a PR **from `master` into `saas`**.

## Phase 3 · SaaS backend (new Railway project)

- [ ] **3.1** Railway → **New Project** → name it `webfudge-saas`. Add a **new** Postgres and a **new** Redis. Never point the SaaS at the internal ones.
- [ ] **3.2** Add a service from the GitHub repo. Settings: branch `saas`, root directory `apps/backend`, and the same build and start commands as the internal API service (see `RAILWAY_STRAPI_DEPLOY.md`).
- [ ] **3.3** Create a new S3 bucket (for example `webfudge-saas-uploads`) and a new IAM user whose policy allows only that bucket. Copy the internal bucket's CORS and permission settings, with the new bucket name.
- [ ] **3.4** Generate **new** secrets. Never copy internal values. Run once per secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- [ ] **3.5** Set the variables on the SaaS API service:

  | Variable | Value |
  |---|---|
  | `PLATFORM_MODE` | `saas` |
  | `NODE_ENV` | `production` |
  | `APP_KEYS` | four new secrets, comma-separated |
  | `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | new secrets |
  | `DATABASE_CLIENT` | `postgres` |
  | `DATABASE_URL` | the same reference the internal API uses (`${{Postgres.DATABASE_URL}}` or `${{Postgres.DATABASE_PRIVATE_URL}}`), but pointing at the SaaS project's Postgres |
  | `DATABASE_SSL`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `DATABASE_POOL_*` | same as internal |
  | `REDIS_URL` | `${{Redis.REDIS_URL}}` (the SaaS project's Redis) |
  | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | the new bucket and IAM user |
  | `CDN_URL` | the new bucket's URL (or CDN) |
  | `CORS_ORIGINS` | `https://webfudgesystems.in,https://www.webfudgesystems.in,https://accounts.webfudgesystems.in,https://crm.webfudgesystems.in,https://pm.webfudgesystems.in` |
  | `APP_URL` | `https://webfudgesystems.in` (used in invitation links) |
  | `SEED_DATA` | leave unset. An empty database seeds apps, modules and roles automatically |

- [ ] **3.6** Railway → service → Settings → **Custom domain** `api.webfudgesystems.in`, then add the CNAME it shows at your DNS provider.
- [ ] **3.7** Deploy. The logs should show `PLATFORM_MODE=saas`, the app/module seed and the role setup.
- [ ] **3.8** **Immediately** open `https://api.webfudgesystems.in/admin` and create the Strapi admin account. The first person to open it becomes the admin. Store the password in a password manager.
- [ ] **3.9** Open `https://api.webfudgesystems.in/api/health` and expect `"platformMode":"saas"`.

## Phase 4 · SaaS frontends

These steps assume Vercel. The same idea applies on any host: a new project per app, tracking the `saas` branch.

- [ ] **4.1** For **Accounts, CRM and PM**: Add New Project → same repo → root directory `apps/<app>` → Settings → Git → **Production Branch = `saas`**.
- [ ] **4.2** Set **every** `NEXT_PUBLIC_*` variable on each SaaS project. The committed `.env.production` files hold internal URLs, and project variables override them only if they're set:

  | App | Variables |
  |---|---|
  | All | `NEXT_PUBLIC_API_URL=https://api.webfudgesystems.in` |
  | Accounts | `NEXT_PUBLIC_ACCOUNTS_APP_URL=https://accounts.webfudgesystems.in`, `NEXT_PUBLIC_CRM_ORIGIN=https://crm.webfudgesystems.in` |
  | CRM | `NEXT_PUBLIC_CRM_APP_URL=https://crm.webfudgesystems.in`, `NEXT_PUBLIC_PM_APP_URL=https://pm.webfudgesystems.in` |
  | PM | `NEXT_PUBLIC_PM_APP_URL=https://pm.webfudgesystems.in`, `NEXT_PUBLIC_CRM_APP_URL=https://crm.webfudgesystems.in` |
  | All (used by `getAppUrl`) | `NEXT_PUBLIC_SITE_URL=https://webfudgesystems.in`, `NEXT_PUBLIC_ACCOUNTS_APP_URL`, `NEXT_PUBLIC_CRM_APP_URL`, `NEXT_PUBLIC_PM_APP_URL` |

- [ ] **4.3** Add the domains `accounts.`, `crm.` and `pm.webfudgesystems.in`, with their DNS records.
- [ ] **4.4** Open each **internal** project → Settings → Git and confirm its Production Branch is still **`master`**.

## Phase 5 · Prove the two systems are isolated

- [ ] `api.webfudge.in/api/health` says `internal`, and `api.webfudgesystems.in/api/health` says `saas`.
- [ ] On `crm.webfudgesystems.in`, open DevTools → Network: every API call goes to `api.webfudgesystems.in`.
- [ ] Signing in to the SaaS CRM with your **internal** account fails (it's a different database).
- [ ] Create a test organization on the SaaS. Running the row-count compare against Internal shows no new organization there.
- [ ] Upload a file in the SaaS. It appears in the **SaaS** bucket, not the internal one.

## Phase 6 · Move the marketing site and lock Internal down

- [ ] **6.1** Landing project: set `NEXT_PUBLIC_API_URL=https://api.webfudgesystems.in` and the SaaS app URLs, and change its Production Branch to `saas`. From now on, signups create SaaS accounts, never internal ones.
- [ ] **6.2** Internal API → Variables → `CORS_ORIGINS=https://crm.webfudge.in,https://pm.webfudge.in,https://accounts.webfudge.in`. Add `https://vendor.webfudge.in` if you use it. The internal API then refuses every other website, including the SaaS apps and any `*.vercel.app` preview.
- [ ] **6.3** At a quiet time, set a new random `JWT_SECRET` on the Internal API. Everyone signs in once more, and the secret that's in the repo stops working.
- [ ] **6.4** In internal Accounts, look for organizations or users created by strangers through the old public signup. Remove them one by one if there are any. Don't bulk-delete.

---

## Day-to-day after the split

1. Branch `feature/<name>` from `master`, open a PR, get CI green, merge. **Internal** deploys.
2. Webfudge uses it for real. Fix anything you find, still on `master`.
3. When it's ready for customers: take a SaaS database backup (Railway → Backups), then open a PR **`master` → `saas`** and merge. **SaaS** deploys.
4. Urgent customer fix: branch from `saas`, PR into `saas`, then PR the same fix into `master` so the branches don't drift.

### Rules that protect data

- **Never delete or rename a field in a `schema.json` together with the code that stops using it.** Strapi removes columns that no longer exist in the schema when it starts, and that data is gone. Add the new field first, move the data, and remove the old field in a later release, after a backup.
- Take a backup before merging any PR that touches `src/api/**/content-types/**/schema.json`, on each system it reaches.
- Internal and SaaS never share a database, Redis, bucket, secret or Railway project.
- SaaS-only behaviour (public signup, trials, billing) checks `isSaas()` from `src/utils/platform.js`, so Internal stays a private, single-company system.

### Rolling back

- **Code:** Railway → Deployments → previous → *Redeploy*. Vercel → Deployments → previous → *Promote to Production*.
- **Data:** restore the dump into a **new** Postgres, check it with `db-row-counts --compare`, then point `DATABASE_URL` at it. Never restore over the live database.

## Known gaps to pick up next

- Invitation emails link to `APP_URL/invite/<token>`, but the landing app has no `/invite` page yet.
- The Strapi email plugin has no provider configured, so invitation emails are only logged.
- The local `websaas` branch has no commits beyond `master` and can be deleted.
