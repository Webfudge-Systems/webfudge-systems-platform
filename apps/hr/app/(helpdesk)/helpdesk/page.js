'use client'

import { useMemo, useState } from 'react'
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Headphones,
  FolderOpen,
  Timer,
  HelpCircle,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Avatar,
  TableCellText,
  TableCellDateOnly,
  TableCellOrangePill,
  Card,
  Modal,
  Accordion,
  Textarea,
  ChatMessageText,
  TableResultsCount,
} from '@webfudge/ui'
import { Select } from '../../../components/shared/HRSelect'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRKpiRow from '../../../components/layout/HRKpiRow'
import HRDataTableCard from '../../../components/shared/HRDataTableCard'
import HRStatusBadge from '../../../components/shared/HRStatusBadge'
import {
  HELPDESK_TICKETS,
  TICKET_THREADS,
  FAQ_ITEMS,
  TICKET_CATEGORIES,
} from '../../../lib/mock-data/helpdesk'
import {
  computeHelpdeskStats,
  filterHelpdeskTickets,
  filterTicketCategories,
  getHelpdeskTabItems,
} from '../../../lib/helpdeskPage'

const STATUS_FILTERS = ['', 'Open', 'In Progress', 'Resolved', 'Closed']
const PRIORITY_FILTERS = ['', 'High', 'Medium', 'Low']
export default function HelpdeskPage() {
  const [activeTab, setActiveTab] = useState('tickets')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [selected, setSelected] = useState(null)

  const stats = useMemo(() => computeHelpdeskStats(), [])
  const tabItems = useMemo(() => getHelpdeskTabItems(), [])
  const thread = selected ? TICKET_THREADS[selected.id] || [] : []

  const ticketRows = useMemo(
    () => filterHelpdeskTickets(HELPDESK_TICKETS, { search: searchQuery, statusFilter, priorityFilter }),
    [searchQuery, statusFilter, priorityFilter]
  )

  const categoryRows = useMemo(
    () => filterTicketCategories(TICKET_CATEGORIES, searchQuery),
    [searchQuery]
  )

  const ticketColumns = useMemo(
    () => [
      {
        key: 'id',
        label: 'ID',
        fixed: true,
        render: (_, row) => (
          <span className="font-mono text-sm font-medium text-gray-900">{row.id}</span>
        ),
      },
      {
        key: 'employee',
        label: 'EMPLOYEE',
        render: (_, row) => (
          <div className="flex min-w-[180px] items-center gap-3">
            <Avatar alt={row.employee} fallback={row.employee?.charAt(0) || '?'} size="sm" />
            <span className="truncate font-medium text-gray-900">{row.employee}</span>
          </div>
        ),
      },
      {
        key: 'category',
        label: 'CATEGORY',
        render: (_, row) => <TableCellOrangePill value={row.category} />,
      },
      {
        key: 'subject',
        label: 'SUBJECT',
        render: (_, row) => (
          <span className="block max-w-[220px] truncate text-sm text-gray-900">{row.subject}</span>
        ),
      },
      {
        key: 'priority',
        label: 'PRIORITY',
        render: (_, row) => <HRStatusBadge status={row.priority} />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
      {
        key: 'updated',
        label: 'UPDATED',
        render: (_, row) => <TableCellDateOnly dateString={row.updated} />,
      },
    ],
    []
  )

  const categoryColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'CATEGORY',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[160px] font-medium text-gray-900">{row.name}</div>
        ),
      },
      {
        key: 'sla',
        label: 'SLA',
        render: (_, row) => <TableCellText value={`${row.slaHours}h`} emphasized />,
      },
      {
        key: 'assignee',
        label: 'ASSIGNEE',
        render: (_, row) => <TableCellText value={row.assignee} />,
      },
      {
        key: 'sub',
        label: 'SUB-TOPICS',
        render: (_, row) => (
          <span className="text-sm text-gray-600">{row.sub.join(', ')}</span>
        ),
      },
    ],
    []
  )

  const resultCount =
    activeTab === 'tickets'
      ? ticketRows.length
      : activeTab === 'categories'
        ? categoryRows.length
        : activeTab === 'faq'
          ? FAQ_ITEMS.length
          : 0

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title="HR Helpdesk"
        subtitle={`${stats.open} open · ${stats.inProgress} in progress · ${stats.slaCompliance}% within SLA`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Helpdesk', href: '/helpdesk' },
        ]}
        showActions
        showSearch
        onImportClick={() => console.log('Import tickets')}
        onExportClick={() => console.log('Export tickets')}
      />

      <HRKpiRow>
        <KPICard
          title="Open"
          value={stats.open}
          subtitle="Awaiting response"
          icon={Ticket}
          colorScheme="orange"
        />
        <KPICard
          title="In Progress"
          value={stats.inProgress}
          subtitle="Being handled"
          icon={Clock}
          colorScheme="orange"
        />
        <KPICard
          title="Resolved"
          value={stats.resolved}
          subtitle={`${stats.total} total tickets`}
          icon={CheckCircle}
          colorScheme="orange"
        />
        <KPICard
          title="High Priority"
          value={stats.highPriority}
          subtitle={`${stats.breaches} SLA breaches this week`}
          icon={AlertTriangle}
          colorScheme="orange"
        />
      </HRKpiRow>

      <TabsWithActions
        tabs={tabItems.map((item) => ({
          key: item.key,
          label: item.label,
          badge: item.count > 0 ? String(item.count) : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch={activeTab !== 'sla'}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search..."
        showAdd
        onAddClick={() => console.log('New ticket')}
        addTitle="New Ticket"
        showFilter
        onFilterClick={() => console.log('Filter tickets')}
        showExport
        onExportClick={() => console.log('Export tickets')}
        exportTitle="Export"
        afterTabs={
          activeTab === 'tickets' ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: '', label: 'All statuses' },
                  ...STATUS_FILTERS.filter(Boolean).map((s) => ({ value: s, label: s })),
                ]}
                placeholder="All statuses"
                containerClassName="min-w-[140px]"
              />
              <Select
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: '', label: 'All priorities' },
                  ...PRIORITY_FILTERS.filter(Boolean).map((p) => ({ value: p, label: p })),
                ]}
                placeholder="All priorities"
                containerClassName="min-w-[140px]"
              />
            </div>
          ) : null
        }
      />

      {activeTab !== 'sla' && <TableResultsCount count={resultCount} />}

      {activeTab === 'tickets' && (
        <HRDataTableCard>
          <Table
            columns={ticketColumns}
            data={ticketRows}
            keyField="id"
            variant="modern"
            onRowClick={(row) => setSelected(row)}
          />
          {ticketRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <Headphones className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No tickets found</h3>
              <p className="mb-4 text-sm text-gray-500">Try adjusting your search or filters.</p>
              <Button variant="primary" onClick={() => console.log('New ticket')}>
                <Plus className="mr-2 h-4 w-4" />
                New Ticket
              </Button>
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'categories' && (
        <HRDataTableCard>
          <Table columns={categoryColumns} data={categoryRows} keyField="id" variant="modern" />
          {categoryRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <FolderOpen className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No categories found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search.</p>
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'sla' && (
        <HRKpiRow columns={3}>
          <Card variant="elevated" className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{stats.slaCompliance}%</p>
            <p className="mt-1 text-sm text-gray-500">Within SLA</p>
          </Card>
          <Card variant="elevated" className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Timer className="h-5 w-5 text-orange-600" aria-hidden />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.avgResolutionHours}h</p>
            <p className="mt-1 text-sm text-gray-500">Avg resolution time</p>
          </Card>
          <Card variant="elevated" className="text-center">
            <p className="text-3xl font-bold text-red-600">{stats.breaches}</p>
            <p className="mt-1 text-sm text-gray-500">Breaches this week</p>
          </Card>
        </HRKpiRow>
      )}

      {activeTab === 'faq' && (
        <Card variant="elevated">
          <div className="mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-orange-600" aria-hidden />
            <h3 className="font-semibold text-gray-900">Frequently asked questions</h3>
          </div>
          <Accordion
            items={FAQ_ITEMS.map((f, i) => ({
              id: String(i),
              label: `[${f.category}] ${f.q}`,
              content: f.a,
            }))}
          />
        </Card>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.subject || 'Ticket'}
        size="lg"
      >
        {selected && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="font-mono text-sm text-gray-600">{selected.id}</span>
              <HRStatusBadge status={selected.priority} />
              <HRStatusBadge status={selected.status} />
            </div>
            <p className="text-sm text-gray-500">
              {selected.employee} · {selected.category} · Assignee: {selected.assignee}
            </p>
            <div className="mb-4 mt-4 space-y-3">
              {thread.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 ${
                    m.role === 'agent' ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-500">
                    {m.author} · {m.time}
                  </p>
                  <ChatMessageText text={m.text} className="mt-1 text-sm" />
                </div>
              ))}
            </div>
            <Textarea placeholder="Reply…" rows={3} />
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
              <Button variant="primary" className="bg-orange-500 hover:bg-orange-600">
                Send reply
              </Button>
            </div>
          </>
        )}
      </Modal>
    </HRModulePage>
  )
}
