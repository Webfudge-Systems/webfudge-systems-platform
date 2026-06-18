'use client'

import { Input, Select, FormSectionCard } from '@webfudge/ui'
import { User, Briefcase, Mail, Phone, MapPin, Building2, Landmark } from 'lucide-react'

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
  }
}
