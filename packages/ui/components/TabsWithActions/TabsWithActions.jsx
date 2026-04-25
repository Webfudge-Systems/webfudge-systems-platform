'use client'

import { clsx } from 'clsx'
import { Search, Plus, List, LayoutGrid, Download, Eye, Filter, ListChecks } from 'lucide-react'
import { Input, workspaceSearchInputClassName } from '../Input'

/**
 * Advanced Tabs component with integrated actions, search, and view toggles
 * Perfect for CRM-style list/board views with filtering and actions
 *
 * Variants:
 * - glass | modern | default — toolbar + tabs (list pages)
 * - pill — white pill-shaped track, evenly spaced tabs; active = solid orange pill, inactive = text only (detail pages)
 */
export function TabsWithActions({
  tabs,
  activeTab,
  onTabChange,

  // Search props
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',

  // Actions props
  showAdd = false,
  onAddClick,
  addTitle = 'Add New',

  showExport = false,
  onExportClick,
  exportTitle = 'Export',

  showFilter = false,
  onFilterClick,
  filterTitle = 'Filter',

  showBulkEdit = false,
  onBulkEditClick,
  bulkEditActive = false,
  bulkEditTitle = 'Bulk edit',

  showColumnVisibility = false,
  onColumnVisibilityClick,
  columnVisibilityTitle = 'Column Visibility',

  // View toggle props
  showViewToggle = false,
  activeView = 'list',
  onViewChange,
  viewOptions = ['list', 'board'],

  // Styling
  className,
  variant = 'glass',
  /** pill only: `full` = stretch track (default); `hug` = width fits tabs, left-aligned */
  pillTrack = 'full',
  inlineRight = null,
  /** Override default CRM search field classes (e.g. Books `booksToolbarSearchInputClassName`). */
  searchInputClassName,
  ...props
}) {
  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  const hasRightPanel =
    showSearch ||
    (showAdd && onAddClick) ||
    (showExport && onExportClick) ||
    (showFilter && onFilterClick) ||
    (showBulkEdit && onBulkEditClick) ||
    (showColumnVisibility && onColumnVisibilityClick) ||
    showViewToggle

  const isPill = variant === 'pill'
  const pillHug = isPill && pillTrack === 'hug'
  const isBooksModern = variant === 'booksModern'

  /** Books chrome: pill-shaped bar, same fill + elevation as dashboard cards */
  const booksChromeBar =
    'rounded-full border-0 bg-[var(--books-bg-card,#ffffff)] shadow-[0_3px_16px_rgba(15,23,42,0.10),0_2px_5px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.38)]'

  const containerClasses = {
    glass:
      'flex items-center justify-between gap-3 bg-white/70 backdrop-blur-xl border border-white/40 rounded-lg shadow-xl p-3',
    modern:
      'flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg shadow-lg p-3',
    /** Books list pages: same surface + elevation as dashboard cards (Total Balance, KPI tiles) */
    booksModern: clsx('flex items-center justify-between gap-3 p-3', booksChromeBar),
    default: 'flex items-center justify-between gap-3 bg-white border-b border-gray-200 pb-3',
  }

  const toolbarIconBtnShell =
    'flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-all duration-300 hover:shadow-md'

  const tabButtonClass = (tabId) => {
    const active = activeTab === tabId
    if (isPill) {
      return clsx(
        'inline-flex min-w-[5rem] items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm transition-all duration-200',
        active
          ? 'bg-[#EA580C] font-semibold text-white shadow-sm'
          : 'bg-transparent font-normal text-[var(--books-text-secondary,#1f2937)] hover:bg-[var(--books-bg-elevated,#f3f4f6)]'
      )
    }
    if (isBooksModern) {
      return clsx(
        'flex items-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300',
        active
          ? 'bg-[#EA580C] text-white shadow-lg'
          : 'border border-[color:var(--books-border,rgba(0,0,0,0.08))] bg-[var(--books-bg-elevated,#ffffff)] text-[var(--books-text-secondary,#4b5563)] hover:bg-[var(--books-surface-muted,#e5e7eb)] hover:shadow-md'
      )
    }
    return clsx(
      'flex items-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300',
      active
        ? 'bg-orange-500 text-white shadow-lg'
        : 'border border-white/40 bg-white/80 text-gray-700 backdrop-blur-sm hover:bg-white/90 hover:shadow-md'
    )
  }

  const badgeClass = (tabId) => {
    const active = activeTab === tabId
    if (isPill) {
      return clsx(
        'rounded-full px-2 py-0.5 text-xs font-bold transition-all duration-200',
        active
          ? 'bg-white/25 text-white'
          : 'bg-[var(--books-bg-elevated,#e5e7eb)] text-[var(--books-text-secondary,#374151)]'
      )
    }
    if (isBooksModern) {
      return clsx(
        'ml-2 rounded-full px-2 py-0.5 text-xs font-bold transition-all duration-300',
        active
          ? 'bg-white/30 text-white'
          : 'bg-[var(--books-bg-page,#e5e7eb)] text-[var(--books-text-secondary,#374151)]'
      )
    }
    return clsx(
      'ml-2 rounded-full px-2 py-0.5 text-xs font-bold transition-all duration-300',
      active ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-700'
    )
  }

  /** Books home / sub-page tab track: pill shell matching header icon + profile capsules */
  const pillShell = clsx(
    'flex min-h-[48px] min-w-0 items-center gap-1 rounded-full border-0 bg-[var(--books-bg-card,#ffffff)] p-1.5 shadow-[0_3px_16px_rgba(15,23,42,0.10),0_2px_5px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.38)]',
    pillHug ? 'w-fit max-w-full shrink-0 justify-start' : 'w-full min-w-0 flex-1 justify-center'
  )

  const tabButtons = tabs.map((tab) => {
    const tabId = tab.id || tab.key
    return (
      <button
        key={tabId}
        type="button"
        onClick={() => handleTabClick(tabId)}
        className={tabButtonClass(tabId)}
      >
        <span>{tab.label}</span>
        {tab.badge !== undefined && tab.badge !== null && tab.badge !== '' && (
          <span className={badgeClass(tabId)}>{tab.badge}</span>
        )}
      </button>
    )
  })

  /** Pill + inlineRight: keep "More" outside overflow-x-auto so dropdowns are not clipped. */
  const tabRow =
    isPill && inlineRight ? (
      <div className={pillShell}>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabButtons}
        </div>
        <div className="relative flex shrink-0 items-center pl-0.5">{inlineRight}</div>
      </div>
    ) : (
      <div
        className={clsx(
          isPill
            ? clsx(
                pillShell,
                'overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              )
            : 'flex flex-1 items-center gap-2 overflow-x-auto'
        )}
      >
        {tabButtons}
        {inlineRight ? <div className="flex-shrink-0">{inlineRight}</div> : null}
      </div>
    )

  const rightPanel = (
    <div className="flex flex-shrink-0 items-center gap-2">
      {showSearch && (
        <div className="hidden lg:flex shrink-0 items-center">
          <Input
            icon={Search}
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            containerClassName="w-64 min-w-[16rem]"
            className={searchInputClassName ?? workspaceSearchInputClassName}
          />
        </div>
      )}

      {showAdd && onAddClick && (
        <button
          onClick={onAddClick}
          className={
            isBooksModern
              ? `${toolbarIconBtnShell} border-[color:var(--books-border-em)] bg-[var(--books-bg-elevated)] text-[#EA580C] hover:bg-[var(--books-orange-bg)] hover:text-[#c2410c]`
              : 'flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/80 text-orange-500 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-orange-50 hover:text-orange-600 hover:shadow-lg'
          }
          title={addTitle}
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      {showViewToggle && (
        <>
          {viewOptions.includes('list') && (
            <button
              onClick={() => onViewChange?.('list')}
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg',
                activeView === 'list'
                  ? 'border-orange-500/50 bg-orange-500 text-white'
                  : isBooksModern
                    ? 'border-[color:var(--books-border-em)] bg-[var(--books-bg-elevated)] text-[var(--books-text-secondary)] hover:bg-[var(--books-surface-muted)]'
                    : 'border-white/40 bg-white/80 text-gray-700 hover:bg-white/90'
              )}
              title="List View"
            >
              <List className="h-5 w-5" />
            </button>
          )}
          {viewOptions.includes('board') && (
            <button
              onClick={() => onViewChange?.('board')}
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg',
                activeView === 'board'
                  ? 'border-orange-500/50 bg-orange-500 text-white'
                  : isBooksModern
                    ? 'border-[color:var(--books-border-em)] bg-[var(--books-bg-elevated)] text-[var(--books-text-secondary)] hover:bg-[var(--books-surface-muted)]'
                    : 'border-white/40 bg-white/80 text-gray-700 hover:bg-white/90'
              )}
              title="Board View"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          )}
        </>
      )}

      {showFilter && onFilterClick && (
        <button
          onClick={onFilterClick}
          className={
            isBooksModern
              ? `${toolbarIconBtnShell} border-[color:var(--books-border-em)] bg-[var(--books-bg-elevated)] text-[var(--books-text-secondary)] hover:bg-[var(--books-surface-muted)]`
              : 'flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/80 text-gray-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-white/90 hover:shadow-lg'
          }
          title={filterTitle}
        >
          <Filter className="h-5 w-5" />
        </button>
      )}

      {showBulkEdit && onBulkEditClick && (
        <button
          type="button"
          onClick={onBulkEditClick}
          className={clsx(
            'flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold shadow-md transition-all duration-300',
            bulkEditActive
              ? 'border-orange-500/50 bg-orange-500 text-white shadow-lg'
              : isBooksModern
                ? 'border-[color:var(--books-border-em)] bg-[var(--books-bg-elevated)] text-[var(--books-text-secondary)] hover:bg-[var(--books-surface-muted)]'
                : 'border-white/40 bg-white/80 text-gray-700 backdrop-blur-sm hover:bg-white/90'
          )}
          title={bulkEditTitle}
        >
          <ListChecks className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline">{bulkEditTitle}</span>
        </button>
      )}

      {showColumnVisibility && onColumnVisibilityClick && (
        <button
          onClick={onColumnVisibilityClick}
          className={
            isBooksModern
              ? `${toolbarIconBtnShell} border-[color:var(--books-border-em)] bg-[var(--books-bg-elevated)] text-[var(--books-text-secondary)] hover:bg-[var(--books-surface-muted)]`
              : 'flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/80 text-gray-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-white/90 hover:shadow-lg'
          }
          title={columnVisibilityTitle}
        >
          <Eye className="h-5 w-5" />
        </button>
      )}

      {showExport && onExportClick && (
        <button
          onClick={onExportClick}
          className={
            isBooksModern
              ? 'flex items-center gap-2 whitespace-nowrap rounded-xl border border-[color:var(--books-border-em)] bg-[var(--books-bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--books-text-secondary)] shadow-sm transition-all duration-300 hover:bg-[var(--books-surface-muted)]'
              : 'flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/40 bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-white/90'
          }
          title={exportTitle}
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline">{exportTitle}</span>
        </button>
      )}
    </div>
  )

  if (isPill) {
    return (
      <div
        className={clsx(
          'flex items-center gap-3',
          pillHug ? 'w-fit max-w-full shrink-0' : 'w-full',
          !pillHug && hasRightPanel && 'justify-between',
          className
        )}
        {...props}
      >
        {tabRow}
        {hasRightPanel ? rightPanel : null}
      </div>
    )
  }

  return (
    <div
      className={clsx(containerClasses[variant] || containerClasses.glass, className)}
      {...props}
    >
      {tabRow}
      {rightPanel}
    </div>
  )
}

export default TabsWithActions
