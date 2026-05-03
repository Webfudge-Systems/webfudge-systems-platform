# Landing: CRM/PM fonts + “Based on our data” section

## Summary

The marketing landing app now uses the same type pairing as **CRM/PM**: **Host Grotesk** for headings and **Inter** for body UI. A new home section, **Based on our data**, replaces the old app UI screenshot block with a light “data products” card grid (ref-style: intro line + four cards, one featured, bottom “Talk with us” links to `/contact`).

## Scope

- `apps/landing/app/layout.js` — `Inter` via `next/font` (`--font-inter` on `<html>`).
- `apps/landing/app/globals.css` — Google Fonts import for **Host Grotesk**; `--font-host-grotesk` in `:root`; base `body` / heading rules.
- `apps/landing/tailwind.config.js` — `fontFamily.sans` / `heading` use the CSS variables.
- `apps/landing/components/HeroSection.jsx` — font variables point to Host Grotesk + Inter.
- `apps/landing/components/sections/home/BasedOnDataSection.jsx` — new section (inline styles).
- `apps/landing/app/page.js` — home uses `BasedOnDataSection` instead of `AppUISection`.
- `apps/landing/components/sections/home/index.js` — exports `BasedOnDataSection`.

## Technical notes

- `Host Grotesk` is not exposed as `next/font/google` in this Next.js version; it is loaded with the same Google Fonts URL pattern as CRM (`globals.css` `@import`).
- `Inter` stays on `next/font` for optimal subsetting and the `--font-inter` variable.

## Usage

- Headings: `font-family: var(--font-host-grotesk)` or Tailwind `font-heading` where configured.
- Body: inherits Inter via `body` in `globals.css` or `font-sans`.
