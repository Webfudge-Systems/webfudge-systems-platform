'use client'

/** Shared title block for glass dashboard cards (charts + sidebar panels) */
export default function HRPanelHeader({ title, subtitle, icon: Icon, className = '' }) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {Icon ? (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-200/80 bg-white/60 shadow-sm"
          aria-hidden
        >
          <Icon className="h-5 w-5 text-orange-600" />
        </div>
      ) : null}
    </div>
  )
}
