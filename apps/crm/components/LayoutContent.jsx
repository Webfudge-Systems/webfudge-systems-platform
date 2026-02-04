'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import { Loader2 } from 'lucide-react'
import CRMSidebar from './CRMSidebar'

export default function LayoutContent({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isAuthenticated, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const isLoginPage = pathname === '/login'
  const isUnauthorizedPage = pathname === '/unauthorized'

  useEffect(() => {
    if (!loading && !isAuthenticated && !isLoginPage && !isUnauthorizedPage) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, isLoginPage, isUnauthorizedPage, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <p className="text-gray-900">Loading...</p>
        </div>
      </div>
    )
  }

  if (isLoginPage || isUnauthorizedPage) {
    return <>{children}</>
  }

  if (isAuthenticated) {
    return (
      <div className="flex h-screen overflow-hidden bg-white">
        <CRMSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        <p className="text-gray-900">Redirecting to login...</p>
      </div>
    </div>
  )
}
