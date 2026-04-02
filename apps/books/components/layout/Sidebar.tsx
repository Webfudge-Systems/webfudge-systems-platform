'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Avatar, Card } from '@webfudge/ui'
import SubSidebar from './SubSidebar'
import { resolveUserDisplayName, resolveUserInitials, resolveUserRole, useAuth } from '@webfudge/auth'
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileMinus,
  FileText,
  Home,
  Landmark,
  ListOrdered,
  MessageSquare,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Target,
  Truck,
  Users,
  Wallet,
  LayoutDashboard,
  User,
  Settings,
  LogOut,
  Lock,
  Phone,
  Calendar,
  GitBranch,
  type LucideIcon,
} from 'lucide-react'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
  onConfigureFeatures: () => void
}

type NavItem = { label: string; href?: string; icon: any; children?: Array<{ label: string; href: string }> }

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

const mainNavigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/home',
    hasSubNav: false,
    priority: 'high' as const,
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: DollarSign,
    hasSubNav: true,
    priority: 'high' as const,
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: Briefcase,
    hasSubNav: true,
    priority: 'high' as const,
  },
  {
    id: 'accountant',
    label: 'Accountant',
    icon: BookOpen,
    hasSubNav: true,
    priority: 'high' as const,
  },
  {
    id: 'system',
    label: 'Analytics',
    icon: BarChart3,
    hasSubNav: true,
    priority: 'low' as const,
  },
]

export default function Sidebar({ collapsed, onToggle, onConfigureFeatures }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [toolsCollapsed, setToolsCollapsed] = useState(true)
  const [subSidebarOpen, setSubSidebarOpen] = useState(false)
  const [currentSection, setCurrentSection] = useState<string | null>(null)
  const quickActionsRef = useRef<HTMLDivElement | null>(null)

  const features = useMemo(() => {
    if (typeof window === 'undefined') return {}
    const raw = localStorage.getItem('books-features')
    return raw ? JSON.parse(raw) : {}
  }, [])

  const isActive = (href?: string) => {
    if (!href) return false
    if (href === '/home') return pathname === '/home' || pathname === '/'
    return pathname.startsWith(href)
  }

  const isSalesActive = () => pathname.startsWith('/sales/')
  const isPurchasesActive = () => pathname.startsWith('/purchases/')
  const isAccountantActive = () => pathname.startsWith('/accountant/')

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
      children:
        navItems
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
      children:
        navItems
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
        {
          id: 'reports',
          label: 'Reports & Forecasts',
          icon: BarChart3,
          href: '/reports',
        },
      ],
    },
  ]

  /** Mirrors CRM `crmTools` labels and structure; Books routes + Configure Features. */
  const booksTools = useMemo(
    () =>
      [
        {
          label: 'Priority / Automation Rules',
          icon: Target,
          href: '/coming-soon?feature=Priority / Automation Rules',
        },
        { label: 'Invoices & Payments', icon: Receipt, href: '/sales/invoices' },
        {
          label: 'Meetings & Calls',
          icon: Phone,
          href: '/coming-soon?feature=Meetings & Calls',
        },
        { label: 'Calendar', icon: Calendar, href: '/coming-soon?feature=Calendar' },
        {
          label: 'Integrations',
          icon: GitBranch,
          href: '/coming-soon?feature=Integrations',
        },
        { label: 'Configure Features', icon: Settings, onClick: onConfigureFeatures },
      ] as const,
    [onConfigureFeatures]
  )

  const quickActionItems = [
    {
      label: 'New Invoice',
      icon: Receipt,
      href: '/sales/invoices/new',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      label: 'New Customer',
      icon: Users,
      href: '/sales/customers/new',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      label: 'New Expense',
      icon: Receipt,
      href: '/purchases/expenses',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      label: 'New Project',
      icon: CheckSquare,
      href: '/time-tracking/projects/new',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ]

  const handleQuickActionClick = (href: string) => {
    setQuickActionsOpen(false)
    router.push(href)
  }

  const toggleQuickActions = () => setQuickActionsOpen(!quickActionsOpen)

  return (
    <>
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } flex h-full min-h-0 flex-shrink-0 flex-col border-r border-white/30 bg-white shadow-xl backdrop-blur-xl transition-[width] duration-300 overflow-y-auto`}
      >
        <div className="border-b border-white/20 p-4">
          <div className="mb-4 flex items-center justify-between">
            {!collapsed && <span className="text-xl font-bold text-brand-foreground">Webfudge Books</span>}
            <button type="button" onClick={onToggle} className="rounded-lg p-2 transition-colors hover:bg-gray-50">
              {collapsed ? (
                <ChevronRight className="h-5 w-5 text-brand-foreground" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-brand-foreground" />
              )}
            </button>
          </div>

          {!collapsed && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-light" />
              <input
                type="text"
                placeholder="Search here..."
                className="w-full rounded-xl border border-white/30 bg-white/20 py-2 pl-10 pr-4 text-sm shadow-lg backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 placeholder:text-brand-text-light focus:border-brand-primary focus:bg-white/25 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          )}

          <div className="relative" ref={quickActionsRef}>
            <button
              type="button"
              onClick={toggleQuickActions}
              className={`group flex w-full items-center rounded-xl border bg-gradient-to-r from-orange-500/20 to-orange-600/10 py-3 px-4 text-brand-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl ${
                quickActionsOpen ? 'border-orange-300/60' : 'border-white/30 hover:border-orange-200/50'
              } ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-md transition-transform duration-300 group-hover:scale-110">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                {!collapsed && <span className="text-sm font-semibold text-gray-800">Quick Actions</span>}
              </div>
              {!collapsed && (
                <ChevronDown
                  className={`h-4 w-4 text-gray-600 transition-transform duration-300 ${quickActionsOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {quickActionsOpen && !collapsed && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="p-2">
                  <div className="mb-1 border-b border-gray-100 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Create</p>
                  </div>
                  {quickActionItems.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleQuickActionClick(item.href)}
                        className="group/item flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-sm text-gray-800 transition-all duration-200 hover:bg-gray-50"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all duration-200 ${item.bgColor} ${item.borderColor} group-hover/item:scale-110 group-hover/item:shadow-md`}
                        >
                          <Icon className={`h-5 w-5 ${item.color}`} />
                        </div>
                        <span className="flex-1 font-medium text-gray-900">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 transition-opacity duration-200 group-hover/item:opacity-100" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className={`grid gap-3 ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {mainNavigationItems
              .filter((item) => item.priority === 'high')
              .map((item) => {
                const Icon = item.icon
                const active = item.href ? isActive(item.href) : false
                const isSalesSection = item.id === 'sales' && isSalesActive()
                const isPurchasesSection = item.id === 'purchases' && isPurchasesActive()
                const isAccountantSection = item.id === 'accountant' && isAccountantActive()

                if (item.hasSubNav) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTopLevelClick(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`group flex w-full flex-col items-center gap-3 rounded-xl p-4 shadow-lg transition-[background-color,border-color] duration-300 ${
                        isSalesSection || isPurchasesSection || isAccountantSection
                          ? 'border border-yellow-300/50 bg-gradient-to-br from-yellow-400/30 to-yellow-500/20 text-yellow-800'
                          : 'border border-white/30 bg-white/20 text-brand-foreground backdrop-blur-md hover:border-white/40 hover:bg-white/30'
                      }`}
                    >
                      <Icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                      {!collapsed && <span className="text-center text-xs font-medium">{item.label}</span>}
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href || '/home'}
                    title={collapsed ? item.label : undefined}
                    className={`group flex flex-col items-center gap-3 rounded-xl p-4 shadow-lg transition-[background-color,border-color,color] duration-300 ${
                      active
                        ? 'border border-brand-primary/50 bg-brand-primary text-white'
                        : 'border border-white/30 bg-white/20 text-brand-foreground backdrop-blur-md hover:border-white/40 hover:bg-white/30'
                    }`}
                  >
                    <Icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                    {!collapsed && <span className="text-center text-xs font-medium">{item.label}</span>}
                  </Link>
                )
              })}
          </div>
        </div>

        {!collapsed && (
          <div className="flex-1">
            <div className="mb-2 px-3">
              <div
                className={`rounded-xl p-2.5 shadow-lg backdrop-blur-md transition-all duration-200 ${
                  pathname.startsWith('/threads') ? 'border border-orange-200 bg-orange-50/90' : 'border border-white/30 bg-white/10'
                }`}
              >
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-brand-foreground">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Latest Conversations
                  </span>
                  <Link
                    href="/threads"
                    title="View all conversations"
                    className="flex h-5 w-5 items-center justify-center rounded-lg border border-white/20 bg-white/20 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-white/30"
                  >
                    <ChevronRight className="h-2.5 w-2.5 text-gray-600 transition-colors group-hover:text-gray-900" />
                  </Link>
                </div>

                <div className="max-h-80 space-y-1.5 overflow-y-auto">
                  <div className="py-4 text-center text-xs text-brand-text-light">No conversations yet</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="flex-1">
            <div className="mb-4 px-4">
              <Card variant="glass" padding={true} className="p-4">
                <button
                  type="button"
                  onClick={() => setToolsCollapsed(!toolsCollapsed)}
                  className="mb-3 flex w-full items-center justify-between text-sm font-medium text-brand-foreground transition-opacity hover:opacity-80"
                >
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Tools
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${toolsCollapsed ? '' : 'rotate-180'}`}
                  />
                </button>

                {!toolsCollapsed && (
                  <div className="space-y-2">
                    {booksTools.map((item) => {
                      const Icon = item.icon
                      if ('onClick' in item) {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={item.onClick}
                            className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-xs text-brand-text-light transition-colors hover:bg-white/20"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="font-medium">{item.label}</span>
                          </button>
                        )
                      }
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-3 rounded-lg p-2 text-xs text-brand-text-light transition-colors hover:bg-white/20"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <div className="mb-4 px-4">
            {!collapsed && (
              <div className="mb-4 flex items-center gap-4 px-2">
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-xs text-brand-text-light font-medium">System</span>
                <div className="h-px flex-1 bg-white/20" />
              </div>
            )}

            <div className="flex flex-col gap-3">
              {mainNavigationItems
                .filter((item) => item.priority === 'low')
                .map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTopLevelClick(item.id)}
                      title={collapsed ? item.label : undefined}
                      className="w-full bg-white/15 backdrop-blur-md border border-white/25 text-brand-text-light rounded-xl p-3 flex flex-col items-center gap-2 shadow-md hover:bg-white/20 transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      {!collapsed && <span className="text-center text-xs font-medium">{item.label}</span>}
                    </button>
                  )
                })}
            </div>
          </div>

          <div className="border-t border-white/20 p-4">
            <div className="relative">
              <Card
                variant="glass"
                padding={true}
                className={`flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-white/25 ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <Avatar
                  shape="rounded"
                  fallback={resolveUserInitials(user)}
                  alt={resolveUserDisplayName(user)}
                  size="lg"
                  className="border border-gray-200/80 bg-white font-semibold text-brand-primary shadow-md ring-1 ring-black/5"
                />
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-foreground">{resolveUserDisplayName(user)}</p>
                      <p className="truncate text-xs text-brand-text-light">{resolveUserRole(user)}</p>
                    </div>
                  </>
                )}
              </Card>
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
