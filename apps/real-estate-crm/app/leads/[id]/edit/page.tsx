'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button, FormSectionCard, Input, LoadingSpinner, Select } from '@webfudge/ui'
import { ArrowLeft, CheckCircle2, Save, Target, User } from 'lucide-react'
import { getLead, updateLead } from '../../../../lib/api/leadService'
import EstatePageHeader from '../../../../components/EstatePageHeader'
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '../../../../lib/types'

const STATUS_OPTIONS = LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))
const TIMELINE_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'three_to_six_months', label: '3–6 months' },
  { value: 'browsing', label: 'Browsing' },
]
const PURPOSE_OPTIONS = [
  { value: 'own_use', label: 'Own use' },
  { value: 'investment', label: 'Investment' },
]

const submitButtonClassName =
  'min-w-[160px] rounded-xl border-0 bg-gradient-to-r from-orange-500 to-pink-500 py-2.5 font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-60'

export default function EditLeadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    status: 'new',
    budgetRange: '',
    timeline: '',
    purpose: '',
    configInterest: '',
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getLead(id).then((lead) => {
      if (cancelled) return
      if (lead) {
        setForm({
          name: lead.name || '',
          phone: lead.phone || '',
          email: lead.email || '',
          status: lead.status || 'new',
          budgetRange: lead.budgetRange || '',
          timeline: lead.timeline || '',
          purpose: lead.purpose || '',
          configInterest: lead.configInterest || '',
        })
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    try {
      await updateLead(id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        status: form.status as any,
        budgetRange: form.budgetRange.trim(),
        timeline: (form.timeline || null) as any,
        purpose: (form.purpose || null) as any,
        configInterest: form.configInterest.trim(),
      })
      setShowSuccess(true)
      window.setTimeout(() => {
        router.push(`/leads/${id}`)
      }, 1000)
    } catch (err: any) {
      setError(err?.message || 'Failed to update lead.')
      setSaving(false)
    }
  }

  if (showSuccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Success!</h2>
          <p className="mb-4 text-gray-600">Lead updated successfully</p>
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-orange-500" />
          <p className="mt-2 text-sm text-gray-500">Redirecting…</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <form onSubmit={handleSubmit}>
        <EstatePageHeader
          title="Edit lead"
          subtitle={form.name || 'Update lead details and status.'}
          breadcrumb={[
            { label: 'Dashboard', href: '/' },
            { label: 'Leads', href: '/leads' },
            { label: 'Edit', href: `/leads/${id}/edit` },
          ]}
          onBack={() => router.push(`/leads/${id}`)}
        >
          <div className="flex items-center justify-end gap-3">
            <Link href={`/leads/${id}`}>
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-700"
              >
                <span className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Cancel
                </span>
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={saving} className={submitButtonClassName}>
              <span className="flex items-center justify-center gap-2">
                {!saving ? <Save className="h-4 w-4" /> : null}
                {saving ? 'Updating…' : 'Update lead'}
              </span>
            </Button>
          </div>
        </EstatePageHeader>

        <div className="mt-6 space-y-6">
          <FormSectionCard
            icon={User}
            title="Contact details"
            description="Name and how to reach this lead"
            cardClassName="rounded-xl p-6"
            iconContainerClassName="bg-brand-primary shadow-sm"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  label="Name *"
                  value={form.name}
                  onChange={(e: any) => set('name', e.target.value)}
                  placeholder="Lead name"
                  required
                />
              </div>
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e: any) => set('phone', e.target.value)}
                placeholder="Phone number"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e: any) => set('email', e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          </FormSectionCard>

          <FormSectionCard
            icon={Target}
            title="Requirement & status"
            description="Budget, intent, and pipeline stage"
            cardClassName="rounded-xl p-6"
            iconContainerClassName="bg-brand-primary shadow-sm"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="Budget"
                value={form.budgetRange}
                onChange={(e: any) => set('budgetRange', e.target.value)}
                placeholder="e.g. ₹80L – ₹1.2Cr"
              />
              <Input
                label="Configuration interest"
                value={form.configInterest}
                onChange={(e: any) => set('configInterest', e.target.value)}
                placeholder="e.g. 3 BHK"
              />
              <Select
                label="Timeline"
                value={form.timeline}
                onChange={(v: string) => set('timeline', v)}
                options={TIMELINE_OPTIONS}
                placeholder="Select timeline"
              />
              <Select
                label="Purpose"
                value={form.purpose}
                onChange={(v: string) => set('purpose', v)}
                options={PURPOSE_OPTIONS}
                placeholder="Select purpose"
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(v: string) => set('status', v)}
                options={STATUS_OPTIONS}
                placeholder="Select status"
              />
            </div>
          </FormSectionCard>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  )
}
