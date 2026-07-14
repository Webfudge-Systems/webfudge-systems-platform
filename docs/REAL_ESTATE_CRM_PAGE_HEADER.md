# Real Estate CRM — Shared Page Header

## Summary

Added a shared top header (the same glassmorphism `AppPageHeader`/`WorkspaceHeader` used by the
main CRM, PM, Books, etc.) to every authenticated page of the Real Estate CRM (`apps/real-estate-crm`).
Previously each page rendered an ad-hoc `<h1>` + paragraph block. Pages now render a consistent
header with title, subtitle, breadcrumb, a working notification bell, and the profile dropdown —
matching the look and behavior of `apps/crm`.

The sidebar was also restyled in the same effort to match the CRM tile-grid design (see
`RealEstateSidebar.tsx`).

## Scope

- **App**: `apps/real-estate-crm`
- **New files**:
  - `components/EstatePageHeader.tsx` — thin wrapper over `@webfudge/ui`'s `AppPageHeader`,
    mirroring `apps/crm/components/CRMPageHeader.jsx`. Defaults `showBack` to `true` on non-root routes.
  - `lib/api/notificationService.ts` — org-scoped notification service (mirror of the CRM one)
    powering the header bell.
- **Updated**:
  - `types/webfudge-ui.d.ts` — added ambient module for `@webfudge/ui/utils/notificationDisplay`.
  - Pages: `app/page.tsx`, `app/leads/page.tsx`, `app/leads/new/page.tsx`, `app/leads/[id]/page.tsx`,
    `app/leads/[id]/edit/page.tsx`, `app/contacts/page.tsx`, `app/contacts/new/page.tsx`,
    `app/contacts/[id]/page.tsx`, `app/contacts/[id]/edit/page.tsx`, `app/pipeline/page.tsx`,
    `app/projects/page.tsx`, `app/projects/[id]/page.tsx`, `app/site-visits/page.tsx`,
    `app/settings/page.tsx`, `app/settings/integrations/page.tsx`.

## Details

- Each page's old header block was replaced with `<EstatePageHeader title=… subtitle=… breadcrumb=… />`.
- List pages that had an "Add" button (Leads, Contacts, Projects) now pass that button through the
  header's `actions` prop.
- Detail pages (lead / contact / project) pass a custom `onBack` so the labeled back control
  returns to the parent list, and the lead detail keeps its tier pill + status badge + Edit button
  in `actions`.
- Public auth pages (`/login`, `/unauthorized`) intentionally do **not** get the workspace header.

## Usage

```tsx
import EstatePageHeader from '../components/EstatePageHeader'

<EstatePageHeader
  title="Leads"
  subtitle="Sorted by score — hot leads at the top, always."
  breadcrumb={[
    { label: 'Dashboard', href: '/' },
    { label: 'Leads', href: '/leads' },
  ]}
  actions={/* optional ReactNode, e.g. an Add button */}
/>
```

`showBack` auto-enables on any route other than `/`; pass `onBack` to override the destination.
