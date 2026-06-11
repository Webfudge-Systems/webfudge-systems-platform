# Accounts Greenway UI Alignment

## Summary

Aligned the Accounts app sidebar and key admin pages (Organization, Security, Teams) with the layout patterns used in `greenways_suite`.

## Scope

- `apps/accounts/components/AccountsSidebar.jsx` — gradient divider below product branding
- `apps/accounts/app/settings/page.js` — Organization settings (glass cards, 2/3 grid, sticky aside)
- `apps/accounts/app/security/page.js` — full security settings page (replaces placeholder shell)
- `apps/accounts/app/teams/page.js` — teams list with CRUD modal (replaces placeholder shell)
- `apps/accounts/lib/securitySettings.js` — security form helpers
- `apps/accounts/lib/api/organizationService.js` — `getSecuritySettings` / `updateSecuritySettings`
- `apps/accounts/lib/api/teamsService.js` — full CRUD with relation populate

## Details

### Sidebar

- Removed opaque `border-b` under the logo block.
- Added orange gradient divider (`from-transparent via-orange-400/50 to-transparent`) below product name when expanded.
- Header padding matches Greenway: `px-4 pt-4 pb-3`.

### Settings / Organization (`/settings`)

- `space-y-4 bg-white p-4` page shell.
- Glass `Card` sections instead of `FormSectionCard`.
- Separate “Save changes” card.
- Sticky right aside with orange info card and structured “Your access” panel.

### Security (`/security`)

- Same settings-page shell and 2/3 grid as Organization.
- Authentication, Sessions, and Email domain restriction cards.
- Admin-only access with redirect to `/unauthorized` for non-admins.
- Backend: `GET/PATCH /organizations/:id/security-settings` on Strapi (`apps/backend`), with `securitySettings` JSON on the organization content type.

### Teams (`/teams`)

- List page shell: `bg-gray-50` with header search + “Add team” action.
- Table with create/edit modal (department, leader, members).
- Uses upgraded `teamsService` with populate and CRUD.

## Usage / Migration

Restart the Strapi backend after pulling so the new routes and schema field load. No data migration required — defaults apply when `securitySettings` is empty.

**API**

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/organizations/:id/security-settings` | Org Admin |
| PATCH | `/api/organizations/:id/security-settings` | Org Admin |

PATCH body: `{ "securitySettings": { "requireMfa", "sessionTimeoutMinutes", "passwordMinLength", "allowPasswordLogin", "allowedEmailDomains" } }`
