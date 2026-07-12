# PM Development Tasks

## Summary

PM tasks can be marked as **Development** instead of **General**. Major development tasks support a **delivery pipeline**, **team roles** (Developer, BA, QA, Tester, Tech Lead), and **dev ticket** management. Dev tickets are child tasks (subtasks) with ticket keys, types, and their own pipeline position.

## Scope

| Area | Files |
|------|--------|
| Schema | `apps/backend/src/api/task/content-types/task/schema.json` — `taskCategory`, `devMetadata` |
| PM lib | `apps/pm/lib/taskDev.js` — roles, pipeline, ticket helpers |
| PM UI | `TaskCategorySwitch`, `TaskDevFormFields`, `TaskDevRolePickers`, `DevPipelineShowcase`, `DevTeamRolesPanel`, `DevTicketsPanel`, `DevTicketModal`, `TaskDevDetailsPanel` |
| Create/edit | `QuickCreateTaskModal.jsx`, `TaskDetailsCard.jsx` |
| Detail page | `apps/pm/app/tasks/[id]/page.js` — Development tab |

## Task model

| Level | Description |
|-------|-------------|
| **Major dev task** | `taskCategory: development`, no `parent`. Holds team roles, acceptance criteria, pipeline, and dev tickets. |
| **Dev ticket** | Subtask of a major dev task. `devMetadata.isDevTicket: true`, auto `ticketKey` (e.g. `DEV-42-01`), ticket type, own pipeline. |

General tasks are unchanged.

## Development tab sections

1. **Delivery pipeline** — Backlog → Development → Code Review → QA → Ready → Done. Click a stage (when editable) to sync task status, review, and QA fields.
2. **Team & roles** — Shows assigned Developer, BA, QA, Tester, Tech Lead (major tasks only).
3. **Development scope** — Work type, area, estimates, branch, PR, acceptance criteria.
4. **Dev tickets** — Table of child tickets with key, type, assignee, status, pipeline (major tasks only).

## `devMetadata` shape

```json
{
  "workType": "feature",
  "area": "backend",
  "storyPoints": 3,
  "estimateHours": 8,
  "branch": "feat/books-ui",
  "prUrl": "https://github.com/…/pull/42",
  "repo": "webfudge-platform",
  "environment": "dev",
  "reviewStatus": "in_review",
  "qaStatus": "untested",
  "releaseVersion": "v2.4.0",
  "severity": null,
  "pipelineStage": "code_review",
  "roles": {
    "developer": "12",
    "ba": "8",
    "qa": "15",
    "tester": "22",
    "techLead": "5"
  },
  "isDevTicket": false,
  "ticketType": "implementation",
  "ticketKey": null,
  "acceptanceCriteria": []
}
```

## Usage

1. Create a task → switch to **Development** → assign team roles → save.
2. Open **Development** tab → use pipeline to advance status.
3. Click **Add ticket** to create implementation, test, review, or deployment tickets.
4. Open a ticket to view its own pipeline and details.

## Migration

Restart Strapi after schema changes. Existing tasks remain `general`.
