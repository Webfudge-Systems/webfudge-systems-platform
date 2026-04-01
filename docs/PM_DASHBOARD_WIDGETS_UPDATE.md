# PM Dashboard Widgets Update

## Summary
Updated the PM dashboard (“My Tasks” + “Projects” cards) to match the provided reference layout. The changes focus on empty-state visuals for My Tasks and a table-like projects list (header + 4 rows) with the correct date formatting.

## Scope
- App: `apps/pm/app/page.js`
- Updated UI blocks:
  - `My Tasks` card empty state
  - `Projects` card table-like list + header

## Details
### My Tasks card
- Removed the “View All” action from the card header.
- Replaced the empty state UI with a centered menu icon in a rounded light-gray square.
- Removed the “Create Task” action from the empty state to match the reference.

### Projects card
- Updated “+ Create New Project” button styling to use an orange->pink gradient and pill shape.
- Replaced the previous colored-initials list with:
  - A table-like header row (`PROJECT`, `DUE DATE`) including sort icons
  - A 4-row list layout: avatar + project name on the left, due date with calendar icon on the right
- Due dates are formatted as `MMM DD` (no year) to match the reference.

### People + Private Notepad cards
- People card now renders an avatar grid (top 6) using real transformed user data (not just the count), and shows a “Show More” affordance when there are more than 6 users.
- Private Notepad card now uses a dashboard-style “editor” UI: toolbar affordances plus word/character footer and a Priority control. Notes are still persisted via `localStorage` on blur.

## Testing / Verification
- Open PM dashboard and confirm the “My Tasks” + “Projects” cards visually match the reference (spacing, alignment, empty-state icon, and projects table rows).

