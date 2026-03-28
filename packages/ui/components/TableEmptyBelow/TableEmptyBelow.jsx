import { clsx } from 'clsx'

/**
 * CRM-style "Showing N results" line above a data table.
 */
export function TableResultsCount({ count, className }) {
  return (
    <div className={clsx('text-sm text-gray-600', className)}>
      Showing <span className="font-semibold text-gray-900">{count}</span> result
      {count !== 1 ? 's' : ''}
    </div>
  )
}

/**
 * Empty block below a `Table` (border-t), matching CRM list pages (e.g. lead companies).
 */
export function TableEmptyBelow({ icon: Icon, title, description, action, className }) {
  return (
    <div className={clsx('p-12 text-center border-t border-gray-200 bg-white', className)}>
      {Icon && (
        <div className="text-gray-400 mb-2">
          <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" strokeWidth={1.25} />
        </div>
      )}
      {title && <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>}
      {description && (
        <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action ? <div>{action}</div> : null}
    </div>
  )
}
