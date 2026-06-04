'use client'

export default function HRPageLayout({ children, className = '' }) {
  return <div className={`min-h-full p-4 space-y-4 bg-gray-50 ${className}`.trim()}>{children}</div>
}
