# Real-Estate CRM — Stage 5 UI Build

## Summary

Stage 5 replaces the scaffold-era stub pages in `apps/real-estate-crm` (Fudge Estate) with a
complete, production-shaped UI wired to the Stage 2 backend. All screens compose shared
`@webfudge/ui` components (`Table`, `TabsWithActions`, `Modal`, `KPICard`,
`DashboardChartPanel`, `Select`, `Badge`, …) and follow the CRM app's layout conventions
(`space-y-6 p-4 md:p-6`, `variant="modern"` tables inside `rounded-xl border` shells,
filter modals, client pagination footer). No shared component visuals were modified.

## Scope

- App: `apps/real-estate-crm`
- Backend: one additive change to `apps/backend/src/api/real-estate-lead/controllers/real-estate-lead.js`
- New dependency: `recharts` (same major as `apps/crm`)

## Service layer (`lib/api/`)

| File | Purpose |
|------|---------|
| `leadService.ts` | Rewritten: typed filters (tier, status, source, project, assignedTo, free-text `q`, created date range), server pagination/sort, `bulkUpdateStatus`, `bulkAssign` |
| `projectService.ts` | New — CRUD for `real-estate-project` |
| `siteVisitService.ts` | New — list (populated lead/project), create, update (outcome logging) |
| `activityService.ts` | New — lead timeline read + `logActivity` (notes, calls) |
| `userService.ts` | New — org members via `GET /organizations/:orgId/users` (same endpoint CRM uses) + `userLabel` helper |

Backend addition: the lead `find` controller now accepts `filters[createdAt][$gte|$lte]`
(date-range) and `filters[q]` (case-insensitive `$or` over name/phone/email). All other
filters remain whitelisted; org scoping is unchanged.

## Pages

- **`/` dashboard** — 4 KPI cards (Total Leads, Hot Leads, Cost/Qualified Lead placeholder until
  Meta spend is connected, Site Visits Booked), a stacked weekly "Leads by tier" bar chart
  (`DashboardChartPanel` + recharts), and a "Recent hot leads" list.
- **`/leads`** — dense table with the spec's exact columns (Lead, Project, Budget, Timeline,
  Purpose, Page Time, Score, Tier, Status, Assigned). Default sort `score:desc`. Tier tabs +
  debounced search via `TabsWithActions`; filter modal for status/source/project/assignee/date
  range; checkbox bulk selection with bulk status-change and bulk assign; server pagination.
  "did not visit" renders muted and neutral (`components/PageTimeCell.tsx`).
- **`/leads/[id]`** — score breakdown panel (factor label, reason, +points, capped total), Meta
  form answers, neutral landing-page engagement section, contact card, full activity timeline,
  and site-visit history. Action bar: log call (sets `lastContactedAt`), schedule site visit
  (auto-bumps status to `site_visit_scheduled` from new/contacted), add note, change status,
  reassign.
- **`/projects`** — table of projects (price band in Indian notation, configs, possession,
  Meta campaign link status) with create/edit modal.
- **`/projects/[id]`** — KPI row (total/hot leads, cost per qualified lead placeholder, visits
  booked), tier funnel with % booked conversion per tier, and top-10 lead list.
- **`/site-visits`** — Upcoming/Completed tabs; upcoming rows have a "Log outcome" modal
  (visited-interested / not interested / no-show / rescheduled + notes) which sets
  `completedAt` — the backend then logs `site_visit_completed` on the lead timeline.
- **`/settings/integrations`** — Meta connection status card (booleans from a new
  `/api/integrations/meta/status` route; secrets never leave the server), copyable webhook
  URLs (Meta leadgen + landing enrichment), per-project campaign→project mapping editor, and
  form-field-mapping notes.

## Supporting changes

- `components/LeadStatusBadge.tsx` — status pill using shared `Badge` variants.
- `components/PageTimeCell.tsx` — neutral page-time rendering shared by list/detail.
- `lib/format.ts` — timeline/purpose/source labels, Indian price notation (`₹80L`, `₹1.2Cr`),
  date/datetime/relative-time helpers.
- `lib/types.ts` — added `ProjectStatus`, `LeadActivity`, `OrgUser`; widened project/site-visit types.
- `app/leads/new` — now offers Project and Assign-to selects (org members).
- `app/pipeline` — updated to the new `listLeads` signature.
- `types/webfudge-ui.d.ts` — ambient exports extended (TabsWithActions, dashboard chart kit, etc.).

## Verification

- `npm run build --workspace=@webfudge/real-estate-crm` — passes (21 routes, no type errors).
- Live against the running Strapi dev server: lead/project/site-visit list endpoints all 200
  with org scoping.

## Notes / follow-ups

- Cost per qualified lead renders `—` until a Meta access token with `ads_read` is configured;
  the insights plumbing exists in `@webfudge/meta-ads` (Stage 4).
- Bulk actions issue per-row updates so controller-side RBAC/org checks stay authoritative.
