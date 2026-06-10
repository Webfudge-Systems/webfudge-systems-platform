'use client'

/**
 * Standard HR module page shell — matches CRM/PM `space-y-6 p-4 md:p-6`.
 */
export default function HRModulePage({ children, className = '' }) {
  return <div className={`space-y-6 p-4 md:p-6 ${className}`.trim()}>{children}</div>
}
