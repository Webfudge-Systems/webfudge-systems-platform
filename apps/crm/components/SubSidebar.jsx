'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Modal } from '@webfudge/ui'

export default function SubSidebar({
  isOpen,
  onClose,
  currentSection,
  navigationData,
  onNavigate,
}) {
  const pathname = usePathname()

  const isActive = (href) => {
    if (!href || href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  if (!isOpen || !currentSection) return null

  const sectionData = navigationData.find((item) => item.id === currentSection)

  if (!sectionData) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="navPanel"
      title={sectionData.label}
      subtitle="Navigation"
      contentClassName="space-y-2"
    >
      {sectionData.children?.map((item) => {
        if (!item.href) return null
        const isItemActive = isActive(item.href)
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => onNavigate(item.href)}
            className={`flex items-center gap-3 rounded-lg p-3 transition-colors duration-150 ${
              isItemActive
                ? 'border border-blue-200 bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.icon && <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        )
      })}
    </Modal>
  )
}
