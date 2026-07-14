'use client'

import { Input, FormSectionCard } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { User, Wallet, TrendingDown } from 'lucide-react'
import { formatPayrollRunStatus, getPayrollRecordDataReadiness } from '../../lib/payrollShared'

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
      runStatus: 'Draft',
      dataReadiness: 'Ready for payroll',
      missingSalaryStructure: false,
      missingBankDetails: false,
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
    runStatus: formatPayrollRunStatus(record.status),
    dataReadiness: getPayrollRecordDataReadiness(record),
    missingSalaryStructure: Boolean(record.missingSalaryStructure),
    missingBankDetails: Boolean(record.missingBankDetails),
  }
}

export default function PayrollRecordForm({
  form,
  onChange,
  isNew = false,
  readOnly = false,
  departments = [],
  month,
}) {
  const handleChange = (field, value) => {
    if (readOnly) return
    onChange(field, value)
  }

  const hasBlockers = form.missingSalaryStructure || form.missingBankDetails

  return (
    <div className="space-y-6">
      {month ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Payroll run</p>
          <p className="mt-1">{month}</p>
        </div>
      ) : null}

      {!readOnly && hasBlockers ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">This employee has payroll blockers</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {form.missingSalaryStructure ? (
              <li>Assign a salary structure and CTC on the employee profile, or enter valid gross and net pay below.</li>
            ) : null}
            {form.missingBankDetails ? (
              <li>Add bank account details on the employee profile to clear the missing bank blocker.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <FormSectionCard icon={User} title="Employee" description="Payroll subject for this run">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Input
              label="Employee name *"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Full name"
              required
              disabled={readOnly || !isNew}
            />
          </div>
          <div>
            <Input
              label="Employee ID"
              value={form.employeeId}
              onChange={(e) => handleChange('employeeId', e.target.value)}
              placeholder="WF-1001"
              disabled={readOnly || !isNew}
            />
          </div>
          <div>
            <Input
              label="Designation"
              value={form.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
              placeholder="Job title"
              disabled={readOnly}
            />
          </div>
          <div>
            {readOnly ? (
              <Input label="Department" value={form.dept || '—'} disabled />
            ) : (
              <Select
                label="Department"
                value={form.dept}
                onChange={(v) => handleChange('dept', v)}
                options={(departments.length ? departments : ['Engineering', 'Sales', 'HR', 'Finance']).map((d) => ({
                  value: d,
                  label: d,
                }))}
              />
            )}
          </div>
          <div>
            <Input label="Run status" value={form.runStatus || 'Draft'} disabled />
          </div>
          <div>
            <Input label="Data readiness" value={form.dataReadiness || '—'} disabled />
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
            disabled={readOnly}
          />
          <Input
            label="Net pay (₹) *"
            type="number"
            min="0"
            value={form.net}
            onChange={(e) => handleChange('net', e.target.value)}
            required
            disabled={readOnly}
          />
        </div>
      </FormSectionCard>

      <FormSectionCard icon={TrendingDown} title="Deductions" description="Statutory and tax deductions">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Input label="PF (₹)" type="number" min="0" value={form.pf} onChange={(e) => handleChange('pf', e.target.value)} disabled={readOnly} />
          <Input label="ESI (₹)" type="number" min="0" value={form.esi} onChange={(e) => handleChange('esi', e.target.value)} disabled={readOnly} />
          <Input label="PT (₹)" type="number" min="0" value={form.pt} onChange={(e) => handleChange('pt', e.target.value)} disabled={readOnly} />
          <Input label="TDS (₹)" type="number" min="0" value={form.tds} onChange={(e) => handleChange('tds', e.target.value)} disabled={readOnly} />
        </div>
      </FormSectionCard>
    </div>
  )
}
