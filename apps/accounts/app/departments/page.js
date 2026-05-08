'use client'

import { Building2 } from 'lucide-react'
import AccountsModuleShell from '../../components/AccountsModuleShell'

export default function DepartmentsPage() {
  return (
    <AccountsModuleShell
      title="Departments"
      subtitle="Manage department hierarchy, leads, and user mapping."
      breadcrumb={[{ label: 'Departments', href: '/departments' }]}
      icon={Building2}
      description="Department CRUD and analytics views are scaffolded using shared workspace patterns."
    />
  )
}
