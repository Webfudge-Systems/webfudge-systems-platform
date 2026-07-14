'use client'

import Link from 'next/link'
import { Plug, ChevronRight, Settings as SettingsIcon } from 'lucide-react'
import { Card } from '@webfudge/ui'
import EstatePageHeader from '../../components/EstatePageHeader'

const SETTINGS_SECTIONS = [
  {
    href: '/settings/integrations',
    icon: Plug,
    title: 'Integrations',
    description: 'Connect Meta Ads, map campaigns to projects, configure form field mappings.',
  },
]

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <EstatePageHeader
        title="Settings"
        subtitle="Workspace configuration for the real-estate CRM."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Settings', href: '/settings' },
        ]}
      />

      <Card padding={false}>
        <ul className="divide-y divide-gray-100">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="flex items-center gap-4 p-5 hover:bg-orange-50/50 transition-colors"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10">
                    <Icon className="w-5 h-5 text-brand-primary" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-gray-900">{section.title}</span>
                    <span className="block text-sm text-gray-500 truncate">{section.description}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
