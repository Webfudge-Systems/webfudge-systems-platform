# Workspace Sidebar Branding, Hide Mode & Back Button

## Summary

Aligned CRM, PM, and Accounts workspace shells with the Xtrawrkx suite pattern: centralized per-app branding via `lib/site.js`, **hide** (not collapse) sidebar behavior with a slim top bar to reopen, and a shared **Back** control on inner pages.

## Scope

### `@webfudge/ui`

- `packages/ui/layouts/AppShell/AppShell.jsx` — `sidebarBehavior` (`collapse` | `hide`) and `sidebarBranding`
- `packages/ui/layouts/AppShell/WorkspaceTopBar.jsx` — branding + open-sidebar control when hidden
- `packages/ui/components/WorkspaceLayoutContent/index.js` — forwards hide/branding props to `AppShell`
- `packages/ui/components/WorkspaceBackButton/` — shared back button styling
- `packages/ui/components/WorkspaceHeader/WorkspaceHeader.jsx` — `showBack`, `onBack`, `backLabel`
- `packages/ui/components/AppPageHeader/index.js` — forwards back props to `WorkspaceHeader`

### Apps

| App | Files |
| --- | --- |
| CRM | `lib/site.js`, `CRMSidebar.jsx`, `LayoutContent.jsx`, `CRMPageHeader.jsx` |
| PM | `lib/site.js`, `PMSidebar.jsx`, `LayoutContent.jsx`, `PMPageHeader.jsx` |
| Accounts | `lib/site.js`, `AccountsSidebar.jsx`, `LayoutContent.jsx`, `AccountsPageHeader.jsx` |
| Books | `BooksPageHeader.tsx`, `Topbar.tsx` |

## Details

### Sidebar branding

Each workspace app defines site config in `lib/site.js` / `lib/site.ts` with `logoPath`, `name` (product), and `brandName` (`Webfudge Systems`). Sidebars use `SidebarProductBranding` — product name on top, company name below — matching the Xtrawrkx pattern.

| App | Product name |
| --- | --- |
| CRM | Fudge Grow |
| PM | Fudge Work |
| Accounts | Fudge Base |
| Books | Fudge Books |

### Hidden sidebar

`WorkspaceLayoutContent` is configured with:

```jsx
sidebarBehavior="hide"
sidebarBranding={{
  logoPath: SITE.logoPath,
  productName: SITE.name,
  companyName: SITE.brandName,
  homeHref: '/',
}}
```

- Sidebar toggle uses `PanelLeftClose` and fully hides the rail (not icon-only collapse).
- When hidden, `WorkspaceTopBar` shows logo + two-line product branding and a button to reopen the sidebar.

### Back button

- `WorkspaceBackButton` — orange-bordered pill with chevron + label.
- `WorkspaceHeader` / `AppPageHeader` accept `showBack`, `onBack`, `backLabel`.
- CRM, PM, Accounts page headers default `showBack` to `true` when `pathname !== '/'`.
- Books `BooksPageHeader` and shell `Topbar` show back on non-home routes.

## Usage / Migration

- To opt an app into hide mode, pass `sidebarBehavior="hide"` and `sidebarBranding` to `WorkspaceLayoutContent`.
- To suppress back on a specific page, pass `showBack={false}` to the app page header.
- Custom back navigation: `onBack={() => router.push('/somewhere')}`.
