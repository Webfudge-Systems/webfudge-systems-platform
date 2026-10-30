import { clsx } from 'clsx'

/**
 * CRM-style "Showing N results" line above a data table.
 */
export function TableResultsCount({ count, className }) {
  return (
    <div
      className={clsx(
        'text-sm',
        'text-gray-600',
        className
      )}
    >
      Showing{' '}
      <span
        className={clsx(
          'font-semibold',
          'text-gray-900'
        )}
      >
        {count}
      </span>{' '}
      result{count !== 1 ? 's' : ''}
    </div>
  )
}

/**
 * Empty block below a `Table` (border-t by default), matching CRM/PM list pages.
 * Pass `bordered={false}` for standalone empties (e.g. empty kanban shell).
 */
export function TableEmptyBelow({
  icon: Icon,
  title,
  description,
  action,
  bordered = true,
  className,
}) {
  return (
    <div
      className={clsx(
        'p-12 text-center',
        bordered && 'border-t border-gray-200',
        className
      )}
    >
      {Icon ? (
        <div className="mb-2 text-gray-400">
          <Icon
            className="mx-auto mb-3 h-12 w-12 opacity-50"
            strokeWidth={1.25}
            aria-hidden
          />
        </div>
      ) : null}
      {title ? (
        <h3 className="mb-2 text-lg font-semibold text-gray-700">{title}</h3>
      ) : null}
      {description ? (
        <p className="mb-4 text-sm text-gray-500">{description}</p>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  )
}
