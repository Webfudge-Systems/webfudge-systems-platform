'use client'

import { AppShell } from '@webfudge/ui'
import CRMSidebar from './CRMSidebar'

export default function LayoutContent({ children }) {
  return (
    <AppShell sidebar={CRMSidebar}>
      {children}
    </AppShell>
  )
}
