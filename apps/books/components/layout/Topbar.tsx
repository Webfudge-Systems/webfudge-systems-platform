'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Avatar, Card } from '@webfudge/ui'
import { resolveUserDisplayName, resolveUserInitials, resolveUserRole, useAuth } from '@webfudge/auth'
import { Bell, ChevronDown, LogOut, Search, Settings, User } from 'lucide-react'

export default function Topbar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const pageTitle = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    const first = segments[0] ?? 'home'
    if (first === 'home') return 'Dashboard'
    return first.replace('-', ' ').replace(/\b\w/g, (s) => s.toUpperCase())
  }, [pathname])

  const subtitle = useMemo(() => {
    const now = new Date()
    const dayText = now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return `Good Evening, ${resolveUserDisplayName(user)} • ${dayText}`
  }, [user])

  const avatarClass =
    'bg-white border border-gray-200/90 shadow-md ring-1 ring-black/5 text-orange-600 font-semibold'

  return (
    <header className="p-4 bg-brand-light/40">
      <Card
        glass={true}
        className="relative z-[40] px-5 py-6 min-h-[130px] rounded-xl shadow-xl border border-white/40"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-brand-text-light">{pageTitle}</p>
            <h1 className="text-5xl font-light text-brand-foreground leading-none mt-1">{pageTitle}</h1>
            <p className="text-brand-text-light mt-2">{subtitle}</p>
          </div>

          <div className="flex items-center gap-5 self-center">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search anything...`}
                className="w-64 pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 placeholder:text-gray-400 text-gray-800"
              />
            </div>
            <button type="button" className="p-2 rounded-lg hover:bg-white/60 transition-colors">
              <Bell className="w-5 h-5 text-brand-text-light" />
            </button>

            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 hover:backdrop-blur-md transition-all duration-300"
                onMouseEnter={() => setShowProfileDropdown(true)}
                onMouseLeave={() => setShowProfileDropdown(false)}
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    size="md"
                    fallback={resolveUserInitials(user)}
                    alt={resolveUserDisplayName(user)}
                    className={avatarClass}
                  />
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-semibold text-brand-foreground">{resolveUserDisplayName(user)}</p>
                    <p className="text-xs text-brand-text-light">{resolveUserRole(user)}</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-brand-text-light transition-transform ${
                    showProfileDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showProfileDropdown && (
                <>
                  <div className="fixed inset-0 z-[99998]" onClick={() => setShowProfileDropdown(false)} aria-hidden />
                  <div
                    className="fixed right-6 top-24 w-72 z-[99999]"
                    onMouseEnter={() => setShowProfileDropdown(true)}
                    onMouseLeave={() => setShowProfileDropdown(false)}
                  >
                    <Card glass className="rounded-lg shadow-2xl border border-white/40 p-0 overflow-hidden">
                      <div className="p-4 border-b border-white/20">
                        <div className="flex items-center gap-3">
                          <Avatar
                            size="xl"
                            fallback={resolveUserInitials(user)}
                            alt={resolveUserDisplayName(user)}
                            className={`${avatarClass} font-semibold`}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-foreground truncate">{resolveUserDisplayName(user)}</p>
                            <p className="text-sm text-brand-text-light truncate">
                              {(user?.attributes as { email?: string } | undefined)?.email ?? (user as { email?: string })?.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-hover rounded-lg transition-colors"
                        >
                          <User className="w-4 h-4 text-brand-text-light" />
                          <span className="text-sm text-brand-foreground">View Profile</span>
                        </button>
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-hover rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4 text-brand-text-light" />
                          <span className="text-sm text-brand-foreground">Settings</span>
                        </button>
                        <div className="h-px bg-brand-border my-2 mx-3" />
                        <button
                          type="button"
                          onClick={logout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Sign Out</span>
                        </button>
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </header>
  )
}
