'use client'

import { Input, FormSectionCard, Checkbox } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { User, Briefcase, Mail, Phone, MapPin, Building2, Landmark, Lock, KeyRound, Clock } from 'lucide-react'
import { SHIFT_OPTIONS, normalizeShiftId } from '../../lib/shiftShared'

const EMPLOYMENT_TYPES = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' },
]

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Probation', label: 'Probation' },
  { value: 'Notice', label: 'On Notice' },
  { value: 'Exited', label: 'Exited' },
]

const DEFAULT_MANAGER_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
]

export default function EmployeeForm({
  form,
  onChange,
  departments = [],
  managerRoleOptions = DEFAULT_MANAGER_ROLE_OPTIONS,
  salaryStructureOptions = [],
  showLoginSetup = false,
}) {
  const uniqueDepartments = Array.from(new Set((departments || []).filter(Boolean)))
  const departmentOptions = uniqueDepartments.map((d) => ({ value: d, label: d }))
  const reportingRoleOptions = managerRoleOptions.map((role) => ({
    value: String(role.value || '').toLowerCase(),
    label: role.label,
  }))

  const handleChange = (field, value) => {
    onChange(field, value)
  }

  const assignedShifts = Array.isArray(form.assignedShifts) ? form.assignedShifts : ['morning']
  const primaryShiftOptions = SHIFT_OPTIONS.filter((option) => assignedShifts.includes(option.value))

  const toggleAssignedShift = (shiftId, checked) => {
    const id = normalizeShiftId(shiftId)
    const next = checked
      ? Array.from(new Set([...assignedShifts, id]))
      : assignedShifts.filter((value) => value !== id)
    const safeAssigned = next.length ? next : [id]
    handleChange('assignedShifts', safeAssigned)
    if (!safeAssigned.includes(form.primaryShift)) {
      handleChange('primaryShift', safeAssigned[0])
    }
  }

  const handleFlexibleChange = (checked) => {
    handleChange('flexibleShift', checked)
    if (!checked && assignedShifts.length) {
      handleChange('primaryShift', assignedShifts[0])
    }
  }

  return (
    <div className="space-y-6">
      <FormSectionCard
        icon={User}
        title="Personal information"
        description="Basic details about the employee"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Input
              label="Full name *"
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="Enter full name"
              required
            />
          </div>
          <div>
            <Input
              label="Join date"
              type="date"
              value={form.joinDate}
              onChange={(e) => handleChange('joinDate', e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Work email *"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="name@webfudge.in"
              icon={Mail}
              required
            />
          </div>
          <div>
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+91 98765 43210"
              icon={Phone}
            />
          </div>
          <div>
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="City or office"
              icon={MapPin}
            />
          </div>
        </div>
      </FormSectionCard>

      {showLoginSetup ? (
        <FormSectionCard
          icon={KeyRound}
          title="ESS portal access"
          description="Login credentials for the employee self-service portal"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Input
                label="Login password"
                type="password"
                value={form.initialPassword || ''}
                onChange={(e) => handleChange('initialPassword', e.target.value)}
                placeholder="Min 8 characters (optional)"
                icon={Lock}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Leave blank to auto-generate a temporary password. The employee signs in at ESS with their work email and this password.
              </p>
            </div>
            <div className="flex items-end pb-1">
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3.5 w-full">
                <Checkbox
                  checked={form.sendLoginEmail !== false}
                  onChange={(checked) => handleChange('sendLoginEmail', checked)}
                  label="Email login credentials to work email"
                />
              </div>
            </div>
          </div>
        </FormSectionCard>
      ) : null}

      <FormSectionCard
        icon={Briefcase}
        title="Employment details"
        description="Role, department, and reporting structure"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <Select
              label="Department *"
              value={form.department}
              onChange={(value) => handleChange('department', value)}
              options={departmentOptions}
              placeholder="Select department"
              icon={Building2}
            />
          </div>
          <div>
            <Input
              label="Designation *"
              value={form.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
              placeholder="e.g. Software Engineer"
              required
            />
          </div>
          <div>
            <Select
              label="Reporting manager"
              value={form.reportingRole}
              onChange={(value) => {
                handleChange('reportingRole', value)
                handleChange('manager', value === 'admin' ? 'Admin' : 'Manager')
              }}
              options={reportingRoleOptions}
              placeholder="Select reporting manager role"
            />
          </div>
          <div>
            <Select
              label="Employment type"
              value={form.employmentType}
              onChange={(value) => handleChange('employmentType', value)}
              options={EMPLOYMENT_TYPES}
            />
          </div>
          <div>
            <Select
              label="Salary structure"
              value={form.salaryStructureId || ''}
              onChange={(value) => handleChange('salaryStructureId', value)}
              options={salaryStructureOptions}
              placeholder="Select salary structure"
            />
          </div>
          <div>
            <Input
              label="Annual CTC (₹)"
              type="number"
              min="0"
              value={form.annualCtc || ''}
              onChange={(e) => handleChange('annualCtc', e.target.value)}
              placeholder="e.g. 1200000"
            />
          </div>
          <div>
            <Select
              label="Status"
              value={form.status}
              onChange={(value) => handleChange('status', value)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </FormSectionCard>

      <FormSectionCard
        icon={Clock}
        title="Work shift"
        description="Assign a fixed shift or allow the employee to pick from assigned shifts when marking attendance"
      >
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-sm font-medium text-gray-700">Assigned shifts *</p>
            <div className="flex flex-wrap gap-4">
              {SHIFT_OPTIONS.map((option) => (
                <Checkbox
                  key={option.value}
                  checked={assignedShifts.includes(option.value)}
                  onChange={(checked) => toggleAssignedShift(option.value, checked)}
                  label={option.label}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Select
              label={form.flexibleShift ? 'Default shift' : 'Fixed shift *'}
              value={form.primaryShift || assignedShifts[0] || 'morning'}
              onChange={(value) => handleChange('primaryShift', value)}
              options={primaryShiftOptions.length ? primaryShiftOptions : SHIFT_OPTIONS}
              allowEmpty={false}
            />
            <div className="flex items-end pb-1">
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3.5 w-full">
                <Checkbox
                  checked={Boolean(form.flexibleShift)}
                  onChange={handleFlexibleChange}
                  label="Allow flexible shift at attendance"
                />
                <p className="mt-2 text-xs text-gray-500">
                  When enabled, the employee chooses one of the assigned shifts each time they mark attendance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </FormSectionCard>

      <FormSectionCard
        icon={Landmark}
        title="Payroll and bank details"
        description="Required before a payroll run can be locked"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <Input
              label="Bank account number"
              value={form.bankAccountNumber || ''}
              onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
              placeholder="Account number"
            />
          </div>
          <div>
            <Input
              label="IFSC"
              value={form.bankIfsc || ''}
              onChange={(e) => handleChange('bankIfsc', e.target.value)}
              placeholder="IFSC code"
            />
          </div>
          <div>
            <Input
              label="Bank name"
              value={form.bankName || ''}
              onChange={(e) => handleChange('bankName', e.target.value)}
              placeholder="Bank name"
            />
          </div>
        </div>
      </FormSectionCard>
    </div>
  )
}

export function employeeToForm(employee) {
  if (!employee) {
    return {
      fullName: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      manager: '',
      reportingRole: 'manager',
      salaryStructureId: '',
      annualCtc: '',
      employmentType: 'Full-time',
      status: 'Probation',
      joinDate: '',
      location: '',
      bankAccountNumber: '',
      bankIfsc: '',
      bankName: '',
      initialPassword: '',
      sendLoginEmail: true,
      primaryShift: 'morning',
      assignedShifts: ['morning'],
      flexibleShift: false,
    }
  }

  return {
    fullName: employee.name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    department: employee.department || '',
    designation: employee.designation || '',
    manager: employee.reportingRole || String(employee.manager || 'manager').toLowerCase(),
    reportingRole: employee.reportingRole || 'manager',
    salaryStructureId: employee.salaryStructureId ? String(employee.salaryStructureId) : '',
    annualCtc: employee.annualCtc ? String(employee.annualCtc) : '',
    employmentType: employee.employmentType || 'Full-time',
    status: employee.status || 'Active',
    joinDate: employee.joinDate || '',
    location: employee.workLocation || employee.location || '',
    bankAccountNumber: employee.bankAccountNumber || '',
    bankIfsc: employee.bankIfsc || '',
    bankName: employee.bankName || '',
    primaryShift: employee.primaryShift || 'morning',
    assignedShifts: Array.isArray(employee.assignedShifts) ? employee.assignedShifts : ['morning'],
    flexibleShift: Boolean(employee.flexibleShift),
  }
}
