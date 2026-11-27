# Status Reporter (W17, SaaS · Fudge Work)

Fudge AI writes each project's weekly update from real task activity, in two versions: an internal
one for the delivery team and a client one for the client's contacts. Nothing is sent until a person
approves it; approving is one click.

Built on the P5 AI foundation (`docs/AI_PLATFORM.md`).

## Flow

1. **Friday 16:00 IST** (`weeklyStatusDrafts` in `apps/backend/config/cron-tasks.js`) every org with
   a live Work subscription whose plan includes `pm.ai_teammates` (Business, or a trial) gets a draft
   for each active project that has tasks. Completed / cancelled / archived projects are skipped; a
   project that already has this week's report is skipped (the Friday run never overwrites a draft).
   When an org runs out of AI credits the run stops for that org.
2. Anyone who can send for a project can also write the draft on demand: Work → **Weekly updates** →
   "Write update" (`POST /api/status-reports/generate`). Rewriting replaces an unsent draft.
3. One model call (template `work.weekly_status`, strong tier, metered as feature
   `work.weekly_status`) gets: tasks done this week, in progress, blocked / on hold / overdue, due next
   week, this week's task comments, and totals. It returns both versions as structured data, which
   are rendered to an editable subject + plain-text message.
4. Each version that has recipients is proposed as the outbound AI action
   `work.status_report.send`, so it waits in the approval queue (Accounts → AI approvals and the
   Weekly updates page). Editing the draft updates the queued action, so the approver always sends
   exactly what they see.
5. **Approve and send** (`POST /api/status-reports/:id/send`) or Approve in the AI queue runs the
   action as the approver: permission re-checked, audit row with Fudge AI as actor, one email per
   recipient.

Weeks run Monday 00:00 IST to the time the draft is written; reports are keyed by ISO week
(`weekKey`, e.g. `2026-W48`).

## Recipients

- **Client version**: contacts of the project's client account that have W10 portal access; if none
  do, the client account's primary contacts. Plus the project's customer contact. Editable.
- **Internal version**: the project manager and team members. Editable.

## Channels

`apps/backend/src/utils/status-reports/channels.js` has one interface per channel.

- **Email** works now (Resend via `utils/mailer`, `MAIL_FROM`). Without `RESEND_API_KEY` nothing is
  delivered; the version is marked sent with a note saying email is not configured.
- **WhatsApp** is listed but unavailable: the API answers `400 CHANNEL_UNAVAILABLE` and the UI shows
  it disabled. Implement `whatsapp.send` and set `available: true` when Fudge Connect ships.

## Who can do what

- See reports: anyone who can see the project (workspace rules from W1).
- Write, edit, send, discard: org admins, PM managers, users with PM projects write access, or the
  project's manager.
- Gate: `PLATFORM_MODE=saas`, `AI_ENABLED=true`, plan feature `pm.ai_teammates`.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/status-reports?projectId=&weekKey=&status=` | reports on projects you can see; `meta.weekKey`, `meta.channels` |
| GET | `/api/status-reports/channels` | channels and availability |
| POST | `/api/status-reports/generate` | `{ projectId, language? }` (`en`, `hi`, `mr`) |
| GET | `/api/status-reports/:id` | |
| PUT | `/api/status-reports/:id` | `{ client?: { subject, body, recipients, channel }, internal?: {...} }` |
| POST | `/api/status-reports/:id/send` | `{ audience: 'client' \| 'internal', channel?, subject?, body?, recipients? }` |
| POST | `/api/status-reports/:id/discard` | `{ audience? }` |

## Config

- `WEEKLY_STATUS_CRON=off` turns the Friday run off; `WEEKLY_STATUS_CRON_RULE` overrides the cron
  rule (default `0 16 * * 5`, Asia/Kolkata).

## Data

New collection `status_reports` (`api::status-report.status-report`), additive only: project,
organization, `weekKey`, period, status, source, language, health, the AI's structured output
(`aiContent`), the activity snapshot, both versions (`versions`: subject, body, recipients, channel,
queued action id, sent state), model, credits used.

## Tests

`cd apps/backend && npm run test:ai` runs `tests/ai/status-reports.test.js` with the other AI tests
(real Strapi on a temporary SQLite database, mocked model provider).
