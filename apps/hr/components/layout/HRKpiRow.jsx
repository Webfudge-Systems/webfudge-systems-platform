'use client'

const COLUMN_CLASS = {
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
  6: 'sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6',
}

/**
 * KPI strip — same grid as CRM/PM list pages.
 */
export default function HRKpiRow({ children, columns = 4, className = '' }) {
  const colClass = COLUMN_CLASS[columns] || COLUMN_CLASS[4]
  return (
    <div className={`grid grid-cols-1 gap-4 ${colClass} ${className}`.trim()}>{children}</div>
  )
}
