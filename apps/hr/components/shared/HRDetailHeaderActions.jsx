'use client'

const baseButtonClass =
  'inline-flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-45'

const variantClasses = {
  default:
    'p-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 hover:border-white/30 shadow-lg text-brand-text-light focus:ring-white/30',
  danger:
    'p-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-red-500/20 hover:border-red-400/45 shadow-lg text-brand-text-light hover:text-red-50 focus:ring-red-500/20',
  primary:
    'gap-2 px-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg hover:opacity-95 focus:ring-orange-500/30',
}

export function HRHeaderActionButton({
  icon: Icon,
  label,
  title,
  variant = 'default',
  disabled = false,
  onClick,
  showLabel = variant === 'primary',
}) {
  return (
    <button
      type="button"
      className={`${baseButtonClass} ${variantClasses[variant] || variantClasses.default}`}
      disabled={disabled}
      onClick={onClick}
      title={title || label}
      aria-label={title || label}
    >
      {Icon ? <Icon className={showLabel ? 'h-4 w-4 shrink-0' : 'h-5 w-5 shrink-0'} aria-hidden /> : null}
      {showLabel ? <span>{label}</span> : null}
    </button>
  )
}

export default function HRDetailHeaderActions({ actions = [] }) {
  const visibleActions = actions.filter(Boolean)

  if (!visibleActions.length) return null

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {visibleActions.map((action) => (
        <HRHeaderActionButton key={action.key || action.label} {...action} />
      ))}
    </div>
  )
}
