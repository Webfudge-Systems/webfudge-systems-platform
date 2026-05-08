'use client'

import { UsersRound } from 'lucide-react'
import AccountsModuleShell from '../../components/AccountsModuleShell'

export default function TeamsPage() {
  return (
    <AccountsModuleShell
      title="Teams"
      subtitle="Manage team structure, leads, members, and app access."
      breadcrumb={[{ label: 'Teams', href: '/teams' }]}
      icon={UsersRound}
      description="Teams module follows the same enterprise table/card composition used in CRM and PM."
    />
  )
}
