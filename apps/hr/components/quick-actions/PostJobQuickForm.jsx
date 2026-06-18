'use client'

import { useState } from 'react'
import { Input, Select, Textarea } from '@webfudge/ui'
import { DEPARTMENTS } from '../../lib/mock-data/employees'
import { MapPin, Building2 } from 'lucide-react'
import { HRQuickForm, HRQuickFormSection } from './HRQuickFormFields'

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'Paused', label: 'Paused' },
]

const EMPTY = {
  title: '',
  department: '',
  location: '',
  status: 'Open',
  description: '',
}

export default function PostJobQuickForm({ onSuccess }) {
  const [form, setForm] = useState(EMPTY)

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSuccess?.(form)
    setForm(EMPTY)
  }

  return (
    <HRQuickForm onSubmit={handleSubmit}>
      <HRQuickFormSection title="Job details" description="Role appears on recruitment pipeline">
        <Input
          label="Job title *"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Senior React Developer"
          required
        />
        <Select
          label="Department *"
          value={form.department}
          onChange={(value) => set('department', value)}
          options={[{ value: '', label: 'Select department' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]}
          icon={Building2}
        />
        <Input
          label="Location *"
          value={form.location}
          onChange={(e) => set('location', e.target.value)}
          placeholder="Bangalore, Mumbai, Remote"
          icon={MapPin}
          required
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(value) => set('status', value)}
          options={STATUS_OPTIONS}
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Role summary and requirements"
          rows={4}
        />
      </HRQuickFormSection>
    </HRQuickForm>
  )
}
