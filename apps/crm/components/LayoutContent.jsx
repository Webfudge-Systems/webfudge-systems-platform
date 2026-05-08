'use client'

import { AppShell } from '@webfudge/ui'
import { ShieldX } from 'lucide-react'
import { usePathname } from 'next/navigation'
import CRMSidebar from './CRMSidebar'
import { canReadCurrentCRMPath, crmModuleForPath } from '../lib/rbac'

const PUBLIC_PATHS = ['/login', '/unauthorized', '/coming-soon']
const MODULE_LABELS = {
  client_invoices: 'Client invoices',
  proposals: 'Proposals',
  client_accounts: 'Client accounts',
  deals: 'Deals',
}

export default function LayoutContent({ children }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('auth-token'))
  const canView = isPublic || !hasToken || canReadCurrentCRMPath(pathname)
  const moduleKey = crmModuleForPath(pathname)
  const moduleLabel = MODULE_LABELS[moduleKey] || 'This CRM module'

  return (
    <AppShell sidebar={CRMSidebar}>
      {canView ? (
        children
      ) : (
        <div className="min-h-full bg-white p-4 md:p-6">
          <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm ring-1 ring-red-100">
                <ShieldX className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">No access</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">{moduleLabel} is not available for your role.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700">
                  Your current permissions do not include read access for this area. Contact an admin or manager if
                  you need this module enabled.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
