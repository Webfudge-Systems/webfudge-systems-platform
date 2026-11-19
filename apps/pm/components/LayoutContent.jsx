'use client'

import { useEffect } from 'react'
import { WorkspaceLayoutContent } from '@webfudge/ui'
import { usePathname, useRouter } from 'next/navigation'
import { saasRedirectFor } from '../lib/saasHiddenRoutes'
import PMSidebar from './PMSidebar'
import PMQuickActionsFab from './PMQuickActionsFab'
import { canReadCurrentPMPath } from '../lib/rbac'
import { PM_SITE } from '../lib/site'

const PUBLIC_PATHS = ['/login', '/unauthorized', '/coming-soon']

export default function LayoutContent({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  // SaaS build: placeholder screens are not reachable; send the user somewhere real.
  const saasRedirect = saasRedirectFor(pathname)
  useEffect(() => {
    if (saasRedirect) router.replace(saasRedirect)
  }, [saasRedirect, router])
  // Client portal (W10): client contacts, no team sidebar, no team auth. Has its own layout.
  if (pathname === '/portal' || pathname.startsWith('/portal/')) return children

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('auth-token'))
  const canView = !saasRedirect && (isPublic || !hasToken || canReadCurrentPMPath(pathname))

  return (
    <WorkspaceLayoutContent
      sidebar={PMSidebar}
      sidebarBehavior="hide"
      sidebarBranding={{
        logoPath: PM_SITE.logoPath,
        productName: PM_SITE.name,
        companyName: PM_SITE.brandName,
        homeHref: '/',
      }}
      appName={PM_SITE.name}
      pwaStorageKey="pm"
      saasApp="pm"
      canView={canView}
      deniedTitle="Access denied"
      deniedDescription="Your current role does not have access to this Project Management module."
      extras={<PMQuickActionsFab />}
    >
      {children}
    </WorkspaceLayoutContent>
  )
}
