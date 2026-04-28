'use client'

import { useState, useEffect } from 'react'
import { Card } from '@webfudge/ui'
import { formatCurrency } from '@webfudge/utils'
import dealService from '../../lib/api/dealService'
import { TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react'

export default function SalesAnalyticsWidget() {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState({
    trends: {
      revenue: { value: 0, change: 0, isPositive: true },
      conversion: { value: 0, change: 0, isPositive: true },
    },
    conversionRate: 0,
    salesVelocity: 0,
  })

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const dealsResponse = await dealService.getAll({ pageSize: 1000 })
      const deals = Array.isArray(dealsResponse?.data) ? dealsResponse.data : []

      const totalDeals = deals.length
      const wonDeals = deals.filter((d) => d.stage === 'won' || d.stage === 'CLOSED_WON').length
      const totalValue = deals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0)

      const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0
      const avgDealSize = wonDeals > 0 ? totalValue / wonDeals : 0
      const salesVelocity = (wonDeals * avgDealSize) / 30

      setAnalyticsData({
        trends: {
          revenue: { value: totalValue, change: 0, isPositive: true },
          conversion: { value: conversionRate, change: 0, isPositive: true },
        },
        conversionRate,
        salesVelocity,
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sales Analytics</h2>
          <p className="text-sm text-gray-600">Performance insights and trends</p>
        </div>
        <BarChart3 className="w-6 h-6 text-gray-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-gradient-to-l from-brand-primary via-brand-primary/90 to-brand-primary/80 border border-orange-400/20 shadow-md p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-orange-50/90 mb-1 font-medium">Revenue</p>
              <p className="text-3xl font-black text-white">
                {formatCurrency(analyticsData.trends.revenue.value, { notation: 'compact' })}
              </p>
              <div className="mt-2 flex items-center text-xs text-orange-50/90">
                <span className="w-2 h-2 rounded-full mr-2 bg-emerald-300"></span>
                0% this month
              </div>
            </div>
            <DollarSign className="w-9 h-9 text-white/90 shrink-0" />
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-l from-brand-primary via-brand-primary/90 to-brand-primary/80 border border-orange-400/20 shadow-md p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-orange-50/90 mb-1 font-medium">Conversion</p>
              <p className="text-3xl font-black text-white">
                {analyticsData.conversionRate.toFixed(1)}%
              </p>
              <div className="mt-2 flex items-center text-xs text-orange-50/90">
                <span className="w-2 h-2 rounded-full mr-2 bg-emerald-300"></span>
                0% win rate
              </div>
            </div>
            <Target className="w-9 h-9 text-white/90 shrink-0" />
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-l from-brand-primary via-brand-primary/90 to-brand-primary/80 border border-orange-400/20 shadow-md p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-orange-50/90 mb-1 font-medium">Velocity</p>
              <p className="text-3xl font-black text-white">
                {formatCurrency(analyticsData.salesVelocity, { notation: 'compact' })}
              </p>
              <div className="mt-2 flex items-center text-xs text-orange-50/90">
                <span className="w-2 h-2 rounded-full mr-2 bg-orange-100"></span>
                Per day average
              </div>
            </div>
            <TrendingUp className="w-9 h-9 text-white/90 shrink-0" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="rounded-lg bg-white border border-gray-200 shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-lg h-48 flex items-center justify-center">
            <p className="text-sm text-gray-500">
              Chart will appear here when connected to backend
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white border border-gray-200 shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deals by Stage</h3>
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-md h-48 flex items-center justify-center">
            <p className="text-sm text-gray-500">
              Chart will appear here when connected to backend
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
