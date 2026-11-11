'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { WorkspaceLayoutContent, AccessDeniedPanel } from '@webfudge/ui'
import { useAuth } from '@webfudge/auth'
import InvestSidebar from './InvestSidebar'
import { InvestDataProvider } from './InvestDataProvider'
import { investApi } from '../lib/api'
import { INVEST_SITE, IS_SAAS_BUILD } from '../lib/site'

const PUBLIC_PATHS = ['/login', '/unauthorized']

export default function LayoutContent({ children }) {
  const pathname = usePathname()
  const { isAuthenticated, user, currentOrg } = useAuth()
  const [access, setAccess] = useState(null) // null = checking

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  useEffect(() => {
    if (!isAuthenticated || IS_SAAS_BUILD) return
    let cancelled = false
    setAccess(null)
    investApi
      .access()
      .then((res) => !cancelled && setAccess(res))
      .catch((err) => !cancelled && setAccess({ allowed: false, reason: err.message || 'Could not check access' }))
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, currentOrg?.id])

  if (IS_SAAS_BUILD) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <AccessDeniedPanel
          title="Not available"
          description="The investment manager is an internal Webfudge tool and is not part of this deployment."
        />
      </div>
    )
  }

  const allowed = Boolean(access?.allowed)
  const canView = isPublic || !isAuthenticated || allowed

  const deniedContent =
    access === null ? (
      <div className="flex h-full min-h-[60vh] items-center justify-center gap-3 text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
        Checking access…
      </div>
    ) : (
      <AccessDeniedPanel
        title="Access restricted"
        description={`${access.reason || 'You do not have access.'} The investment manager is limited to Webfudge's internal finance team.`}
      />
    )

  // The provider wraps the whole shell: the sidebar lists holdings too.
  return (
    <InvestDataProvider enabled={isAuthenticated && allowed} providers={access?.providers}>
      <WorkspaceLayoutContent
        sidebar={InvestSidebar}
        sidebarBehavior="hide"
        sidebarBranding={{
          logoPath: INVEST_SITE.logoPath,
          productName: INVEST_SITE.name,
          companyName: INVEST_SITE.brandName,
          homeHref: '/',
        }}
        appName={INVEST_SITE.name}
        showPwa={false}
        canView={canView}
        deniedContent={deniedContent}
      >
        {children}
      </WorkspaceLayoutContent>
    </InvestDataProvider>
  )
}
