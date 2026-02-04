import { clsx } from 'clsx'

export function Table({
  columns = [],
  data = [],
  className,
  headerClassName,
  bodyClassName,
  rowClassName,
  onRowClick,
  keyField = 'id',
  variant = 'default',
  ...props
}) {
  const variants = {
    default: {
      container: 'overflow-x-auto bg-white',
      table: 'min-w-full divide-y divide-gray-200',
      header: 'bg-gray-50',
      headerCell:
        'px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider',
      body: 'bg-white divide-y divide-gray-100',
      row: 'hover:bg-gray-50 transition-colors duration-150',
      cell: 'px-6 py-4 text-sm text-gray-900',
    },
    modern: {
      container: 'overflow-x-auto bg-white border border-gray-200 rounded-xl',
      table: 'min-w-full',
      header: 'bg-gray-50 border-b border-gray-200',
      headerCell: 'px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide',
      body: 'bg-white divide-y divide-gray-100',
      row: 'hover:bg-blue-50/50 transition-all duration-200 group',
      cell: 'px-6 py-4 text-sm text-gray-700 group-hover:text-gray-900',
    },
    compact: {
      container: 'overflow-x-auto bg-white',
      table: 'min-w-full',
      header: 'bg-white border-b-2 border-gray-200',
      headerCell: 'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase',
      body: 'bg-white divide-y divide-gray-100',
      row: 'hover:bg-gray-50 transition-colors',
      cell: 'px-4 py-3 text-sm text-gray-700',
    },
  }

  const styles = variants[variant] || variants.default

  return (
    <div className={clsx(styles.container, 'transition-shadow duration-300')}>
      <table className={clsx(styles.table, className)} {...props}>
        <thead className={clsx(styles.header, headerClassName)}>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                className={clsx(styles.headerCell, column.headerClassName)}
                style={
                  column.width
                    ? {
                        width: column.width,
                        minWidth: column.width,
                        maxWidth: column.width,
                      }
                    : {}
                }
              >
                {column.title || column.label || ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={clsx(styles.body, bodyClassName)}>
          {data.map((row, rowIndex) => (
            <tr
              key={row[keyField] || row.id || rowIndex}
              className={clsx(styles.row, onRowClick && 'cursor-pointer', rowClassName)}
              onClick={() => onRowClick && onRowClick(row, rowIndex)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.key || colIndex}
                  className={clsx(styles.cell, column.className)}
                  style={
                    column.width
                      ? {
                          width: column.width,
                          minWidth: column.width,
                          maxWidth: column.width,
                        }
                      : {}
                  }
                >
                  {column.render ? column.render(row[column.key], row, rowIndex) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
