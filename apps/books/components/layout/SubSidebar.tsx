'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, Expand, X } from 'lucide-react'

type NavChild = {
  id: string
  label: string
  href: string
  icon?: any
}

type NavSection = {
  id: string
  label: string
  children: NavChild[]
}

type SubSidebarProps = {
  isOpen: boolean
  onClose: () => void
  currentSection: string | null
  navigationData: NavSection[]
  onNavigate: () => void
}

export default function SubSidebar({
  isOpen,
  onClose,
  currentSection,
  navigationData,
  onNavigate,
}: SubSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => pathname.startsWith(href)

  if (!isOpen || !currentSection) return null

  const sectionData = navigationData.find((item) => item.id === currentSection)
  if (!sectionData) return null

  const fullPageHref = sectionData.children?.[0]?.href

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-50" onClick={onClose} />

      <aside className="fixed right-4 top-4 bottom-4 w-80 bg-white overflow-hidden shadow-xl rounded-2xl z-[60]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 capitalize">{sectionData.label}</h2>
              <p className="text-sm text-gray-600">Navigation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fullPageHref && (
              <button
                type="button"
                onClick={() => {
                  router.push(fullPageHref)
                  onNavigate()
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Open full page"
              >
                <Expand className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[calc(100vh-88px)] overflow-y-auto">
          {sectionData.children.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon && <item.icon className="w-4 h-4" />}
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </aside>
    </>
  )
}
