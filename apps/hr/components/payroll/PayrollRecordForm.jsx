'use client'

import { Input, Select, FormSectionCard } from '@webfudge/ui'
import { User, Wallet, TrendingDown } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Paid', label: 'Paid' },
]

export function payrollRecordToForm(record, defaultDepartment = 'Engineering') {
  if (!record) {
    return {
      name: '',
      employeeId: '',
      designation: '',
      dept: defaultDepartment,
      gross: '',
      pf: '',
      esi: '',
      pt: '',
      tds: '',
      net: '',
      status: 'Draft',
    }
  }
  return {
    name: record.name || '',
    employeeId: record.employeeId || '',
    designation: record.designation || '',
    dept: record.dept || '',
    gross: String(record.gross ?? ''),
    pf: String(record.pf ?? ''),
    esi: String(record.esi ?? ''),
    pt: String(record.pt ?? ''),
    tds: String(record.tds ?? ''),
    net: String(record.net ?? ''),
    status: record.status || 'Draft',
  }
}

export default function PayrollRecordForm({ form, onChange, isNew = false, departments = [] }) {
  const handleChange = (field, value) => {
    onChange(field, value)
  }

  return (
    <div className="space-y-6">
      <FormSectionCard icon={User} title="Employee" description="Payroll subject for this run">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Input
              label="Employee name *"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Full name"
              required
              disabled={!isNew}
            />
          </div>
          <div>
            <Input
              label="Employee ID"
              value={form.employeeId}
              onChange={(e) => handleChange('employeeId', e.target.value)}
              placeholder="WF-1001"
              disabled={!isNew}
            />
          </div>
          <div>
            <Input
              label="Designation"
              value={form.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
              placeholder="Job title"
            />
          </div>
          <div>
            <Select
              label="Department"
              value={form.dept}
              onChange={(v) => handleChange('dept', v)}
              options={(departments.length ? departments : ['Engineering', 'Sales', 'HR', 'Finance']).map((d) => ({ value: d, label: d }))}
            />
          </div>
          <div>
            <Select
              label="Status"
              value={form.status}
              onChange={(v) => handleChange('status', v)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </FormSectionCard>

      <FormSectionCard icon={Wallet} title="Earnings" description="Gross pay for the period">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input
            label="Gross salary (₹) *"
            type="number"
            min="0"
            value={form.gross}
            onChange={(e) => handleChange('gross', e.target.value)}
            required
          />
          <Input
            label="Net pay (₹) *"
            type="number"
            min="0"
            value={form.net}
            onChange={(e) => handleChange('net', e.target.value)}
            required
          />
        </div>
      </FormSectionCard>

      <FormSectionCard icon={TrendingDown} title="Deductions" description="Statutory and tax deductions">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Input label="PF (₹)" type="number" min="0" value={form.pf} onChange={(e) => handleChange('pf', e.target.value)} />
          <Input label="ESI (₹)" type="number" min="0" value={form.esi} onChange={(e) => handleChange('esi', e.target.value)} />
          <Input label="PT (₹)" type="number" min="0" value={form.pt} onChange={(e) => handleChange('pt', e.target.value)} />
          <Input label="TDS (₹)" type="number" min="0" value={form.tds} onChange={(e) => handleChange('tds', e.target.value)} />
        </div>
      </FormSectionCard>
    </div>
  )
}
