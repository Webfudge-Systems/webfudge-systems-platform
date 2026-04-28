'use client';

/**
 * Shared detail-page typography and field layout (aligned with
 * `app/sales/lead-companies/[id]/page.js` — Company information, sidebar blocks).
 */

export const entityInfoLabelClass =
  'flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:text-sm';

/** Vertical section with orange icon + uppercase title (lead “Company profile” / “Location”). */
export function InfoSection({ title, icon: Icon, children, isFirst = false }) {
  return (
    <section className={isFirst ? 'pt-0' : 'border-t border-gray-100 pt-4'}>
      <div className="mb-2 flex items-center gap-2">
        {Icon ? <Icon className="h-5 w-5 shrink-0 text-orange-500" aria-hidden /> : null}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
      </div>
      {children}
    </section>
  );
}

/** Column title inside a multi-column card (no top divider). */
export function DetailColumnHeading({ title, icon: Icon }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      {Icon ? <Icon className="h-5 w-5 shrink-0 text-orange-500" aria-hidden /> : null}
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
    </div>
  );
}

/**
 * Stacked label + value; optional `children` replace the value block.
 * Empty values render as em dash (lead detail behavior).
 */
export function InfoRow({ label, value, icon: RowIcon, className = '', emphasize = false, children }) {
  const hasCustom = children != null;

  if (hasCustom) {
    return (
      <div className={`min-w-0 ${className}`} role="group" aria-label={label}>
        <div className={entityInfoLabelClass}>
          {RowIcon ? <RowIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden /> : null}
          <span>{label}</span>
        </div>
        <div className="mt-2.5 text-base leading-snug">{children}</div>
      </div>
    );
  }

  const raw = value == null ? '' : String(value).trim();
  const empty = !raw || raw === '—';
  const display = empty ? '—' : raw;

  return (
    <div
      className={`min-w-0 ${className}`}
      role="group"
      aria-label={`${label}: ${empty ? 'empty' : display}`}
    >
      <div className={entityInfoLabelClass}>
        {RowIcon ? <RowIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden /> : null}
        <span>{label}</span>
      </div>
      <div className="mt-2.5">
        {!empty && emphasize ? (
          <span className="inline-flex rounded-lg bg-orange-50 px-3 py-2 text-base font-semibold text-orange-900 shadow-sm ring-1 ring-orange-200/80">
            {display}
          </span>
        ) : (
          <p
            className={`text-base leading-snug ${empty ? 'font-normal text-gray-400' : 'font-semibold text-gray-900'}`}
          >
            {display}
          </p>
        )}
      </div>
    </div>
  );
}

/** Sidebar card title (lead “Activity summary” style). */
export function SidebarCardTitle({ title, icon: Icon }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-orange-500" aria-hidden /> : null}
      {title}
    </h3>
  );
}
