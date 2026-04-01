'use client'

import { AppShell } from '@webfudge/ui'
import PMSidebar from './PMSidebar'

export default function LayoutContent({ children }) {
  return (
    <AppShell sidebar={PMSidebar}>
      {children}
    </AppShell>
  )
}
