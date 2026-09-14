# CRM Lead Status: Remove Client, Converted Flow

## Summary

Lead companies no longer use a **Client** pipeline status. Legacy `CLIENT` rows are remapped to **Qualified** (or **Converted** if already linked to a client account). Selecting **Converted** opens a confirmation modal, then the **Add Client** form prefilled from the lead; saving the client marks the lead as Converted and links the account.

Status column descending sort order is: **Converted → Qualified → Contacted → New → Lost**.

## Scope

- `packages/ui` — `LEAD_STATUS_OPTIONS`, lead status badges/select
- `apps/crm` — lead companies list/detail/kanban, add client page, sort values, dashboard widget
- `apps/backend` — lead-company statuses, stats, CLIENT→QUALIFIED remap, convert with optional `clientAccountId`

## Details

### Statuses

Allowed statuses: `NEW`, `CONTACTED`, `QUALIFIED`, `LOST`, `CONVERTED`.

- `CLIENT` removed from UI options and kanban columns.
- On list/detail fetch, persisted `CLIENT` rows are rewritten to `QUALIFIED` (or `CONVERTED` when `convertedAccount` exists).
- QUALIFIED filters/stats include legacy CLIENT until remapped.

### Converted workflow

1. User selects **Converted** (table dropdown, kanban, or Convert to Client on detail).
2. Confirmation modal explains they will continue on Add Client.
3. Navigate to `/clients/accounts/new?fromLead={id}` with company/contact fields prefilled.
4. On save: create client account, then `POST /lead-companies/:id/convert` with `{ clientAccountId }` to mark lead Converted and link contacts (without creating a second client).

### Sorting

`LEAD_STATUS_ORDER` ranks Converted highest through Lost lowest. Descending status sort uses that order client-side (`sortedData`). API status sort is skipped so alphabetical Strapi sort does not fight the pipeline order.

## Usage

- Prefer **Converted** from the status control (not a separate Client badge).
- Complete conversion by saving the prefilled Add Client form.
- Existing auto-create convert API still works when called without `clientAccountId` (e.g. legacy callers).
