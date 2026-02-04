'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@webfudge/ui'

export default function ProfileSidebar({ user, activeSection, onSectionChange, onLogout }) {
  const sidebarSections = [
    {
      title: 'Workspace',
      items: [
        { id: 'apps', label: 'Apps', icon: 'lucide:layout-grid' },
        { id: 'organizations', label: 'Organizations', icon: 'lucide:building-2' },
      ],
    },
    {
      title: 'Profile',
      items: [{ id: 'profile', label: 'Profile', icon: 'lucide:user' }],
    },
  ]

  return (
    <div className="w-64 h-[calc(100vh-2rem)] backdrop-blur-xl bg-white/80 rounded-2xl shadow-soft border border-white/60 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200/50 flex-shrink-0">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <Image
            src="/ws_logo.png"
            alt="Webfudge Systems"
            width={240}
            height={240}
            priority
            className="h-10 w-auto"
          />
          <span className="text-lg font-bold leading-5 text-brand-dark">Webfudge Systems</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {sidebarSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeSection === item.id
                      ? 'bg-gradient-to-r from-orange-50 to-yellow-50 text-brand-primary border border-brand-primary/20'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-brand-dark'
                  }`}
                >
                  <Icon icon={item.icon} className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200/50 flex-shrink-0">
        <Button
          variant="ghost"
          size="md"
          onClick={onLogout}
          className="w-full flex items-center gap-3"
        >
          <Icon icon="lucide:log-out" className="w-5 h-5" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  )
}
