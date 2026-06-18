'use client'

/** Shared spacing for drawer quick-action forms */
export const HR_QUICK_FORM_ID = 'hr-quick-action-form'

export function HRQuickForm({ children, onSubmit }) {
  return (
    <form id={HR_QUICK_FORM_ID} onSubmit={onSubmit} className="space-y-6">
      {children}
    </form>
  )
}

export function HRQuickFormSection({ title, description, children }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function HRQuickFormDivider() {
  return <div className="border-t border-gray-100" aria-hidden />
}
