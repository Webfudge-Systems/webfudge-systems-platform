'use client'

import { Input, Select, FormSectionCard } from '@webfudge/ui'
import { DEPARTMENTS } from '../../lib/mock-data/employees'
import { User, Briefcase, Mail, Phone, MapPin, Building2 } from 'lucide-react'

const EMPLOYMENT_TYPES = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' },
]

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Probation', label: 'Probation' },
  { value: 'On Notice', label: 'On Notice' },
  { value: 'Exited', label: 'Exited' },
]

export default function EmployeeForm({ form, onChange }) {
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
              options={[
                { value: '', label: 'Select department' },
                ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
              ]}
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
            <Input
              label="Reporting manager"
              value={form.manager}
              onChange={(e) => handleChange('manager', e.target.value)}
              placeholder="Manager name"
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
              label="Status"
              value={form.status}
              onChange={(value) => handleChange('status', value)}
              options={STATUS_OPTIONS}
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
      employmentType: 'Full-time',
      status: 'Probation',
      joinDate: '',
      location: '',
    }
  }

  return {
    fullName: employee.name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    department: employee.department || '',
    designation: employee.designation || '',
    manager: employee.manager || '',
    employmentType: employee.employmentType || 'Full-time',
    status: employee.status || 'Active',
    joinDate: employee.joinDate || '',
    location: employee.workLocation || employee.location || '',
  }
}
