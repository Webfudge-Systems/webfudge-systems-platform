'use client'

/**
 * Standard HR module page shell — matches PM `p-4 space-y-4 bg-white min-h-full`.
 */
export default function HRModulePage({ children, className = '' }) {
  return <div className={`p-4 space-y-4 bg-white min-h-full ${className}`.trim()}>{children}</div>
}
