'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Modal } from '@webfudge/ui'
import { isNavItemActive } from '../../lib/navigation'

export default function HRSubSidebar({ isOpen, onClose, section, onNavigate }) {
  const pathname = usePathname()

  if (!isOpen || !section) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="navPanel"
      title={section.label}
      subtitle="Navigation"
      contentClassName="space-y-2"
    >
      {section.children.map((item) => {
        const Icon = item.icon
        const active = isNavItemActive(pathname, item.href)

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg p-3 transition-colors duration-150 ${
              active
                ? 'border border-orange-200 bg-orange-50 text-orange-700'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> : null}
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        )
      })}
    </Modal>
  )
}
