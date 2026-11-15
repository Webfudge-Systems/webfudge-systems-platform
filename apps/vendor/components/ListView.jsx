'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Table, TabsWithActions, Pagination, TableResultsCount, TableEmptyBelow, LoadingSpinner } from '@webfudge/ui'

/**
 * Tabs + search + sortable, paginated table — the list layout every vendor page shares.
 *
 * tabs:    [{ key, label, filter?: (row) => boolean }]  (the active tab is kept in ?tab=)
 * columns: shared Table columns, plus optional `sortValue: (row) => any` to make a column sortable
 * search:  (row) => string  — text the search box matches against
 * defaultSort: { key, direction }
 */
export default function ListView({
  rows = [],
  loading = false,
  tabs = [],
  columns,
  search,
  searchPlaceholder = 'Search...',
  defaultSort,
  pageSize = 15,
  onRowClick,
  emptyIcon,
  emptyTitle = 'Nothing here',
  emptyDescription,
  onVisibleRowsChange,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = tabs.some((t) => t.key === tabParam) ? tabParam : tabs[0]?.key
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState(defaultSort || null)

  const setTab = (key) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === tabs[0]?.key) params.delete('tab')
    else params.set('tab', key)
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  useEffect(() => setPage(1), [activeTab, query, sort])

  const counts = useMemo(
    () => Object.fromEntries(tabs.map((t) => [t.key, t.filter ? rows.filter(t.filter).length : rows.length])),
    [tabs, rows]
  )

  const filtered = useMemo(() => {
    const tab = tabs.find((t) => t.key === activeTab)
    let list = tab?.filter ? rows.filter(tab.filter) : rows
    const q = query.trim().toLowerCase()
    if (q && search) list = list.filter((r) => search(r).toLowerCase().includes(q))
    const col = sort && columns.find((c) => c.key === sort.key)
    if (col?.sortValue) {
      const dir = sort.direction === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        const av = col.sortValue(a)
        const bv = col.sortValue(b)
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (typeof av === 'string') return av.localeCompare(bv) * dir
        return (av > bv ? 1 : av < bv ? -1 : 0) * dir
      })
    }
    return list
  }, [rows, tabs, activeTab, query, search, sort, columns])

  useEffect(() => {
    onVisibleRowsChange?.(filtered)
  }, [filtered, onVisibleRowsChange])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const tableColumns = columns.map((c) =>
    c.sortValue
      ? {
          ...c,
          sortable: true,
          sortDirection: sort?.key === c.key ? sort.direction : null,
          onHeaderClick: () =>
            setSort((s) =>
              s?.key === c.key
                ? { key: c.key, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                : { key: c.key, direction: typeof c.sortValue(rows[0] || {}) === 'string' ? 'asc' : 'desc' }
            ),
        }
      : c
  )

  return (
    <div className="space-y-4">
      <TabsWithActions
        tabs={tabs.map((t) => ({ key: t.key, label: t.label, badge: String(counts[t.key] ?? 0) }))}
        activeTab={activeTab}
        onTabChange={setTab}
        showSearch={Boolean(search)}
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder={searchPlaceholder}
      />
      {search ? (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20 lg:hidden"
        />
      ) : null}

      <TableResultsCount count={filtered.length} />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <LoadingSpinner size="lg" message="Loading..." />
          </div>
        ) : (
          <>
            <Table columns={tableColumns} data={pageRows} keyField="id" variant="modernEmbedded" onRowClick={onRowClick} />
            {pageRows.length === 0 ? (
              <TableEmptyBelow
                icon={emptyIcon}
                title={emptyTitle}
                description={query || activeTab !== tabs[0]?.key ? 'Try another tab or search.' : emptyDescription}
              />
            ) : null}
            {totalPages > 1 ? (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-1">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  itemsPerPage={pageSize}
                  onPageChange={setPage}
                  className="my-0 border-0 bg-transparent"
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
