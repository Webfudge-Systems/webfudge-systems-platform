'use client';

import { TableSortPanel } from '@webfudge/ui';

/**
 * Positioned sort panel for PM list toolbars (sibling to column visibility picker).
 */
export default function PmTableSortDropdown({
  open,
  sortRules,
  columnOptions,
  onAddRule,
  onRemoveRule,
  onSetDirection,
  onMoveRule,
  onClear,
  maxRules = 5,
  className = 'absolute right-0 top-full z-40 mt-2',
}) {
  if (!open) return null;

  return (
    <TableSortPanel
      className={className}
      sortRules={sortRules}
      columnOptions={columnOptions}
      onAddRule={onAddRule}
      onRemoveRule={onRemoveRule}
      onSetDirection={onSetDirection}
      onMoveRule={onMoveRule}
      onClear={onClear}
      maxRules={maxRules}
    />
  );
}
