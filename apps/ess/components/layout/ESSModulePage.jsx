'use client'

export default function ESSModulePage({ children, className = '' }) {
  return <div className={`p-4 space-y-4 bg-white min-h-full ${className}`.trim()}>{children}</div>
}
