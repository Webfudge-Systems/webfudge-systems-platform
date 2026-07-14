# Real Estate CRM — Backend Schema (Stage 2)

## Summary

Stage 2 of the Fudge Estate build adds the real-estate data layer to the Strapi backend (`apps/backend`). Four new org-scoped content types back the frontend at `apps/real-estate-crm`: projects, leads, site visits, and an immutable lead-activity timeline. All endpoints follow the existing CRM pattern: JWT auth, `X-Organization-Id` tenant scoping via `ctx.state.orgId`, and RBAC checks against the `realestate` app matrix.

## Scope

- `apps/backend/src/api/real-estate-project/` — schema, controller, routes, service
- `apps/backend/src/api/real-estate-lead/` — schema, controller, routes, service
- `apps/backend/src/api/site-visit/` — schema, controller, routes, service
- `apps/backend/src/api/lead-activity/` — schema, controller, routes, service
- `apps/backend/database/migrations/2026.07.12T00.00.00.real-estate-crm-indexes.js` — indexes
- RBAC matrix (`realestate` app) was added in Stage 1 (`src/constants/rbac-app-matrix.js`, `src/utils/rbac.js`)

## Content types

| Content type | Collection | Purpose |
| --- | --- | --- |
| `api::real-estate-project.real-estate-project` | `real_estate_projects` | Projects marketed via Meta ads: pricing range, configurations, campaign id, landing page, form-field mapping |
| `api::real-estate-lead.real-estate-lead` | `real_estate_leads` | Meta/landing-page leads with qualification score (0–100), tier (hot/warm/cold), status pipeline, Meta ids, page engagement |
| `api::site-visit.site-visit` | `site_visits` | Scheduled/completed site visits linked to lead + project |
| `api::lead-activity.lead-activity` | `lead_activities` | Immutable timeline events (`created`, `status_changed`, `site_visit_scheduled`, `site_visit_completed`, …) with JSON payload |

Relations: project 1—n leads, project 1—n site visits, lead 1—n site visits, lead 1—n activities. Every type has a `manyToOne` relation to `organization`.

## API endpoints

All routes use `config.auth: false` at the plugin level and rely on the global `jwt-auth` middleware (same as CRM), then enforce org + RBAC in the controller.

| Endpoint | Methods | RBAC module | Notes |
| --- | --- | --- | --- |
| `/api/real-estate-projects(/:id)` | GET, POST, PUT, DELETE | `realestate.projects` | write to create/update, manage to delete |
| `/api/real-estate-leads(/:id)` | GET, POST, PUT, DELETE | `realestate.leads` | dedupe on `metaLeadId`; non-managers auto-assigned and cannot reassign; `metaLeadId` immutable on update; ownership check on edit |
| `/api/site-visits(/:id)` | GET, POST, PUT, DELETE | `realestate.site_visits` | create/complete logs lead activity; lead must belong to active org |
| `/api/lead-activities(/:id)` | GET, POST only | `realestate.leads` | no PUT/DELETE — audit-style immutable log |

Controller conventions (identical to CRM controllers):

- `ctx.state.user` required → 401; `ctx.state.orgId` required → 403
- List endpoints force `filters.organization = ctx.state.orgId` and only pass through an allowlist of extra filters (tier, status, source, project, assignedTo, …)
- `findOne/update/delete` verify the entity's organization matches the active org
- Populate is sanitized through `createPopulateSanitizer` allowlists
- Lead status changes and site-visit lifecycle events are logged to `lead_activities` (best-effort, never blocks the main operation)

## Indexes (migration)

`database/migrations/2026.07.12T00.00.00.real-estate-crm-indexes.js` — Strapi runs it automatically on boot. Org relations live in Strapi 5 `_lnk` link tables (indexed by Strapi itself), so the migration indexes the hot scalar columns instead:

- `real_estate_leads`: `tier`, `status`, `score`, `created_at`, unique `meta_lead_id`
- `real_estate_projects`: `status`, `meta_campaign_id`
- `site_visits`: `scheduled_at`
- `lead_activities`: `type`, `created_at`

The migration is idempotent (skips missing tables/columns, swallows "already exists") so it is safe on both SQLite (dev) and Postgres (prod).

## Verification performed

- `node --check` passed on all 12 new API files, the migration, and the touched RBAC files
- All four `schema.json` files parse and the RBAC matrix exposes `realestate` with 7 modules
- Strapi 5.33 booted cleanly: migration applied, tables + all indexes confirmed in SQLite, and the four endpoints return 401 (auth required) instead of 404 — routes registered

## Usage notes

- Frontend services in `apps/real-estate-crm/lib/api/` can now switch from stubbed empty responses to the live endpoints.
- Lead ingestion from Meta webhooks (Stage 3+) should POST to `/api/real-estate-leads`; duplicate `metaLeadId` values return the existing lead with `meta.deduplicated: true`.
