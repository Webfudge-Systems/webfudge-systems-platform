# HR Sidebar – PM UI Alignment

## Summary

The HR app sidebar (`apps/hr/components/layout/HRSidebar.jsx`) was restyled to match the PM sidebar (`apps/pm/components/PMSidebar.jsx`): section headers, glass navigate tiles, Workforce panel (PM Projects-style), Tools panel, hide-mode shell, and `SidebarProductBranding` from `@webfudge/ui`.

## Scope

- **App:** `apps/hr`
- **Key files:** `components/layout/HRSidebar.jsx`, `lib/navigation.js`, `components/LayoutContent.jsx`
- **UI package:** `SidebarProductBranding`, `WorkspaceLayoutContent` (`sidebarBehavior="hide"`)

## Details

### Structure

| Section | Content |
| --- | --- |
| **Navigate** | 2×3 tile grid: Dashboard, Employees, Payroll, Expenses, Recruitment, Performance |
| **Workforce** | Orange card with employee links (All employees, Attendance, Leave) + add-employee action |
| **Tools** | Gray list panel: Analytics, Learning, Helpdesk, Settings |

### Visual alignment with PM

- Shell: `bg-white backdrop-blur-xl`, `w-64` / `w-16`, `PanelLeftClose` hide toggle
- Active tiles: `bg-brand-primary` with orange shadow
- Inactive tiles: glass `bg-white/20 backdrop-blur-md`
- Section dividers: uppercase labels with horizontal rules
- Removed pinned user footer (PM parity); profile via Settings / top bar

### Navigation config

`lib/navigation.js` exports `HR_NAVIGATE_TILES`, `HR_WORKFORCE_LINKS`, and `HR_TOOLS`. Legacy `HR_PRIMARY_TILES` / `HR_SECONDARY_TILES` aliases remain for compatibility.

## Usage / migration

No env changes. Sidebar hides fully on toggle; use the workspace top bar to reopen (same as PM/CRM). `HRSubSidebar` modal is no longer used from the main sidebar — workforce links are inline in the Workforce panel.
