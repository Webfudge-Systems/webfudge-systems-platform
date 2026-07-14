# Real Estate CRM (Fudge Estate) — Stage 1 Scaffold

## Summary

New app `apps/real-estate-crm` (package `@webfudge/real-estate-crm`, dev port **3009**) — a real-estate lead-management CRM built around Meta-ads lead capture, qualification scoring, site visits, and project pipelines.

Stage 1 of a six-stage build. This stage delivers the app shell, auth/RBAC wiring, and the Leads / Contacts / Pipeline / Settings modules (UI + service stubs). Later stages add the Strapi schema (Stage 2), the `packages/lead-scoring` engine (Stage 3), Meta Ads integration + webhooks (Stage 4), the full UI (Stage 5), and the landing-page enrichment template (Stage 6).

**Architecture rule:** the app consumes the existing shared packages (`@webfudge/ui`, `@webfudge/auth`, `@webfudge/utils`). No shared code was duplicated; only real-estate-specific code is new.

## Scope

- **New app:** `apps/real-estate-crm` (Next.js 14 App Router, TypeScript, Tailwind)
- **Backend edits:**
  - `apps/backend/config/middlewares.js` — CORS origin `http://localhost:3009`
  - `apps/backend/src/constants/rbac-app-matrix.js` — new `realestate` app matrix
  - `apps/backend/src/utils/rbac.js` — `realestate` registered in `APP_MODULES`
- **Root:** `package.json` — `dev:recrm` script

## App structure

```
apps/real-estate-crm/
├── app/
│   ├── page.tsx                   # Dashboard (KPIs + recent hot leads)
│   ├── login/ · unauthorized/
│   ├── leads/                     # list, new, [id], [id]/edit — score DESC, tier pills
│   ├── contacts/                  # list, new, [id], [id]/edit
│   ├── pipeline/                  # stage-column board (7 lead statuses)
│   ├── projects/                  # stub (Stage 2)
│   ├── site-visits/               # stub (Stage 2)
│   └── settings/ + settings/integrations/   # integrations stub (Stage 4)
├── components/                    # LayoutContent, RealEstateSidebar, TierPill (app-local)
├── lib/
│   ├── site.ts                    # "Fudge Estate" branding
│   ├── rbac.ts                    # route→module map, canRead/Write/Manage('realestate', …)
│   ├── strapiClient.ts            # JWT + X-Organization-Id on every request
│   ├── types.ts                   # Lead/Contact/Project/SiteVisit domain types
│   └── api/                       # leadService, contactService (graceful stubs until Stage 2)
└── types/                         # ambient d.ts shims for @webfudge/ui and @webfudge/auth
                                   # (same pattern as apps/books)
```

## RBAC model

New `realestate` app key with modules `dashboard, leads, contacts, pipeline, projects, site_visits, settings` (access levels `none | read | write | manage`):

| Role | Defaults |
|------|----------|
| Admin | manage on all modules |
| Manager | manage on all, settings read-only |
| Member | leads/contacts/pipeline/site_visits write; dashboard/projects read; settings none |

Frontend gating mirrors the CRM app: `components/LayoutContent.tsx` blocks routes without read access via `WorkspaceLayoutContent`; `RealEstateSidebar` hides modules the role cannot read.

## Multi-tenancy

`lib/strapiClient.ts` sends `Authorization: Bearer <jwt>` and `X-Organization-Id` on every request. The backend `jwt-auth` middleware validates membership and sets `ctx.state.orgId`; Stage 2 controllers will scope all queries by it (same pattern as `apps/backend/src/api/deal/controllers/deal.js`).

## Notable decisions

- **Next 14, not 15** — matches `@webfudge/ui` peer deps and every other app in the workspace (user-confirmed).
- **TypeScript** app code with ambient `declare module` shims for the untyped JS shared packages (convention copied from `apps/books/types/`).
- **Lead services are graceful stubs**: list/get calls catch errors and return empty results so all pages render their empty states until the `real-estate-lead` content type lands in Stage 2. Contacts reuse the existing org-scoped `contact` content type.
- **No PWA/Serwist** in the scaffold (CRM has it; deferred until the product surface stabilises).
- **Page-time display is neutral**: leads that did not visit the landing page show a muted "did not visit", never a warning — matching the scoring engine's no-penalty rule (Stage 3).

## How to run

```bash
npm run dev:recrm        # from repo root → http://localhost:3009
# or
npm run dev --workspace=@webfudge/real-estate-crm
```

Requires the Strapi backend (`npm run dev:backend`, port 1338) for login. Copy `.env.example` → `.env.local` to override `NEXT_PUBLIC_API_URL`.

## Migration notes

Existing organization roles get `realestate` permissions automatically: `normalizePermissions` fills missing app matrices with read defaults, and new roles created from the Admin/Manager/Member presets include the table above. No data migration needed.
