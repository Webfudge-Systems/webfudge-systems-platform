'use client'

import LeadsWorkspace from '../../components/LeadsWorkspace'

export default function LeadsPage() {
  return (
    <LeadsWorkspace
      showHeader
      showKpis
      title="Leads"
      subtitle="Sorted by score — hot leads at the top, always."
      breadcrumb={[
        { label: 'Dashboard', href: '/' },
        { label: 'Leads', href: '/leads' },
      ]}
    />
  )
}
