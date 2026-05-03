# Landing Homepage Redesign (May 2026)

## Summary
The landing home flow was rebuilt to match the latest visual references with a consistent width system, typography (Host Grotesk + Inter), and section-by-section storytelling from hero through footer.

## Scope
- App: `apps/landing`
- Updated:
  - `app/page.js`
  - `components/HeroSection.jsx`
  - `components/sections/home/index.js`
  - `components/sections/home/IndustriesWeServeSection.jsx`
- Added:
  - `components/sections/home/HookLineSection.jsx`
  - `components/sections/home/WhyUsSection.jsx`
  - `components/sections/home/AppFeaturesSection.jsx`
  - `components/sections/home/FooterSection.jsx`

## Details

### 1) Industries section replica
- Reworked to the orange split layout:
  - left: heading, description, minimal controls (arrows + dots)
  - right: stacked peeking cards with centered active card
- Uses the hero CTA orange (`#e84b18`) for color consistency.
- Maintains intentional vertical breathing room so top/bottom cards do not touch section bounds.

### 2) Hook line section
- Added a dedicated conversion-focused section directly below industries.
- Includes a high-impact headline and supporting copy focused on UI/UX value.

### 3) Why Us section (6 cards)
- Added a 6-card explanation grid with minimal visual treatment inspired by the provided layout.
- Left column introduces positioning; right grid presents reasons/features.

### 4) App features showcase
- Added a heading style inspired by the reference and a 4-card product showcase.
- Cards present key products/modules with preview imagery and concise descriptions.

### 5) Footer section
- Added a structured footer block below contact with:
  - brand intro and CTA
  - services column
  - quick links column
  - social/follow column
  - legal strip

### 6) Hero alignment pass
- Updated hero content/frame container widths and paddings to align headline, CTAs, and CRM frame on one consistent page grid.

## Usage / Notes
- Home page section order is now:
  1. Hero
  2. Industries
  3. Hook line
  4. Why us
  5. App features
  6. Contact form
  7. Footer
- Legacy sections remain in codebase but are not rendered on the home route.
