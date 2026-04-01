'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Avatar, Card } from '@webfudge/ui'
import { resolveUserDisplayName, resolveUserInitials, resolveUserRole, useAuth } from '@webfudge/auth'
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileMinus,
  FileText,
  FolderOpen,
  Home,
  Landmark,
  ListOrdered,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Target,
  Timer,
  Truck,
  Users,
  Wallet,
  LayoutDashboard,
  User,
  Settings,
  LogOut,
  Lock,
  type LucideIcon,
} from 'lucide-react'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
  onConfigureFeatures: () => void
}

type NavItem = { label: string; href?: string; icon: any; children?: Array<{ label: string; href: string }> }
type NavChild = { id: string; label: string; href: string; icon?: any }
type NavSection = { id: string; label: string; children: NavChild[] }

function SubSidebar({
  isOpen,
  onClose,
  currentSection,
  navigationData,
  onNavigate,
}: {
  isOpen: boolean
  onClose: () => void
  currentSection: string | null
  navigationData: NavSection[]
  onNavigate: () => void
}) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname.startsWith(href)

  if (!isOpen || !currentSection) return null
  const sectionData = navigationData.find((item) => item.id === currentSection)
  if (!sectionData) return null

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

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/home', icon: Home },
  { label: 'Items', href: '/items', icon: Package },
  { label: 'Banking', href: '/banking', icon: Banknote },
  {
    label: 'Sales',
    icon: ShoppingCart,
    children: [
      { label: 'Customers', href: '/sales/customers' },
      { label: 'Estimates', href: '/sales/estimates' },
      { label: 'Retainer Invoices', href: '/sales/retainer-invoices' },
      { label: 'Sales Orders', href: '/sales/sales-orders' },
      { label: 'Delivery Challans', href: '/sales/delivery-challans' },
      { label: 'Invoices', href: '/sales/invoices' },
      { label: 'Payments Received', href: '/sales/payments-received' },
      { label: 'Recurring Invoices', href: '/sales/recurring-invoices' },
      { label: 'Credit Notes', href: '/sales/credit-notes' },
    ],
  },
  {
    label: 'Purchases',
    icon: Briefcase,
    children: [
      { label: 'Vendors', href: '/purchases/vendors' },
      { label: 'Expenses', href: '/purchases/expenses' },
      { label: 'Recurring Expenses', href: '/purchases/recurring-expenses' },
      { label: 'Purchase Orders', href: '/purchases/purchase-orders' },
      { label: 'Bills', href: '/purchases/bills' },
      { label: 'Payments Made', href: '/purchases/payments-made' },
      { label: 'Recurring Bills', href: '/purchases/recurring-bills' },
      { label: 'Vendor Credits', href: '/purchases/vendor-credits' },
    ],
  },
  { label: 'Accountant', href: '/accountant/manual-journals', icon: BookOpen },
]

function iconForSalesChild(label: string): LucideIcon {
  const map: Record<string, LucideIcon> = {
    Customers: Users,
    Estimates: FileText,
    'Retainer Invoices': Wallet,
    'Sales Orders': ClipboardList,
    'Delivery Challans': Truck,
    Invoices: Receipt,
    'Payments Received': Landmark,
    'Recurring Invoices': RefreshCw,
    'Credit Notes': FileMinus,
  }
  return map[label] ?? ShoppingCart
}

function iconForPurchasesChild(label: string): LucideIcon {
  const map: Record<string, LucideIcon> = {
    Vendors: Building2,
    Expenses: Receipt,
    'Recurring Expenses': RefreshCw,
    'Purchase Orders': ClipboardList,
    Bills: FileText,
    'Payments Made': ArrowUpRight,
    'Recurring Bills': RefreshCw,
    'Vendor Credits': FileMinus,
  }
  return map[label] ?? Briefcase
}

export default function Sidebar({ collapsed, onToggle, onConfigureFeatures }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [toolsCollapsed, setToolsCollapsed] = useState(true)
  const [subSidebarOpen, setSubSidebarOpen] = useState(false)
  const [currentSection, setCurrentSection] = useState<string | null>(null)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const quickActionsRef = useRef<HTMLDivElement | null>(null)

  const features = useMemo(() => {
    if (typeof window === 'undefined') return {}
    const raw = localStorage.getItem('books-features')
    return raw ? JSON.parse(raw) : {}
  }, [])

  const isActive = (href?: string) => !!href && pathname.startsWith(href)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setQuickActionsOpen(false)
      }
    }

    if (quickActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [quickActionsOpen])

  const allowChild = (label: string) => {
    const map: Record<string, string> = {
      Estimates: 'estimates',
      'Retainer Invoices': 'retainerInvoices',
      'Sales Orders': 'salesOrders',
      'Delivery Challans': 'deliveryChallans',
      'Purchase Orders': 'purchaseOrders',
    }
    const key = map[label]
    return key ? features[key] !== false : true
  }

  const handleTopLevelClick = (sectionId: string) => {
    setCurrentSection(sectionId)
    setSubSidebarOpen(true)
  }

  const closeSubSidebar = () => {
    setSubSidebarOpen(false)
    setCurrentSection(null)
  }

  const navigationData = [
    {
      id: 'items',
      label: 'Items',
      children: [
        { id: 'items-list', label: 'Items', icon: Package, href: '/items' },
        { id: 'price-lists', label: 'Price Lists', icon: ListOrdered, href: '/items/price-lists' },
        { id: 'inventory-adjustments', label: 'Inventory Adjustments', icon: Boxes, href: '/items/inventory-adjustments' },
      ],
    },
    {
      id: 'banking',
      label: 'Banking',
      children: [{ id: 'banking-overview', label: 'Banking Overview', icon: Banknote, href: '/banking' }],
    },
    {
      id: 'accountant',
      label: 'Accountant',
      children: [
        { id: 'manual-journals', label: 'Manual Journals', icon: BookOpen, href: '/accountant/manual-journals' },
        { id: 'bulk-update', label: 'Bulk Update', icon: ClipboardList, href: '/accountant/bulk-update' },
        { id: 'currency-adjustments', label: 'Currency Adjustments', icon: Banknote, href: '/accountant/currency-adjustments' },
        { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: BarChart3, href: '/accountant/chart-of-accounts' },
        { id: 'transaction-locking', label: 'Transaction Locking', icon: Lock, href: '/accountant/transaction-locking' },
      ],
    },
    {
      id: 'sales',
      label: 'Sales',
      children: navItems
        .find((item) => item.label === 'Sales')
        ?.children?.filter((child) => allowChild(child.label))
        .map((child) => ({
          id: child.href,
          label: child.label,
          icon: iconForSalesChild(child.label),
          href: child.href,
        })) ?? [],
    },
    {
      id: 'purchases',
      label: 'Purchases',
      children: navItems
        .find((item) => item.label === 'Purchases')
        ?.children?.filter((child) => allowChild(child.label))
        .map((child) => ({
          id: child.href,
          label: child.label,
          icon: iconForPurchasesChild(child.label),
          href: child.href,
        })) ?? [],
    },
    {
      id: 'system',
      label: 'System',
      children: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/reports' },
        { id: 'documents', label: 'Documents', icon: FolderOpen, href: '/documents' },
        { id: 'time-tracking', label: 'Time Tracking', icon: Timer, href: '/time-tracking/projects' },
      ],
    },
  ]

  const collapsedPrimary = [
    { label: 'Dashboard', href: '/home', icon: LayoutDashboard },
    { label: 'Items', href: '/items', icon: Package },
    { label: 'Banking', href: '/banking', icon: Banknote },
    { label: 'Sales', href: '/sales/customers', icon: ShoppingCart },
    { label: 'Purchases', href: '/purchases/vendors', icon: Briefcase },
    { label: 'Accountant', href: '/accountant/manual-journals', icon: BookOpen },
  ]

  const booksTools = [
    { label: 'Configure Features', icon: Target, onClick: onConfigureFeatures },
    { label: 'Documents', icon: FolderOpen, href: '/documents' },
    { label: 'Time Tracking', icon: Timer, href: '/time-tracking/projects' },
  ]

  if (collapsed) {
    return (
      <aside className="w-16 h-full bg-white backdrop-blur-xl border-r border-white/30 flex flex-col shadow-xl overflow-y-auto transition-[width] duration-300 flex-shrink-0">
        <div className="p-2 border-b border-white/20 flex justify-center">
          <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-5 h-5 text-brand-foreground" />
          </button>
        </div>

        <div className="p-2 space-y-3">
          <Card variant="glass" padding={true} className="p-2 flex justify-center">
            <button
              onClick={() => setQuickActionsOpen((v) => !v)}
              className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md"
              title="Quick Actions"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </Card>

          <div className="space-y-2">
            {collapsedPrimary.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  className={`mx-auto w-11 h-11 rounded-lg border shadow-md flex items-center justify-center transition-[background-color,border-color,color] duration-300 ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary/50'
                      : 'bg-white text-brand-foreground border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              )
            })}
          </div>
        </div>

        <div className="mt-auto p-2 space-y-2">
          <button
            className="mx-auto w-11 h-11 rounded-lg border shadow-md bg-white text-brand-foreground border-gray-200 hover:bg-gray-50 flex items-center justify-center"
            onClick={onConfigureFeatures}
            title="Configure Features List"
          >
            <Target className="w-5 h-5" />
          </button>
          <Card variant="glass" padding={true} className="p-2">
            <div className="flex justify-center">
              <Avatar
                shape="rounded"
                fallback={resolveUserInitials(user)}
                alt={resolveUserDisplayName(user)}
                size="lg"
                className="bg-white shadow-md border border-gray-200/80 text-brand-primary font-semibold ring-1 ring-black/5"
              />
            </div>
          </Card>
        </div>
      </aside>
    )
  }

  return (
    <>
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } h-full min-h-0 bg-white backdrop-blur-xl border-r border-white/30 flex flex-col shadow-xl overflow-hidden transition-[width] duration-300 flex-shrink-0`}
    >
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-4">
          {!collapsed && <span className="font-bold text-xl text-brand-foreground">Webfudge Books</span>}
          <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-brand-foreground" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-brand-foreground" />
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light" />
            <input
              type="text"
              placeholder="Search here..."
              className="w-full pl-10 pr-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary focus:bg-white/25 transition-[background-color,border-color,box-shadow] duration-300 text-sm placeholder:text-brand-text-light shadow-lg"
            />
          </div>
        )}

        <div className="relative" ref={quickActionsRef}>
          <button
            onClick={() => setQuickActionsOpen((v) => !v)}
            className={`w-full bg-gradient-to-r from-orange-500/20 to-orange-600/10 backdrop-blur-md border ${
              quickActionsOpen ? 'border-orange-300/60' : 'border-white/30 hover:border-orange-200/50'
            } text-brand-foreground rounded-xl py-3 px-4 flex items-center ${
              collapsed ? 'justify-center' : 'justify-between gap-2'
            } shadow-lg hover:shadow-xl transition-all duration-300 group`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-4 h-4 text-white" />
              </div>
              {!collapsed && <span className="text-sm font-semibold text-gray-800">Quick Actions</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${
                  quickActionsOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {quickActionsOpen && !collapsed && (
            <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden">
              <div className="p-2">
                {[
                  { label: 'New Invoice', href: '/sales/invoices/new' },
                  { label: 'New Customer', href: '/sales/customers/new' },
                  { label: 'New Expense', href: '/purchases/expenses' },
                  { label: 'New Project', href: '/time-tracking/projects/new' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setQuickActionsOpen(false)
                      router.push(item.href)
                    }}
                    className="w-full flex items-center gap-3 p-3 text-sm text-gray-800 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-gray-900">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <nav className="space-y-3">
        {!collapsed && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'dashboard', label: 'Dashboard', href: '/home', icon: LayoutDashboard, hasSubNav: false },
              { id: 'sales', label: 'Sales', href: '/sales/customers', icon: ShoppingCart, hasSubNav: true },
              { id: 'purchases', label: 'Purchases', href: '/purchases/vendors', icon: Briefcase, hasSubNav: true },
              { id: 'accountant', label: 'Accountant', href: '/accountant/manual-journals', icon: BookOpen, hasSubNav: true },
            ].map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              if (item.hasSubNav) {
                return (
                  <button
                    key={item.label}
                    onClick={() => handleTopLevelClick(item.id)}
                    className={`rounded-xl p-4 w-full flex flex-col items-center gap-3 transition-[background-color,border-color,color] duration-300 shadow-lg border ${
                      active
                        ? 'bg-brand-primary text-white border-brand-primary/50'
                        : 'bg-white/20 backdrop-blur-md border-white/30 text-brand-foreground hover:bg-white/30 hover:border-white/40'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </button>
                )
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-xl p-4 flex flex-col items-center gap-3 transition-[background-color,border-color,color] duration-300 shadow-lg border ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary/50'
                      : 'bg-white/20 backdrop-blur-md border-white/30 text-brand-foreground hover:bg-white/30 hover:border-white/40'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}

        {!collapsed && (
          <div className="rounded-xl p-3 shadow-lg transition-all duration-200 backdrop-blur-md bg-white/10 border border-white/30">
            <div className="flex items-center justify-between text-sm font-medium text-brand-foreground mb-2">
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Latest Conversations
              </span>
              <button
                type="button"
                className="w-5 h-5 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center hover:bg-white/30 transition-all duration-200 shadow-sm border border-white/20"
              >
                <ChevronRight className="w-2.5 h-2.5 text-gray-600" />
              </button>
            </div>
            <div className="text-center py-4 text-xs text-brand-text-light">No conversations yet</div>
          </div>
        )}
        </nav>

        <div>
        {!collapsed && (
          <div className="mb-4">
            <Card variant="glass" padding={true} className="p-4 rounded-xl">
              <button
                type="button"
                onClick={() => setToolsCollapsed((prev) => !prev)}
                className="flex items-center justify-between w-full text-sm font-medium text-brand-foreground mb-3 hover:opacity-80 transition-opacity"
              >
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Tools
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${toolsCollapsed ? '' : 'rotate-180'}`} />
              </button>

              {!toolsCollapsed && (
                <div className="space-y-2">
                  {booksTools.map((item) => {
                    const Icon = item.icon
                    if (item.onClick) {
                      return (
                        <button
                          key={item.label}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-3 text-xs text-brand-text-light p-2 rounded-lg hover:bg-white/20 transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      )
                    }
                    return (
                      <Link
                        key={item.label}
                        href={item.href ?? '/'}
                        className="flex items-center gap-3 text-xs text-brand-text-light p-2 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        <div className="mb-4">
          {!collapsed && (
            <div className="flex items-center gap-4 px-2 mb-4">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-xs text-brand-text-light font-medium">System</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>
          )}

          <button
            type="button"
            onClick={() => handleTopLevelClick('system')}
            className="w-full bg-white/15 backdrop-blur-md border border-white/25 text-brand-text-light rounded-xl p-3 flex flex-col items-center gap-2 shadow-md hover:bg-white/20 transition-colors"
            title="Analytics"
          >
            <BarChart3 className="w-5 h-5" />
            {!collapsed && <span className="text-xs font-medium text-center">Analytics</span>}
          </button>
        </div>

        <div className="pt-4 border-t border-white/20">
          <div
            className="relative"
            onMouseEnter={() => setShowProfileDropdown(true)}
            onMouseLeave={() => setShowProfileDropdown(false)}
          >
            <Card
              variant="glass"
              padding={true}
              className={`flex items-center gap-3 p-3 hover:bg-white/25 transition-colors cursor-pointer ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Avatar
                shape="rounded"
                fallback={resolveUserInitials(user)}
                alt={resolveUserDisplayName(user)}
                size="lg"
                className="bg-white shadow-md border border-gray-200/80 text-brand-primary font-semibold ring-1 ring-black/5"
              />
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-foreground truncate">{resolveUserDisplayName(user)}</p>
                    <p className="text-xs text-brand-text-light truncate">{resolveUserRole(user)}</p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`}
                  />
                </>
              )}
            </Card>

            {!collapsed && showProfileDropdown && (
              <Card
                variant="glass"
                padding={true}
                className="absolute left-0 right-0 bottom-full mb-2 z-[70] p-0 overflow-hidden shadow-2xl border border-white/40"
              >
                <div className="p-4 border-b border-white/20">
                  <div className="flex items-center gap-3">
                    <Avatar
                      shape="rounded"
                      fallback={resolveUserInitials(user)}
                      alt={resolveUserDisplayName(user)}
                      size="xl"
                      className="bg-white shadow-md border border-gray-200/80 text-brand-primary font-semibold ring-1 ring-black/5"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-foreground truncate">{resolveUserDisplayName(user)}</p>
                      <p className="text-sm text-brand-text-light truncate">{(user?.attributes || user)?.email || user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/30 rounded-lg transition-colors">
                    <User className="w-4 h-4 text-brand-text-light" />
                    <span className="text-sm text-brand-foreground">View Profile</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/30 rounded-lg transition-colors">
                    <Settings className="w-4 h-4 text-brand-text-light" />
                    <span className="text-sm text-brand-foreground">Settings</span>
                  </button>
                  <div className="h-px bg-white/30 my-2 mx-3" />
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
        </div>
      </div>
    </aside>
    <SubSidebar
      isOpen={subSidebarOpen}
      onClose={closeSubSidebar}
      currentSection={currentSection}
      navigationData={navigationData}
      onNavigate={closeSubSidebar}
    />
    </>
  )
}
