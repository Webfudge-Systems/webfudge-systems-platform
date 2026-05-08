'use client'

import { useEffect, useState } from 'react'
import { Building2, Save, Settings } from 'lucide-react'
import { Button, Input, LoadingSpinner } from '@webfudge/ui'
import AccountsPageHeader from '../../components/AccountsPageHeader'
import { organizationService } from '../../lib/api'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    companyEmail: '',
    companyPhone: '',
    website: '',
    industry: '',
    size: '',
  })

  useEffect(() => {
    let cancelled = false
    async function loadOrg() {
      try {
        setLoading(true)
        const response = await organizationService.getCurrent()
        const org = response?.data || response
        if (!cancelled && org) {
          setForm({
            name: org.name || '',
            companyEmail: org.companyEmail || '',
            companyPhone: org.companyPhone || '',
            website: org.website || '',
            industry: org.industry || '',
            size: org.size || '',
          })
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Unable to load organization settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadOrg()
    return () => {
      cancelled = true
    }
  }, [])

  const setField = (key, value) => {
    setMessage('')
    setError('')
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    try {
      setSaving(true)
      setMessage('')
      setError('')
      await organizationService.updateSettings(form)
      setMessage('Organization settings saved.')
    } catch (e) {
      setError(e?.message || 'Unable to save organization settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-white min-h-full">
      <AccountsPageHeader
        title="Organization Settings"
        subtitle="Workspace profile and app-level administration settings."
        breadcrumb={[{ label: 'Settings', href: '/settings' }]}
      />

      {loading ? (
        <div className="p-12 flex items-center justify-center rounded-xl border border-gray-200">
          <LoadingSpinner size="lg" message="Loading organization..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Workspace profile</h2>
                <p className="text-sm text-gray-500">These fields are shared across Accounts, PM, and CRM.</p>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Organization name</label>
                <Input value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Company email</label>
                <Input value={form.companyEmail} onChange={(e) => setField('companyEmail', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Company phone</label>
                <Input value={form.companyPhone} onChange={(e) => setField('companyPhone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Website</label>
                <Input value={form.website} onChange={(e) => setField('website', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Industry</label>
                <select
                  value={form.industry}
                  onChange={(e) => setField('industry', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select industry</option>
                  {['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'services', 'other'].map((value) => (
                    <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Company size</label>
                <select
                  value={form.size}
                  onChange={(e) => setField('size', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select size</option>
                  <option value="size_1_10">1-10</option>
                  <option value="size_11_50">11-50</option>
                  <option value="size_51_200">51-200</option>
                  <option value="size_201_500">201-500</option>
                  <option value="size_500_plus">500+</option>
                </select>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="text-sm">
                {message ? <span className="text-emerald-700">{message}</span> : null}
                {error ? <span className="text-red-600">{error}</span> : null}
              </div>
              <Button variant="primary" onClick={save} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save settings'}
              </Button>
            </div>
          </section>

          <aside className="rounded-xl border border-orange-100 bg-orange-50/60 p-5 h-fit">
            <div className="w-10 h-10 rounded-xl bg-white text-orange-600 flex items-center justify-center mb-3">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">RBAC protected</h3>
            <p className="text-sm text-gray-600">
              Saving settings requires manage access to CRM or PM settings. Members can still use allowed app modules
              without accessing this administration screen.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
