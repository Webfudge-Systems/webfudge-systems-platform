'use client'

import { WorkspaceLayoutContent } from '@webfudge/ui'
import { usePathname } from 'next/navigation'
import ESSSidebar from './layout/ESSSidebar'
import { EmployeeProvider } from '../hooks/useCurrentEmployee'
import { ESS_SITE } from '../lib/site'
import PerformanceWorkspaceHydrator from './performance/PerformanceWorkspaceHydrator'

const PUBLIC_PATHS = ['/login', '/unauthorized']

export default function LayoutContent({ children }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  return (
    <EmployeeProvider>
      <PerformanceWorkspaceHydrator />
      <WorkspaceLayoutContent
        sidebar={ESSSidebar}
        sidebarBehavior="hide"
        sidebarBranding={{
          logoPath: ESS_SITE.logoPath,
          productName: ESS_SITE.name,
          companyName: ESS_SITE.brandName,
          homeHref: '/overview',
        }}
        appName={ESS_SITE.name}
        pwaStorageKey="ess"
        canView
        deniedTitle="This page is not available."
        deniedDescription="You do not have access to this area."
        deniedVariant="card"
      >
        {isPublic ? children : children}
      </WorkspaceLayoutContent>
    </EmployeeProvider>
  )
}
