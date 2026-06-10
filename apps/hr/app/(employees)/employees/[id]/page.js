'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit, Mail, Trash2, Briefcase, MapPin, Calendar } from 'lucide-react'
import {
  Button,
  Card,
  Avatar,
  TabsWithActions,
  InfoSection,
  InfoRow,
  ActivitiesTimeline,
  ProgressBar,
  KPICard,
  Modal,
} from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import HRModulePage from '../../../../components/layout/HRModulePage'
import HRKpiRow from '../../../../components/layout/HRKpiRow'
import HRStatusBadge from '../../../../components/shared/HRStatusBadge'
import EmployeeDetailMetaBar from '../../../../components/employees/EmployeeDetailMetaBar'
import { getEmployeeById, EMPLOYEE_DOCUMENTS, EMPLOYEE_OKRS } from '../../../../lib/mock-data/employees'
import { EMPLOYEE_ACTIVITIES } from '../../../../lib/mock-data/activities'
import { LEAVE_REQUESTS } from '../../../../lib/mock-data/leave'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'performance', label: 'Performance' },
  { id: 'activity', label: 'Activity' },
]

const ATTENDANCE_SUMMARY = { present: 18, absent: 1, leave: 2, wfh: 3 }
const LEAVE_BALANCE = [
  { type: 'CL', entitlement: 12, used: 3, balance: 9 },
  { type: 'SL', entitlement: 12, used: 1, balance: 11 },
  { type: 'PL', entitlement: 21, used: 5, balance: 16 },
]
const PAYSLIPS = [
  { month: 'June 2026', gross: 95000, deductions: 20513, net: 74487, status: 'Draft' },
  { month: 'May 2026', gross: 95000, deductions: 20100, net: 74900, status: 'Paid' },
  { month: 'April 2026', gross: 95000, deductions: 19800, net: 75200, status: 'Paid' },
]

export default function EmployeeProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const employee = useMemo(() => getEmployeeById(params.id), [params.id])

  if (!employee) {
    return (
      <HRModulePage>
        <p className="text-gray-600">Employee not found.</p>
        <Link href="/employees" className="mt-2 inline-block text-sm text-orange-600">
          Back to directory
        </Link>
      </HRModulePage>
    )
  }

  const docs = EMPLOYEE_DOCUMENTS[employee.id] || EMPLOYEE_DOCUMENTS['emp-001']
  const okrs = EMPLOYEE_OKRS[employee.id] || EMPLOYEE_OKRS['emp-001'] || []
  const activities = (EMPLOYEE_ACTIVITIES[employee.id] || []).map((a, i) => ({
    id: i,
    action: a.action,
    summary: `${a.title} — ${a.detail}`,
    createdAt: new Date().toISOString(),
    actor: { username: 'System' },
  }))
  const leaveRequests = LEAVE_REQUESTS.filter((r) => r.employeeId === employee.id)

  const handleDelete = () => {
    setDeleteOpen(false)
    router.push('/employees')
  }

  return (
    <HRModulePage>
      <HRPageHeader
        title={employee.name}
        subtitle={employee.designation}
        breadcrumb={[
          { label: 'Employees', href: '/employees' },
          { label: employee.name, href: `/employees/${employee.id}` },
        ]}
        showSearch
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/employees/${employee.id}/edit`)}
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>
            {employee.email ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.location.href = `mailto:${employee.email}`
                }}
              >
                <Mail className="mr-1 h-4 w-4" />
                Message
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              className="!text-red-600 hover:!bg-red-50"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <EmployeeDetailMetaBar employee={employee} />

      <HRKpiRow columns={3}>
        <KPICard compact title="Department" value={employee.department} icon={Briefcase} colorScheme="orange" />
        <KPICard
          compact
          title="Location"
          value={employee.workLocation || employee.location || '—'}
          icon={MapPin}
          colorScheme="orange"
        />
        <KPICard compact title="Joined" value={employee.joinDate} icon={Calendar} colorScheme="orange" />
      </HRKpiRow>

      <TabsWithActions tabs={TABS} activeTab={tab} onTabChange={setTab} variant="pill" />

      {tab === 'overview' && (
        <Card variant="elevated" className="space-y-6">
          <div className="flex flex-col items-center border-b border-gray-100 pb-6 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
            <Avatar alt={employee.name} fallback={employee.name?.charAt(0)} size="lg" className="!h-20 !w-20 text-xl" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{employee.name}</h2>
              <p className="text-gray-500">{employee.designation}</p>
              <div className="mt-2">
                <HRStatusBadge status={employee.status} />
              </div>
            </div>
          </div>
          <InfoSection title="Personal information" isFirst>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Date of birth" value={employee.dob || '—'} />
              <InfoRow label="Gender" value={employee.gender || '—'} />
              <InfoRow label="Phone" value={employee.phone || '—'} />
              <InfoRow label="Email" value={employee.email || '—'} />
            </div>
          </InfoSection>
          <InfoSection title="Employment">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Work location" value={employee.workLocation || employee.location} />
              <InfoRow label="Contract type" value={employee.contractType || 'Permanent'} />
              <InfoRow label="Shift" value={employee.shift || 'Morning (9–6)'} />
              <InfoRow label="Manager" value={employee.manager || '—'} />
            </div>
          </InfoSection>
          <InfoSection title="Bank & payroll">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Bank" value={employee.bankName || '—'} />
              <InfoRow label="Account" value={employee.accountNo || '—'} />
              <InfoRow label="PAN" value={employee.pan || '—'} />
              <InfoRow label="UAN" value={employee.uan || '—'} />
            </div>
          </InfoSection>
        </Card>
      )}

      {tab === 'documents' && (
        <Card variant="elevated">
          <ul className="divide-y divide-gray-100">
            {docs.map((d) => (
              <li key={d.name} className="flex items-center justify-between py-3">
                <span className="font-medium">{d.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{d.date}</span>
                  <HRStatusBadge status={d.status} />
                  <Button variant="secondary" size="sm">
                    Download
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'attendance' && (
        <Card variant="elevated">
          <p className="mb-4 text-sm text-gray-600">June 2026 — color key: Present, Absent, Leave, WFH</p>
          <div className="mb-4 grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }, (_, i) => {
              const types = ['present', 'present', 'leave', 'wfh', 'present', 'absent', 'present']
              const t = types[i % 7]
              const colors = {
                present: 'bg-green-200',
                absent: 'bg-red-200',
                leave: 'bg-orange-200',
                wfh: 'bg-blue-200',
              }
              return (
                <div
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded text-[10px] ${colors[t]}`}
                >
                  {i + 1}
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 text-sm">
            <span>Present {ATTENDANCE_SUMMARY.present}</span>
            <span>Absent {ATTENDANCE_SUMMARY.absent}</span>
            <span>Leave {ATTENDANCE_SUMMARY.leave}</span>
            <span>WFH {ATTENDANCE_SUMMARY.wfh}</span>
          </div>
        </Card>
      )}

      {tab === 'leave' && (
        <Card variant="elevated" className="space-y-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2">Type</th>
                <th>Entitlement</th>
                <th>Used</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {LEAVE_BALANCE.map((b) => (
                <tr key={b.type} className="border-t border-gray-100">
                  <td className="py-2 font-medium">{b.type}</td>
                  <td>{b.entitlement}</td>
                  <td>{b.used}</td>
                  <td>{b.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4 className="font-semibold">Recent requests</h4>
          {leaveRequests.length ? (
            leaveRequests.map((r) => (
              <div key={r.id} className="flex justify-between border-t border-gray-100 py-2 text-sm">
                <span>
                  {r.type} {r.from} – {r.to}
                </span>
                <HRStatusBadge status={r.status} />
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No recent leave requests</p>
          )}
        </Card>
      )}

      {tab === 'payroll' && (
        <Card variant="elevated" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="pb-2">Month</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {PAYSLIPS.map((p) => (
                <tr key={p.month} className="border-t border-gray-100">
                  <td className="py-2">{p.month}</td>
                  <td>₹{p.gross.toLocaleString('en-IN')}</td>
                  <td>₹{p.deductions.toLocaleString('en-IN')}</td>
                  <td>₹{p.net.toLocaleString('en-IN')}</td>
                  <td>
                    <HRStatusBadge status={p.status} />
                  </td>
                  <td>
                    <Button variant="secondary" size="sm">
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'performance' && (
        <Card variant="elevated" className="space-y-4">
          <p className="text-sm">
            Last review: <strong>4.2/5</strong> — Ravi Menon
          </p>
          {okrs.map((o) => (
            <div key={o.title}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{o.title}</span>
                <span>{o.progress}%</span>
              </div>
              <ProgressBar value={o.progress} />
            </div>
          ))}
        </Card>
      )}

      {tab === 'activity' && (
        <Card variant="elevated">
          <ActivitiesTimeline items={activities} />
        </Card>
      )}

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete employee" size="sm">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-900">{employee.name}</span>? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </HRModulePage>
  )
}
