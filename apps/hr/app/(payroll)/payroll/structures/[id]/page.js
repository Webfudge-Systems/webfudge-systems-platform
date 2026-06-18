'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit, Trash2 } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import HRPageHeader from '../../../../../components/layout/HRPageHeader'
import HRModulePage from '../../../../../components/layout/HRModulePage'
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
      <HRModulePage>
        <p className="text-gray-600">Loading structure...</p>
      </HRModulePage>
    )
  }

  if (!structure) {
    return (
      <HRModulePage>
        <p className="text-gray-600">Salary structure not found.</p>
        <Link href="/payroll" className="mt-2 inline-block text-sm text-orange-600 hover:underline">
          Back to payroll
        </Link>
      </HRModulePage>
    )
  }

  return (
    <HRModulePage>
      <HRPageHeader
        title={structure.name}
        subtitle={`Annual CTC ${structure.ctc ? `₹${Number(structure.ctc).toLocaleString('en-IN')}` : '—'}`}
        breadcrumb={[
          { label: 'Payroll', href: '/payroll' },
          { label: 'Structures', href: '/payroll?tab=structures' },
          { label: structure.name, href: `/payroll/structures/${structure.id}` },
        ]}
        showSearch={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/payroll/structures/${structure.id}/edit`)}
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="!text-red-600 hover:!bg-red-50"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

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
    </HRModulePage>
  )
}
