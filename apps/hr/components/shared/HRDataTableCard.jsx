'use client'

/**
 * PM-style list table shell — pair with `@webfudge/ui` `Table` using `variant="modernEmbedded"`.
 */
export default function HRDataTableCard({ children, className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`.trim()}
    >
      {children}
    </div>
  )
}

/** Results line above the table — matches PM list pages. */
export function HRListResultsCount({ count, page, totalPages }) {
  return (
    <div className="text-sm text-gray-600">
      Showing <span className="font-semibold text-gray-900">{count}</span> result
      {count !== 1 ? 's' : ''}
      {page != null && totalPages != null && totalPages > 1 ? (
        <>
          {' '}
          (page {page} of {totalPages})
        </>
      ) : null}
    </div>
  )
}
