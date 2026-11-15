'use client'

import { Suspense } from 'react'
import { WorkspaceLayoutContent, LoadingSpinner } from '@webfudge/ui'
import { useAuth } from '@webfudge/auth'
import { ShieldAlert, WifiOff } from 'lucide-react'
import VendorSidebar from './VendorSidebar'
import { VendorStaffProvider, useVendorStaff } from './VendorStaffContext'
import { VENDOR_SITE } from '../lib/site'

function StaffGate({ children }) {
  const { status, error } = useVendorStaff()
  const { logout, user, isAuthenticated } = useAuth()

  // Signed out (login page): the app shell handles redirects; nothing to check yet.
  if (!isAuthenticated) return children
  if (status === 'checking') {
    return (
      <div className="flex min-h-full items-center justify-center p-16">
        <LoadingSpinner size="lg" message="Checking staff access..." />
      </div>
    )
  }
  if (status === 'staff') return children

  const denied = status === 'denied'
  const Icon = denied ? ShieldAlert : WifiOff
  return (
    <div className="flex min-h-full items-center justify-center bg-white px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-md">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-200">
          <Icon className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-gray-900">
          {denied ? 'Staff access only' : 'Could not reach the API'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {denied
            ? `${user?.email || 'This account'} is not on the Webfudge staff list. Ask an admin to add it to PLATFORM_ADMIN_EMAILS on the API.`
            : error?.message || 'Check your connection and try again.'}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {!denied && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Sign in with another account
          </button>
        </div>
      </div>
    </div>
  )
}

// The sidebar reads ?tab= to highlight shortcuts, which Next needs inside a Suspense boundary.
function Sidebar(props) {
  return (
    <Suspense fallback={<div className="w-64 shrink-0 bg-white" />}>
      <VendorSidebar {...props} />
    </Suspense>
  )
}

export default function LayoutContent({ children }) {
  return (
    <VendorStaffProvider>
      <WorkspaceLayoutContent
        sidebar={Sidebar}
        sidebarBehavior="hide"
        sidebarBranding={{
          logoPath: VENDOR_SITE.logoPath,
          productName: VENDOR_SITE.name,
          companyName: VENDOR_SITE.brandName,
          homeHref: '/',
        }}
        showPwa={false}
        canView
      >
        <StaffGate>{children}</StaffGate>
      </WorkspaceLayoutContent>
    </VendorStaffProvider>
  )
}
