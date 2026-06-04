'use client'

import { useState } from 'react'
import { Input, Select } from '@webfudge/ui'
import { Mail, Phone, MapPin, Building2 } from 'lucide-react'
import { DEPARTMENTS } from '../../lib/mock-data/employees'
import { HRQuickForm, HRQuickFormSection, HRQuickFormDivider } from './HRQuickFormFields'

const EMPLOYMENT_TYPES = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' },
]

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Probation', label: 'Probation' },
]

const EMPTY = {
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

export default function AddEmployeeQuickForm({ onSuccess }) {
  const [form, setForm] = useState(EMPTY)

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSuccess?.(form)
    setForm(EMPTY)
  }

  return (
    <HRQuickForm onSubmit={handleSubmit}>
      <HRQuickFormSection title="Personal" description="Basic contact details">
        <Input
          label="Full name *"
          value={form.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          placeholder="Enter full name"
          required
        />
        <Input
          label="Work email *"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="name@webfudge.in"
          icon={Mail}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            icon={Phone}
          />
          <Input
            label="Join date"
            type="date"
            value={form.joinDate}
            onChange={(e) => set('joinDate', e.target.value)}
          />
        </div>
        <Input
          label="Location"
          value={form.location}
          onChange={(e) => set('location', e.target.value)}
          icon={MapPin}
        />
      </HRQuickFormSection>

      <HRQuickFormDivider />

      <HRQuickFormSection title="Employment" description="Role and department">
        <Select
          label="Department *"
          value={form.department}
          onChange={(value) => set('department', value)}
          options={[{ value: '', label: 'Select department' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]}
          icon={Building2}
        />
        <Input
          label="Designation *"
          value={form.designation}
          onChange={(e) => set('designation', e.target.value)}
          placeholder="e.g. Software Engineer"
          required
        />
        <Input
          label="Reporting manager"
          value={form.manager}
          onChange={(e) => set('manager', e.target.value)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Employment type"
            value={form.employmentType}
            onChange={(value) => set('employmentType', value)}
            options={EMPLOYMENT_TYPES}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(value) => set('status', value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </HRQuickFormSection>
    </HRQuickForm>
  )
}
