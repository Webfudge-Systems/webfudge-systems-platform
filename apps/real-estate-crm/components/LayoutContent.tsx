'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { WorkspaceLayoutContent } from '@webfudge/ui'
import RealEstateSidebar from './RealEstateSidebar'
import { canReadCurrentREPath, reModuleForPath } from '../lib/rbac'
import { RE_SITE } from '../lib/site'

const PUBLIC_PATHS = ['/login', '/unauthorized']

const MODULE_LABELS: Record<string, string> = {
  leads: 'Leads',
  pipeline: 'Pipeline',
  projects: 'Projects',
  site_visits: 'Site visits',
  settings: 'Settings',
}

export default function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/'
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('auth-token'))
  const canView = isPublic || !hasToken || canReadCurrentREPath(pathname)
  const moduleKey = reModuleForPath(pathname)
  const moduleLabel = MODULE_LABELS[moduleKey] || 'This module'

  return (
    <WorkspaceLayoutContent
      sidebar={RealEstateSidebar}
      sidebarBehavior="hide"
      sidebarBranding={{
        logoPath: RE_SITE.logoPath,
        productName: RE_SITE.name,
        companyName: RE_SITE.brandName,
        homeHref: '/',
      }}
      appName={RE_SITE.name}
      pwaStorageKey="real-estate-crm"
      showPwa={false}
      canView={canView}
      deniedTitle={`${moduleLabel} is not available for your role.`}
      deniedDescription="Your current permissions do not include read access for this area. Contact an admin or manager if you need this module enabled."
      deniedVariant="card"
    >
      {children}
    </WorkspaceLayoutContent>
  )
}
