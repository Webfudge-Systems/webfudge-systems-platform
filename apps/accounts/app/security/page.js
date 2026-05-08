'use client'

import { Lock } from 'lucide-react'
import AccountsModuleShell from '../../components/AccountsModuleShell'

export default function SecurityPage() {
  return (
    <AccountsModuleShell
      title="Authentication & Security"
      subtitle="MFA policies, session controls, device history, and login access logs."
      breadcrumb={[{ label: 'Security', href: '/security' }]}
      icon={Lock}
      description="Security controls are ready for MFA enforcement, session revoke, and audit exports."
    />
  )
}
