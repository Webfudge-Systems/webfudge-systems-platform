'use client'

import { useMemo, useState } from 'react'
import {
  Building2,
  MapPin,
  Shield,
  Bell,
  Plug,
  CreditCard,
  Save,
  Lock,
  Plus,
  Settings,
} from 'lucide-react'
import {
  Card,
  FormSectionCard,
  Input,
  Button,
  Checkbox,
  Table,
  TableCellText,
  TableCellOrangePill,
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRSectionCard from '../../../components/shared/HRSectionCard'
import HRDataTableCard from '../../../components/shared/HRDataTableCard'
import HRStatusBadge from '../../../components/shared/HRStatusBadge'
import {
  DEPARTMENTS_TABLE,
  HR_MODULES,
  HR_ROLES,
  INTEGRATIONS,
} from '../../../lib/mock-data/settings'
import { HR_SETTINGS_SECTIONS, NOTIFICATION_PREFS } from '../../../lib/settingsPage'

const SECTION_ICONS = {
  Building2,
  MapPin,
  Shield,
  Bell,
  Plug,
  CreditCard,
}

export default function SettingsPage() {
  const [section, setSection] = useState('company')
  const [searchQuery, setSearchQuery] = useState('')

  const activeSection = HR_SETTINGS_SECTIONS.find((s) => s.id === section)

  const deptRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return DEPARTMENTS_TABLE
    return DEPARTMENTS_TABLE.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.hod.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const deptColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'DEPARTMENT',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[160px] font-medium text-gray-900">{row.name}</div>
        ),
      },
      {
        key: 'hod',
        label: 'HOD',
        render: (_, row) => <TableCellText value={row.hod} />,
      },
      {
        key: 'headcount',
        label: 'HEADCOUNT',
        render: (_, row) => <TableCellText value={String(row.headcount)} emphasized />,
      },
      {
        key: 'location',
        label: 'LOCATION',
        render: (_, row) => <TableCellOrangePill value={row.location} />,
      },
    ],
    []
  )

  return (
    <HRModulePage>
      <HRPageHeader
        title="Settings"
        subtitle="Company profile, departments, roles, and integrations — aligned with CRM workspace settings"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
        ]}
        showSearch
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <HRSectionCard className="shrink-0 !p-2 lg:w-60">
          <nav className="space-y-0.5" aria-label="Settings sections">
            {HR_SETTINGS_SECTIONS.map((s) => {
              const Icon = SECTION_ICONS[s.icon]
              const active = section === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-orange-600' : 'text-gray-400'}`} aria-hidden />
                  {s.label}
                </button>
              )
            })}
          </nav>
        </HRSectionCard>

        <div className="min-w-0 flex-1 space-y-6">
          {activeSection && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Settings className="h-4 w-4 text-orange-500" aria-hidden />
              <span className="font-medium text-gray-900">{activeSection.label}</span>
            </div>
          )}

          {section === 'company' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <FormSectionCard
                  icon={Building2}
                  title="Company profile"
                  description="Legal entity and tax identifiers for payroll and compliance."
                  cardClassName="border border-gray-200 shadow-sm"
                  iconContainerClassName="bg-orange-500"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Company name" defaultValue="Webfudge Systems Pvt Ltd" />
                    <Input label="Industry" defaultValue="Technology" />
                    <Input label="GSTIN" defaultValue="29AAAAA0000A1Z5" />
                    <Input label="PAN" defaultValue="AAAAW1234A" />
                    <Input label="TAN" className="md:col-span-2" />
                    <Input label="Registered address" className="md:col-span-2" />
                  </div>
                  <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-5">
                    <Button variant="secondary">Discard</Button>
                    <Button variant="primary" className="bg-orange-500 hover:bg-orange-600">
                      <Save className="mr-2 h-4 w-4" />
                      Save changes
                    </Button>
                  </div>
                </FormSectionCard>
              </div>
              <aside className="space-y-4">
                <div className="rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50/80 to-orange-50/30 p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                    <Settings className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-semibold text-gray-900">Workspace settings</h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    CRM Settings is a lightweight placeholder; WF People uses this page for HR-specific
                    configuration. Connect to Strapi for live org data.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                    <Lock className="h-4 w-4 text-gray-500" />
                    Your access
                  </div>
                  <p className="text-sm text-gray-600">
                    Role: <span className="font-medium text-gray-900">HR Admin</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Profile editing: <span className="font-medium text-emerald-700">Allowed</span>
                  </p>
                </div>
              </aside>
            </div>
          )}

          {section === 'departments' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search departments..."
                  className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <Button variant="primary" className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Add department
                </Button>
              </div>
              <HRDataTableCard>
                <Table columns={deptColumns} data={deptRows} keyField="id" variant="modern" />
              </HRDataTableCard>
            </>
          )}

          {section === 'roles' && (
            <HRDataTableCard className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-600" aria-hidden />
                <h3 className="font-semibold text-gray-900">Module permissions</h3>
              </div>
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr>
                    <th className="py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Module
                    </th>
                    {HR_ROLES.map((r) => (
                      <th key={r} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HR_MODULES.map((m) => (
                    <tr key={m} className="border-t border-gray-100">
                      <td className="py-3 pr-4 font-medium text-gray-900">{m}</td>
                      {HR_ROLES.map((r) => (
                        <td key={r} className="py-3 text-center">
                          <Checkbox
                            defaultChecked={r === 'Super Admin' || (r === 'HR Admin' && m !== 'Settings')}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </HRDataTableCard>
          )}

          {section === 'notifications' && (
            <div className="space-y-3">
              {NOTIFICATION_PREFS.map((n) => (
                <Card
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-orange-500" aria-hidden />
                    <span className="font-medium text-gray-900">{n.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <Checkbox defaultChecked={n.inApp} /> In-app
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox defaultChecked={n.email} /> Email
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox defaultChecked={n.whatsapp} /> WhatsApp
                    </label>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {section === 'integrations' && (
            <div className="grid gap-4 md:grid-cols-2">
              {INTEGRATIONS.map((i) => (
                <Card
                  key={i.name}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                      <Plug className="h-5 w-5 text-orange-600" aria-hidden />
                    </div>
                    <span className="font-semibold text-gray-900">{i.name}</span>
                  </div>
                  {i.status === 'Connected' ? (
                    <HRStatusBadge status="Active" />
                  ) : i.status === 'Coming Soon' ? (
                    <HRStatusBadge status="Closed" />
                  ) : (
                    <Button variant="primary" size="sm" className="bg-orange-500 hover:bg-orange-600">
                      {i.status}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}

          {section === 'billing' && (
            <HRSectionCard className="max-w-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                  <CreditCard className="h-5 w-5 text-orange-600" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Professional plan</p>
                  <p className="mt-1 text-sm text-gray-500">142 seats · Billed annually</p>
                  <Button variant="secondary" className="mt-4">
                    Manage billing
                  </Button>
                </div>
              </div>
            </HRSectionCard>
          )}
        </div>
      </div>
    </HRModulePage>
  )
}
