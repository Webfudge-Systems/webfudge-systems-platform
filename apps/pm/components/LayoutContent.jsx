'use client'

import { AppShell } from '@webfudge/ui'
import { ShieldX } from 'lucide-react'
import { usePathname } from 'next/navigation'
import PMSidebar from './PMSidebar'
import { canReadCurrentPMPath } from '../lib/rbac'

const PUBLIC_PATHS = ['/login', '/unauthorized', '/coming-soon']

export default function LayoutContent({ children }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('auth-token'))
  const canView = isPublic || !hasToken || canReadCurrentPMPath(pathname)

  return (
    <AppShell sidebar={PMSidebar}>
      {canView ? (
        children
      ) : (
        <div className="min-h-full bg-white p-8 flex items-center justify-center">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-5">
              <ShieldX className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access denied</h1>
            <p className="text-gray-600">
              Your current role does not have access to this Project Management module.
            </p>
          </div>
        </div>
      )}
    </AppShell>
  )
}
