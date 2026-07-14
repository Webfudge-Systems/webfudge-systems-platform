# Real Estate Project Activity Timeline

## Summary

The Real Estate CRM project detail page (`/projects/[id]`) Activity tab now shows a real,
functional audit timeline: project **created** and **field-level updates** are recorded on the
backend and rendered with the shared CRM `ActivitiesTimeline` (orange spine, typed badges,
before → after field diffs, actor attribution). Lead and site-visit events for the project are
merged into the same timeline as read-only synthesized rows.

Previously the tab only synthesized rows from leads/site-visits, so project create/edit events
never appeared.

## Scope

- **Backend** (`apps/backend`)
  - `src/api/real-estate-project/controllers/real-estate-project.js`
    - Logs `create` and `update` (with `meta.changes` field diffs) into the shared
      `crm_activities` store under `subjectType = "real_estate_project"`. Logging is best-effort
      and never blocks the CRUD response.
    - New `activities` handler → `GET /real-estate-projects/:id/activities` (org-scoped,
      `realestate.projects` read access).
  - `src/api/real-estate-project/routes/real-estate-project.js` — registers the `/activities` route.
  - No changes to the shared `crm-activity` controller/content-type (only its storage is reused).

- **Frontend** (`apps/real-estate-crm`)
  - `lib/api/projectService.ts` — `listProjectActivities(id)` + `ProjectActivity` type.
  - `app/projects/[id]/page.tsx` — fetches activities, merges them with lead/visit events, and
    feeds `ActivitiesTimeline`. Re-fetches after inline edits so new events appear immediately.

## Data model

Reuses the existing `crm_activities` collection (no new content type):

- `subjectType`: `"real_estate_project"`
- `subjectId`: project id
- `action`: `create | update`
- `summary`: e.g. `Jane created project "Skyline Towers"`
- `meta.changes`: `[{ key, label, before, after }]` for updates
- `actor`, `organization`: request user + active org

## Notes / Follow-ups

- Comments/chat (the "Chats" sub-tab on CRM lead-companies) are not enabled here — there is no
  project-comment endpoint for real-estate projects. Could be added later by extending the
  `crm-activities/comments` controller to accept a `realEstateProjectId` scope.
- Delete events are intentionally not logged (the project timeline is gone once deleted).
