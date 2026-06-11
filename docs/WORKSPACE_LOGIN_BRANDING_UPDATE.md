# Workspace Login Branding Update

## Summary

Aligned workspace app login pages and sidebars with the Xtrawrkx split-panel pattern, branded for **Webfudge Systems** (company) and each Fudge Suite product name.

| App | Product name |
| --- | --- |
| CRM | Fudge Grow |
| PM | Fudge Work |
| Accounts | Fudge Base |
| Books | Fudge Books |

## Scope

### `@webfudge/ui`

- `packages/ui/components/LoginBrandCorner/` — `LoginBrandCorner`, `LoginProductCredit`, `LoginMobileBrandHeader`

### Apps

| App | Site config | Login page |
| --- | --- | --- |
| Accounts | `apps/accounts/lib/site.js` | `apps/accounts/app/login/page.js` |
| CRM | `apps/crm/lib/site.js` | `apps/crm/app/login/page.js` |
| PM | `apps/pm/lib/site.js` | `apps/pm/app/login/page.js` |
| Books | `apps/books/lib/site.ts` | `apps/books/app/login/page.tsx` |
| VLM | `apps/(automobile)/vlm/lib/site.js` | `apps/(automobile)/vlm/app/login/page.js` |

## Visual pattern

- **Left panel (desktop):** Orange gradient, **Webfudge Systems** logo + name top-left (`LoginBrandCorner`), product name (`LoginProductCredit`), welcome copy, feature pills
- **Right panel:** Sign-in form; mobile shows `LoginMobileBrandHeader` with company mark + product name
- **Assets:** `public/logo/ws_logo_white.png` on orange panels; colored vertical logo on white form column

## Usage

Each app’s `lib/site.js` defines `brandName`, `brandIconPath`, `name`, `loginTagline`, `loginDetail`, and `loginFeatures` for the login panel.
