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
 * Empty block below a `Table` (border-t), matching CRM list pages (e.g. lead companies).
 */
export function TableEmptyBelow({ icon: Icon, title, description, action, className }) {
  return (
    <div className={clsx('bg-transparent p-12 text-center', className)}>
      {Icon ? (
        <div
          className={clsx(
            'mx-auto mb-4 flex h-14 w-14 items-center justify-center',
            'text-gray-400'
          )}
        >
          <Icon className="h-10 w-10 opacity-90" strokeWidth={1.25} aria-hidden />
        </div>
      ) : null}
      {title ? (
        <h3
          className={clsx(
            'text-base font-semibold',
            'text-gray-900'
          )}
        >
          {title}
        </h3>
      ) : null}
      {description ? (
        <p
          className={clsx(
            'mx-auto mt-1.5 max-w-md text-sm leading-relaxed',
            'text-gray-500'
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
