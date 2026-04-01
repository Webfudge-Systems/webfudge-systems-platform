'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import { Loader2 } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ConfigureFeaturesModal from '../configure-features/ConfigureFeaturesModal'

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showConfigure, setShowConfigure] = useState(false)
  const { isAuthenticated, loading, user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const isLoginPage = pathname === '/login'
  const isUnauthorizedPage = pathname === '/unauthorized'

  useEffect(() => {
    if (!loading && !isAuthenticated && !isLoginPage && !isUnauthorizedPage) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoginPage, isUnauthorizedPage, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (isLoginPage || isUnauthorizedPage) return <>{children}</>
  if (!isAuthenticated) return null

  return (
    <div className="h-screen flex bg-white">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} onConfigureFeatures={() => setShowConfigure(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
      <ConfigureFeaturesModal
        isOpen={showConfigure}
        onClose={() => setShowConfigure(false)}
        userId={String((user as { id?: string | number } | null)?.id ?? '')}
      />
    </div>
  )
}
