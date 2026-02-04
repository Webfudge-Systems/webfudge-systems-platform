'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@webfudge/auth';
import { Users, DollarSign, TrendingUp, Target, Loader2 } from 'lucide-react';
import { formatCurrency } from '@webfudge/utils';
import { KPICard } from '@webfudge/ui';
import CRMPageHeader from '../components/CRMPageHeader';
import dashboardService from '../lib/api/dashboardService';
import {
  SalesAnalyticsWidget,
  QuickActionsWidget,
  ActivityFeedWidget,
  DealsPipelineWidget,
} from '../components/dashboard';

const colorSchemes = ['orange', 'orange', 'orange', 'orange'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDate = () =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [statsRes] = await Promise.all([dashboardService.getStats()]);
        const data = statsRes?.data || {};
        const changes = data.changes || {};
        const formatChange = (c) => (c === 0 ? '0' : c > 0 ? `+${c}%` : `${c}%`);
        if (!cancelled) {
          setStats([
            {
              title: 'Total Leads',
              value: String(data.totalLeads ?? 0),
              change: formatChange(changes.leadsChange ?? 0),
              changeType: (changes.leadsChange ?? 0) >= 0 ? 'increase' : 'decrease',
              icon: Users,
            },
            {
              title: 'Pipeline Value',
              value: formatCurrency(data.pipelineValue ?? 0, { notation: 'compact' }),
              change: formatChange(changes.pipelineValueChange ?? 0),
              changeType: (changes.pipelineValueChange ?? 0) >= 0 ? 'increase' : 'decrease',
              icon: DollarSign,
            },
            {
              title: 'Conversion Rate',
              value: `${data.conversionRate ?? 0}%`,
              change: formatChange(changes.conversionRateChange ?? 0),
              changeType: (changes.conversionRateChange ?? 0) >= 0 ? 'increase' : 'decrease',
              icon: TrendingUp,
            },
            {
              title: 'Active Deals',
              value: String(data.activeDeals ?? 0),
              change: formatChange(changes.dealsChange ?? 0),
              changeType: (changes.dealsChange ?? 0) >= 0 ? 'increase' : 'decrease',
              icon: Target,
            },
          ]);
        }
      } catch (e) {
        if (!cancelled) setStats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const userName = user?.firstName || user?.name?.split?.(' ')[0] || 'User';

  return (
    <div className="p-4 space-y-4 bg-white min-h-full">
      <CRMPageHeader
        title="Dashboard"
        subtitle={`${getGreeting()}, ${userName} • ${getDate()}`}
        breadcrumb={[{ label: 'Dashboard', href: '/' }]}
        showSearch
        searchPlaceholder="Search anything..."
      />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="text-gray-600">Loading dashboard...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <KPICard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  change={stat.change}
                  changeType={stat.changeType}
                  icon={stat.icon}
                  colorScheme={colorSchemes[index] || colorSchemes[0]}
                />
              ))}
            </div>
          </div>

          {/* Enhanced Dashboard Sections */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Analytics & Pipeline */}
            <div className="xl:col-span-2 space-y-6">
              {/* Sales Analytics */}
              <SalesAnalyticsWidget />

              {/* Deals Pipeline */}
              <DealsPipelineWidget />
            </div>

            {/* Right Column - Actions & Activity */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <QuickActionsWidget />

              {/* Activity Feed */}
              <ActivityFeedWidget />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
