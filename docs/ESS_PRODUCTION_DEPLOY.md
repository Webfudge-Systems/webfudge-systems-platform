# Fudge Desk — Production Deploy

## Summary

Deploy **Fudge Desk** (`apps/ess`, `@webfudge/ess`) as a Next.js 14 employee self-service app against Strapi at **`https://api.webfudge.in`**. Canonical production URL: **`https://desk.webfudge.in`**.

`NEXT_PUBLIC_*` values are embedded at **build time** — set them in CI/hosting before `next build`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Strapi base URL, e.g. `https://api.webfudge.in` (same as CRM/PM/HR) |
| `NEXT_PUBLIC_ESS_APP_URL` | Yes | Canonical app URL for metadata/OG: **`https://desk.webfudge.in`** |

Repo files:

- `apps/ess/.env.production` — production defaults (committed, same pattern as CRM/PM/HR)
- `apps/ess/.env.example` — copy guidance for local `.env.local`
- `apps/ess/.env.local` — local only (gitignored)

### API + auth

- `lib/strapiClient.js` and `@webfudge/auth` both read `NEXT_PUBLIC_API_URL`
- Requests send `Authorization` + `X-Organization-Id` like CRM/PM/HR

## SEO / branding (HR/CRM parity)

- Root `app/layout.js` — metadata, Open Graph, Twitter, icons, web manifest, `robots: noindex`
- `lib/site.js` — `ESS_SITE` brand config (**Fudge Desk**, logos, theme `#F5630F`)
- `public/favicon/*` — favicon set + `site.webmanifest`
- `app/favicon.ico` — browser tab icon
- `public/logo/ws_logo_white.png` + vertical logo — login/sidebar branding
- `public/robots.txt` — `Disallow: /` (private app workspace)

## Build

From repository root:

```bash
npm install
npx turbo run build --filter=@webfudge/ess
```

Or:

```bash
cd apps/ess && npm run build
```

Output: `apps/ess/.next`

## Run (Node server)

```bash
cd apps/ess && npm run start
```

Listens on **3009**. Behind nginx, proxy `https://desk.webfudge.in` → `http://127.0.0.1:3009`.

## Backend checklist

- CORS allows **`https://desk.webfudge.in`** in `apps/backend/config/middlewares.js` (also covered by `*.webfudge.in` pattern)
- Redeploy Strapi after CORS change if not already live

## Hosting notes

- **Vercel**: Root directory `apps/ess`; set both env vars; monorepo install from root
- **VM + PM2**: Build, then `npm run start` (or `next start -p 3009`)

## Related

- HR admin app: `apps/hr` → `https://people.webfudge.in` — see [HR_PRODUCTION_DEPLOY.md](./HR_PRODUCTION_DEPLOY.md)

## Scope

- App: `apps/ess` (folder/package name unchanged; product name is **Fudge Desk**)
- Related: `packages/auth`, `packages/ui`, Strapi `apps/backend`
