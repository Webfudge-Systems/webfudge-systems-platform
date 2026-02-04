'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@webfudge/ui'
import dealService from '../../lib/api/dealService'
import { ArrowRight, Plus } from 'lucide-react'

export default function DealsPipelineWidget() {
  const router = useRouter()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeals()
  }, [])

  const fetchDeals = async () => {
    try {
      setLoading(true)
      const response = await dealService.getAll({ pageSize: 20 })
      setDeals(Array.isArray(response?.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching deals:', error)
      setDeals([])
    } finally {
      setLoading(false)
    }
  }

  const stages = [
    {
      key: 'discovery',
      label: 'Discovery',
      deals: deals.filter((d) => (d.stage || '').toLowerCase().includes('discovery')),
    },
    {
      key: 'proposal',
      label: 'Proposal',
      deals: deals.filter((d) => (d.stage || '').toLowerCase().includes('proposal')),
    },
    {
      key: 'negotiation',
      label: 'Negotiation',
      deals: deals.filter((d) => (d.stage || '').toLowerCase().includes('negotiation')),
    },
    {
      key: 'won',
      label: 'Won',
      deals: deals.filter((d) => (d.stage || '').toLowerCase().includes('won')),
    },
    {
      key: 'lost',
      label: 'Lost',
      deals: deals.filter((d) => (d.stage || '').toLowerCase().includes('lost')),
    },
  ]

  return (
    <Card className="p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Deals Pipeline</h2>
          <p className="text-sm text-gray-600">Track your deals through stages</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/sales/deals/pipeline')}
          className="text-sm text-brand-primary hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.key} className="min-w-[200px] flex-shrink-0">
              <div className="rounded-xl bg-white border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{stage.label}</h3>
                <div className="text-2xl font-black text-gray-800 mb-1">{stage.deals.length}</div>
                <p className="text-xs text-gray-500">deals</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
