# Fudge People (HR) — Production Deploy

## Summary

Deploy **Fudge People** (`apps/hr`, `@webfudge/hr`) as a Next.js 14 app against Strapi at **`https://api.webfudge.in`**. Canonical production URL: **`https://people.webfudge.in`**.

`NEXT_PUBLIC_*` values are embedded at **build time** — set them in CI/hosting before `next build`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Strapi base URL, e.g. `https://api.webfudge.in` (same as CRM/PM) |
| `NEXT_PUBLIC_HR_APP_URL` | Yes | Canonical app URL for metadata/OG: **`https://people.webfudge.in`** |

Repo files:

- `apps/hr/.env.production` — production defaults (committed, same pattern as CRM/PM)
- `apps/hr/.env.example` — copy guidance for local `.env.local`
- `apps/hr/.env.local` — local only (gitignored)

### API + auth

- `lib/strapiClient.js` and `@webfudge/auth` both read `NEXT_PUBLIC_API_URL`
- Requests send `Authorization` + `X-Organization-Id` like CRM/PM

## SEO / branding (CRM/PM parity)

- Root `app/layout.js` — metadata, Open Graph, Twitter, icons, web manifest, `robots: noindex`
- `lib/site.js` — `HR_SITE` brand config (name, logos, theme `#F5630F`)
- `public/favicon/*` — favicon set + `site.webmanifest`
- `app/favicon.ico` — browser tab icon
- `public/logo/ws_logo_white.png` + vertical logo — login/sidebar branding
- `public/robots.txt` — `Disallow: /` (private app workspace)

## Build

From repository root:

```bash
npm install
npx turbo run build --filter=@webfudge/hr
```

Or:

```bash
cd apps/hr && npm run build
```

Output: `apps/hr/.next`

## Run (Node server)

```bash
cd apps/hr && npm run start
```

Listens on **3008**. Behind nginx, proxy `https://people.webfudge.in` → `http://127.0.0.1:3008`.

## Backend checklist

- CORS allows **`https://people.webfudge.in`** in `apps/backend/config/middlewares.js` (also covered by `*.webfudge.in` pattern)
- Redeploy Strapi after CORS change if not already live

## Hosting notes

- **Vercel**: Root directory `apps/hr`; set both env vars; monorepo install from root
- **VM + PM2**: Build, then `npm run start` (or `next start -p 3008`)

## Scope

- App: `apps/hr`
- Related: `packages/auth`, `packages/ui`, Strapi `apps/backend`
