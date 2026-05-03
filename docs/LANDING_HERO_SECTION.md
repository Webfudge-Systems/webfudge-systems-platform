# Landing home hero + navbar update

## Summary

The marketing home (`apps/landing`) hero was rebuilt as a single dark-themed block: grid background, layered orange light beam (cone, halo, spine), integrated navbar, headline + CTAs, and a browser-framed CRM screenshot with beam glow overlay and bottom fade into `#090909`.

Syne (700, 800) and DM Sans (300, 400, 500) load via `next/font/google` on the root layout with CSS variables `--font-syne` and `--font-dm-sans`.

## Scope

- `apps/landing/components/HeroSection.jsx` — hero UI (inline styles only).
- `apps/landing/app/layout.js` — font variables on `<html>`.
- `apps/landing/components/layout/ConditionalNavbar.jsx` — global navbar hidden on `/` so the hero’s navbar is the only top nav on the home page.
- `apps/landing/components/sections/home/HeroSection.jsx` — re-exports the new component.
- `apps/landing/public/crm-demo.png` — screenshot path used by `next/image` (replace with your asset as needed).
- `apps/landing/components/sections/home/AppUISection.jsx` — section id set to `products` for the `#products` anchor from “View Products →”.

## Usage / migration

Replace `public/crm-demo.png` with your full-resolution CRM screenshot; dimensions in `<Image>` can be adjusted if the aspect ratio differs.
