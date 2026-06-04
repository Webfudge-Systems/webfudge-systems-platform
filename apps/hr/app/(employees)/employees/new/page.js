'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Input,
  Select,
  FormSectionCard,
} from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import { DEPARTMENTS } from '../../../../lib/mock-data/employees'
import {
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Save,
  ArrowLeft,
  Building2,
} from 'lucide-react'

const SECTION_CLASS =
  'rounded-2xl bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-xl border border-white/30 shadow-xl p-6'

const EMPLOYMENT_TYPES = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' },
]

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Probation', label: 'Probation' },
]

export default function AddEmployeePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
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
  })

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      router.push('/employees')
    }, 600)
  }

  return (
    <div className="min-h-full space-y-6 p-4 md:p-6">
      <HRPageHeader
        title="Add New Employee"
        subtitle="Create a new employee record with employment details"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Employees', href: '/employees' },
          { label: 'Add New', href: '/employees/new' },
        ]}
        showSearch={false}
        showActions={false}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSectionCard
          icon={User}
          title="Personal information"
          description="Basic details about the employee"
          cardClassName={SECTION_CLASS}
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
          cardClassName={SECTION_CLASS}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Select
                label="Department *"
                value={form.department}
                onChange={(value) => handleChange('department', value)}
                options={[{ value: '', label: 'Select department' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]}
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

        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex min-w-[140px] items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Employee
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
