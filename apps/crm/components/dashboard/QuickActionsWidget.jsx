'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@webfudge/ui'
import dealService from '../../lib/api/dealService'
import contactService from '../../lib/api/contactService'
import leadCompanyService from '../../lib/api/leadCompanyService'
import {
  Plus,
  Users,
  Building2,
  FileText,
  Target,
  Briefcase,
  TrendingUp,
  Loader2,
} from 'lucide-react'

export default function QuickActionsWidget() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    deals: 0,
    contacts: 0,
    companies: 0,
    reports: 0,
  })

  useEffect(() => {
    fetchCounts()
  }, [])

  const fetchCounts = async () => {
    try {
      setLoading(true)
      const [dealsRes, contactsRes, companiesRes] = await Promise.allSettled([
        dealService.getAll({ pageSize: 1 }),
        contactService.getAll({ pageSize: 1 }),
        leadCompanyService.getAll({ pageSize: 1 }),
      ])

      setCounts({
        deals:
          dealsRes.status === 'fulfilled'
            ? dealsRes.value?.meta?.pagination?.total || dealsRes.value?.data?.length || 0
            : 0,
        contacts:
          contactsRes.status === 'fulfilled'
            ? contactsRes.value?.meta?.pagination?.total || contactsRes.value?.data?.length || 0
            : 0,
        companies:
          companiesRes.status === 'fulfilled'
            ? companiesRes.value?.meta?.pagination?.total || companiesRes.value?.data?.length || 0
            : 0,
        reports: 0,
      })
    } catch (error) {
      console.error('Error fetching counts:', error)
    } finally {
      setLoading(false)
    }
  }

  const shortcuts = [
    {
      id: 'deals',
      title: 'All Deals',
      count: counts.deals,
      icon: Briefcase,
      action: () => router.push('/sales/deals'),
    },
    {
      id: 'contacts',
      title: 'Contacts',
      count: counts.contacts,
      icon: Users,
      action: () => router.push('/sales/contacts'),
    },
    {
      id: 'companies',
      title: 'Companies',
      count: counts.companies,
      icon: Building2,
      action: () => router.push('/sales/lead-companies'),
    },
    { id: 'reports', title: 'Reports', count: counts.reports, icon: TrendingUp, action: () => {} },
  ]

  return (
    <Card className="p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quick Access</h2>
          <p className="text-sm text-gray-600">Navigate to key sections</p>
        </div>
        <Target className="w-6 h-6 text-gray-400" />
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          {shortcuts.map((shortcut) => {
            const IconComponent = shortcut.icon
            return (
              <button
                key={shortcut.id}
                type="button"
                onClick={shortcut.action}
                className="rounded-2xl bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-xl border border-white/30 shadow-xl p-4 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group"
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-12 h-12 bg-orange-50 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-orange-200">
                    <IconComponent className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">{shortcut.title}</p>
                    {loading ? (
                      <div className="flex items-center justify-center mt-1">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-black text-gray-800 mt-1">
                          {typeof shortcut.count === 'number'
                            ? shortcut.count.toLocaleString()
                            : shortcut.count}
                        </p>
                        <div className="mt-1 flex items-center justify-center text-xs text-gray-500">
                          <span className="w-2 h-2 rounded-full mr-1 bg-orange-500"></span>
                          Total items
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates</h3>
        <div className="space-y-3">
          {[
            { name: 'Follow-up Email', type: 'Email Template' },
            { name: 'Demo Invitation', type: 'Meeting Template' },
          ].map((template, index) => (
            <button
              key={index}
              type="button"
              className="w-full rounded-2xl bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-xl border border-white/30 shadow-xl p-4 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-orange-200">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500">{template.type}</p>
                  </div>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-orange-600" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
