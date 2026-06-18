'use client'

/**
 * Simple chronological timeline list (PM timeline view placeholder for HR).
 */
export default function HRTimelineList({ items = [], renderItem, getKey, emptyLabel = 'No items' }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <ul className="divide-y divide-gray-200">
        {items.map((item, index) => (
          <li key={getKey?.(item, index) ?? index} className="px-4 py-3">
            {renderItem(item, index)}
          </li>
        ))}
      </ul>
    </div>
  )
}
