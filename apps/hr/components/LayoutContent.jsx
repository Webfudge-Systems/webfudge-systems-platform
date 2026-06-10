'use client'

import { WorkspaceLayoutContent } from '@webfudge/ui'
import { usePathname } from 'next/navigation'
import HRSidebar from './layout/HRSidebar'
import { canReadCurrentHRPath } from '../lib/rbac'
import { HRQuickActionsProvider } from './quick-actions/HRQuickActionsContext'
import HRQuickActionDrawer from './quick-actions/HRQuickActionDrawer'
import HRQuickActionsFab from './quick-actions/HRQuickActionsFab'

const PUBLIC_PATHS = ['/login', '/unauthorized', '/coming-soon']

export default function LayoutContent({ children }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('auth-token'))
  const canView = isPublic || !hasToken || canReadCurrentHRPath(pathname)

  return (
    <HRQuickActionsProvider>
      <WorkspaceLayoutContent
        sidebar={HRSidebar}
        appName="Webfudge HR"
        pwaStorageKey="hr"
        canView={canView}
        deniedTitle="This HR module is not available for your role."
        deniedDescription="Your current permissions do not include read access for this area. Contact an admin if you need access."
        deniedVariant="card"
        extras={!isPublic ? <HRQuickActionsFab /> : null}
      >
        {children}
      </WorkspaceLayoutContent>
      <HRQuickActionDrawer />
    </HRQuickActionsProvider>
  )
}
