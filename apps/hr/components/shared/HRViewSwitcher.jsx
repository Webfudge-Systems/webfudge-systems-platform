'use client'

import { LayoutList, Table2, Kanban, GanttChart } from 'lucide-react'
import { ViewToggleGroup, ViewToggleButton } from '@webfudge/ui'

/** PM My Tasks layout modes — same icons and order as `apps/pm/app/my-tasks/page.js`. */
export const HR_VIEW_MODES = {
  LIST: 'list',
  TABLE: 'table',
  KANBAN: 'kanban',
  TIMELINE: 'timeline',
}

/** Matches PM `taskViewSwitcher` icon set and titles. */
export const HR_VIEW_SWITCHER_MODES = [
  { id: HR_VIEW_MODES.LIST, title: 'List (grouped by status)', Icon: LayoutList },
  { id: HR_VIEW_MODES.TABLE, title: 'Table', Icon: Table2 },
  { id: HR_VIEW_MODES.KANBAN, title: 'Kanban', Icon: Kanban },
  { id: HR_VIEW_MODES.TIMELINE, title: 'Timeline', Icon: GanttChart },
]

export default function HRViewSwitcher({
  value,
  onChange,
  modes = HR_VIEW_SWITCHER_MODES,
  'aria-label': ariaLabel = 'Layout',
}) {
  return (
    <ViewToggleGroup aria-label={ariaLabel}>
      {modes.map(({ id, title, Icon }) => (
        <ViewToggleButton
          key={id}
          active={value === id}
          title={title}
          onClick={() => onChange(id)}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </ViewToggleButton>
      ))}
    </ViewToggleGroup>
  )
}
