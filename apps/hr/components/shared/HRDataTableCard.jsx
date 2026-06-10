'use client'

/**
 * CRM-style table shell (border + shadow + rounded corners).
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
