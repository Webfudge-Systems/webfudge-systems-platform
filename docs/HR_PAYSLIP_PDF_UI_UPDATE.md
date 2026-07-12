# Payslip PDF UI Update

## Summary

Redesigned the downloadable payslip PDF from plain stacked text into a structured, branded salary slip layout aligned with HR payroll styling (orange header, bordered sections, side-by-side earnings/deductions tables).

## Scope

- `apps/backend/src/utils/payslip-pdf.js` — new PDF layout builder
- `apps/backend/src/api/payslip/controllers/payslip.js` — uses shared builder for `/api/payslips/:id/download`

## Details

### Before
- Unstyled PDFKit text lines
- Earnings and deductions as simple lists
- Net pay as a single right-aligned line
- Period shown as `7/2026`

### After
- **Header band** — company name, “Salary Slip”, pay period, confidential label
- **Employee details card** — two-column label/value grid (payslip no, employee, ID, department, designation, pay period, run, generated date, run status)
- **Earnings & deductions tables** — bordered tables with row separators and bold totals
- **Net pay highlight** — emphasized summary block with ₹ formatting (`en-IN`)
- **Footer** — system-generated disclaimer

Company name is read from `payslip.organization.name` when populated; falls back to **Webfudge Systems**.

## Usage

1. Restart the Strapi backend after pulling this change.
2. HR → Payroll → Payslips → download an existing payslip (no re-generation required).
3. New downloads use the updated layout automatically.

## Migration

None. Existing payslip records are unchanged; only PDF rendering is updated.
