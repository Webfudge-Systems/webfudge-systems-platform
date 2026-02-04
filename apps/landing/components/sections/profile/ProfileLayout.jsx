'use client'

import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Button } from '@webfudge/ui'
import ProfileSidebar from './ProfileSidebar'

export default function ProfileLayout({
  user,
  activeSection,
  onSectionChange,
  onLogout,
  children,
}) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50 via-orange-100 to-brand-primary">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-100/40 via-orange-50/30 to-orange-200/40"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-orange-100/30 via-orange-50/20 to-orange-200/35"></div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-3/4 right-1/4 w-48 h-48 bg-orange-100/30 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-orange-50/25 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-screen flex p-4 gap-4">
        {/* Sidebar */}
        <ProfileSidebar
          user={user}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          onLogout={onLogout}
        />

        {/* Main Content */}
        <div className="flex-1 h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
          <div className="flex-1 backdrop-blur-xl bg-white/80 rounded-2xl shadow-soft border border-white/60 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200/50 px-8 py-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-brand-dark mb-1">
                    Welcome, {user?.firstName || user?.email}!
                  </h1>
                  <p className="text-sm text-gray-600">
                    Manage your profile and workspace settings
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="p-2">
                    <Icon icon="lucide:search" className="w-5 h-5 text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 relative">
                    <Icon icon="lucide:bell" className="w-5 h-5 text-gray-600" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-yellow-400 flex items-center justify-center text-white font-bold cursor-pointer shadow-md">
                    {user?.firstName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
