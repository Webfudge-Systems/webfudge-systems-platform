'use client'

/**
 * Lightweight kanban columns for HR list pages (PM-style status boards).
 */
export default function HRKanbanBoard({ columns = [], renderCard, onCardClick, emptyLabel = 'No items' }) {
  if (!columns.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/60 p-3">
      <div className="flex min-w-max gap-4">
        {columns.map((column) => (
          <div
            key={column.key}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-200 px-3 py-2.5">
              <h3 className="text-sm font-semibold text-gray-900">
                {column.label}
                <span className="ml-1.5 text-xs font-medium text-gray-500">({column.items.length})</span>
              </h3>
            </div>
            <div className="flex max-h-[min(70vh,640px)] flex-col gap-2 overflow-y-auto p-2">
              {column.items.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-gray-400">No records</p>
              ) : (
                column.items.map((item) => (
                  <button
                    key={column.getKey?.(item) ?? item.id ?? item.employeeId}
                    type="button"
                    onClick={() => onCardClick?.(item)}
                    className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-orange-200 hover:shadow-md"
                  >
                    {renderCard(item)}
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
