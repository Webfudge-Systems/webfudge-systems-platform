'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, LoadingSpinner, Modal } from '@webfudge/ui'
import HRPageHeader from '../../../../../components/layout/HRPageHeader'
import HRDetailHeaderActions from '../../../../../components/shared/HRDetailHeaderActions'
import { PayrollStructureOverviewPanel } from '../../../../../components/payroll/PayrollDetailTabPanels'
import { deleteSalaryStructure, getSalaryStructureById } from '../../../../../lib/payrollSyncService'

export default function SalaryStructureDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [structure, setStructure] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const row = await getSalaryStructureById(params.id)
        if (!cancelled) setStructure(row)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Loading..."
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payroll', href: '/payroll' }]}
          showProfile
        />
        <Card variant="elevated" className="flex justify-center rounded-xl p-12">
          <LoadingSpinner message="Loading structure..." />
        </Card>
      </div>
    )
  }

  if (!structure) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Structure Not Found"
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payroll', href: '/payroll' }]}
          showProfile
        />
        <Card variant="elevated" className="rounded-xl p-12">
          <EmptyState
            title="Salary structure not found"
            description="The structure may have been deleted or the link is incorrect."
            action={<Link href="/payroll" className="text-sm font-medium text-orange-600 hover:underline">Back to payroll</Link>}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <HRPageHeader
        title={structure.name}
        subtitle={`Annual CTC ${structure.ctc ? `₹${Number(structure.ctc).toLocaleString('en-IN')}` : '—'}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
          { label: 'Structures', href: '/payroll?tab=structures' },
          { label: structure.name, href: `/payroll/structures/${structure.id}` },
        ]}
        showProfile
      >
        <HRDetailHeaderActions
          actions={[
            {
              label: 'Edit',
              title: 'Edit structure',
              icon: Edit,
              onClick: () => router.push(`/payroll/structures/${structure.id}/edit`),
            },
            {
              label: 'Delete',
              title: 'Delete structure',
              icon: Trash2,
              variant: 'danger',
              onClick: () => setDeleteOpen(true),
            },
          ]}
        />
      </HRPageHeader>

      <PayrollStructureOverviewPanel structure={structure} />

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete structure" size="sm">
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold text-gray-900">{structure.name}</span>? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="!bg-red-600 hover:!bg-red-700"
            onClick={async () => {
              await deleteSalaryStructure(structure.id)
              setDeleteOpen(false)
              router.push('/payroll')
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
