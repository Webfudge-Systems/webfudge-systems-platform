'use client'

import { AppShell } from '@webfudge/ui'
import AccountsSidebar from './AccountsSidebar'

export default function LayoutContent({ children }) {
  return <AppShell sidebar={AccountsSidebar}>{children}</AppShell>
}
