'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit, Mail, MoreHorizontal } from 'lucide-react'
import {
  Button,
  Card,
  Avatar,
  TabsWithActions,
  InfoSection,
  InfoRow,
  ActivitiesTimeline,
  ProgressBar,
} from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import HRPageLayout from '../../../../components/shared/HRPageLayout'
import HRStatusBadge from '../../../../components/shared/HRStatusBadge'
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
  const employee = useMemo(() => getEmployeeById(params.id), [params.id])

  if (!employee) {
    return (
      <HRPageLayout>
        <p className="text-gray-600">Employee not found.</p>
        <Link href="/employees" className="text-orange-600 text-sm mt-2 inline-block">Back to directory</Link>
      </HRPageLayout>
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

  return (
    <HRPageLayout>
      <HRPageHeader
        title={employee.name}
        subtitle={employee.designation}
        breadcrumb={[
          { label: 'Employees', href: '/employees' },
          { label: employee.name, href: `/employees/${employee.id}` },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Edit className="w-4 h-4 mr-1" />Edit</Button>
            <Button variant="secondary" size="sm"><Mail className="w-4 h-4 mr-1" />Message</Button>
            <Button variant="secondary" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 p-6 rounded-xl border border-gray-100 bg-white shadow-sm lg:sticky lg:top-4 h-fit">
          <div className="flex flex-col items-center text-center">
            <Avatar name={employee.name} size="lg" className="w-20 h-20 text-xl" />
            <h2 className="mt-4 text-xl font-semibold">{employee.name}</h2>
            <p className="text-gray-500">{employee.designation}</p>
            <p className="text-sm text-gray-500">{employee.department}</p>
            <div className="mt-3"><HRStatusBadge status={employee.status} /></div>
          </div>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Employee ID</dt><dd className="font-medium">{employee.employeeId}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Join date</dt><dd>{employee.joinDate}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Manager</dt><dd>{employee.manager}</dd></div>
          </dl>
          <Button variant="secondary" className="w-full mt-4" onClick={() => router.push('/employees')}>Back to directory</Button>
        </Card>
        <div className="lg:col-span-8 space-y-4">
          <TabsWithActions tabs={TABS} activeTab={tab} onTabChange={setTab} variant="pill" />
          {tab === 'overview' && (
            <Card className="p-6 space-y-6 rounded-xl border border-gray-100 bg-white shadow-sm">
              <InfoSection title="Personal information" isFirst>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="Date of birth" value={employee.dob || '—'} />
                  <InfoRow label="Gender" value={employee.gender || '—'} />
                  <InfoRow label="Phone" value={employee.phone || '—'} />
                  <InfoRow label="Email" value={employee.email || '—'} />
                </div>
              </InfoSection>
              <InfoSection title="Employment">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="Work location" value={employee.workLocation || employee.location} />
                  <InfoRow label="Contract type" value={employee.contractType || 'Permanent'} />
                  <InfoRow label="Shift" value={employee.shift || 'Morning (9–6)'} />
                </div>
              </InfoSection>
              <InfoSection title="Bank & payroll">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow label="Bank" value={employee.bankName || '—'} />
                  <InfoRow label="Account" value={employee.accountNo || '—'} />
                  <InfoRow label="PAN" value={employee.pan || '—'} />
                  <InfoRow label="UAN" value={employee.uan || '—'} />
                </div>
              </InfoSection>
            </Card>
          )}
          {tab === 'documents' && (
            <Card className="p-6 rounded-xl border border-gray-100 bg-white shadow-sm">
              <ul className="divide-y divide-gray-100">
                {docs.map((d) => (
                  <li key={d.name} className="flex items-center justify-between py-3">
                    <span className="font-medium">{d.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{d.date}</span>
                      <HRStatusBadge status={d.status} />
                      <Button variant="secondary" size="sm">Download</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {tab === 'attendance' && (
            <Card className="p-6 rounded-xl border border-gray-100 bg-white shadow-sm">
              <p className="text-sm text-gray-600 mb-4">June 2026 — color key: Present, Absent, Leave, WFH</p>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {Array.from({ length: 28 }, (_, i) => {
                  const types = ['present', 'present', 'leave', 'wfh', 'present', 'absent', 'present']
                  const t = types[i % 7]
                  const colors = { present: 'bg-green-200', absent: 'bg-red-200', leave: 'bg-orange-200', wfh: 'bg-blue-200' }
                  return <div key={i} className={`aspect-square rounded ${colors[t]} text-[10px] flex items-center justify-center`}>{i + 1}</div>
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
            <Card className="p-6 rounded-xl border border-gray-100 bg-white shadow-sm space-y-4">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500"><th className="pb-2">Type</th><th>Entitlement</th><th>Used</th><th>Balance</th></tr></thead>
                <tbody>
                  {LEAVE_BALANCE.map((b) => (
                    <tr key={b.type} className="border-t border-gray-100"><td className="py-2 font-medium">{b.type}</td><td>{b.entitlement}</td><td>{b.used}</td><td>{b.balance}</td></tr>
                  ))}
                </tbody>
              </table>
              <h4 className="font-semibold">Recent requests</h4>
              {leaveRequests.length ? leaveRequests.map((r) => (
                <div key={r.id} className="flex justify-between text-sm border-t border-gray-100 py-2">
                  <span>{r.type} {r.from} – {r.to}</span>
                  <HRStatusBadge status={r.status} />
                </div>
              )) : <p className="text-gray-500 text-sm">No recent leave requests</p>}
            </Card>
          )}
          {tab === 'payroll' && (
            <Card className="p-6 rounded-xl border border-gray-100 bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 text-left"><tr><th className="pb-2">Month</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {PAYSLIPS.map((p) => (
                    <tr key={p.month} className="border-t border-gray-100">
                      <td className="py-2">{p.month}</td>
                      <td>₹{p.gross.toLocaleString('en-IN')}</td>
                      <td>₹{p.deductions.toLocaleString('en-IN')}</td>
                      <td>₹{p.net.toLocaleString('en-IN')}</td>
                      <td><HRStatusBadge status={p.status} /></td>
                      <td><Button variant="secondary" size="sm">Download</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          {tab === 'performance' && (
            <Card className="p-6 rounded-xl border border-gray-100 bg-white shadow-sm space-y-4">
              <p className="text-sm">Last review: <strong>4.2/5</strong> — Ravi Menon</p>
              {okrs.map((o) => (
                <div key={o.title}>
                  <div className="flex justify-between text-sm mb-1"><span>{o.title}</span><span>{o.progress}%</span></div>
                  <ProgressBar value={o.progress} />
                </div>
              ))}
            </Card>
          )}
          {tab === 'activity' && (
            <Card className="p-6 rounded-xl border border-gray-100 bg-white shadow-sm">
              <ActivitiesTimeline items={activities} />
            </Card>
          )}
        </div>
      </div>
    </HRPageLayout>
  )
}
