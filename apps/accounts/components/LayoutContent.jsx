'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { WorkspaceLayoutContent } from '@webfudge/ui'
import { useAuth } from '@webfudge/auth'
import AccountsSidebar from './AccountsSidebar'
import HubShell from './saas/HubShell'
import { FullPageSpinner } from './saas/ui'
import { ACCOUNTS_SITE } from '../lib/site'
import { IS_SAAS } from '../lib/saas'

// Sign-in, sign-up and onboarding screens draw their own full-page layout.
const BARE_PREFIXES = ['/login', '/signup', '/verify', '/forgot-password', '/reset-password', '/invite', '/setup']
// SaaS: everyday account screens use the Home hub's top bar instead of the admin sidebar.
const HUB_PREFIXES = ['/home', '/billing', '/profile', '/users', '/settings']

const matches = (pathname, prefixes) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))

function SaasGate({ children, needsOrganization = true }) {
  const { isAuthenticated, loading, organizations } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const missingOrg = needsOrganization && isAuthenticated && organizations.length === 0

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    else if (missingOrg) router.replace('/setup/organization')
  }, [loading, isAuthenticated, missingOrg, pathname, router])

  if (loading || !isAuthenticated || missingOrg) return <FullPageSpinner />
  return children
}

export default function LayoutContent({ children }) {
  const pathname = usePathname() || '/'

  if (matches(pathname, BARE_PREFIXES)) return children

  if (IS_SAAS && matches(pathname, HUB_PREFIXES)) {
    return (
      <SaasGate needsOrganization={pathname !== '/profile'}>
        <HubShell>{children}</HubShell>
      </SaasGate>
    )
  }

  const shell = (
    <WorkspaceLayoutContent
      sidebar={AccountsSidebar}
      sidebarBehavior="hide"
      sidebarBranding={{
        logoPath: ACCOUNTS_SITE.logoPath,
        productName: ACCOUNTS_SITE.name,
        companyName: ACCOUNTS_SITE.brandName,
        homeHref: '/',
      }}
      showPwa={false}
      canView={true}
    >
      {children}
    </WorkspaceLayoutContent>
  )
  return IS_SAAS ? <SaasGate>{shell}</SaasGate> : shell
}
