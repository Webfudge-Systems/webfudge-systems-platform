'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Car, MapPin, ShieldCheck, Wrench } from 'lucide-react';
import { Card, DashboardInsightShell, KPICard, LoadingSpinner } from '@webfudge/ui';
import VLMPageHeader from '../../../components/VLMPageHeader';
import VLMModulePage from '../../../components/layout/VLMModulePage';
import VLMKpiRow from '../../../components/layout/VLMKpiRow';
import { buildVlmBreadcrumb } from '../../../lib/pageHeader';
import { reportService } from '../../../lib/api';

const QUICK_LINKS = [
  { label: 'Vehicles', href: '/vlm/vehicles', icon: Car, countKey: 'totalVehicles' },
  { label: 'Allocations', href: '/vlm/allocations', icon: MapPin, countKey: 'totalAllocations' },
  { label: 'Service Records', href: '/vlm/service', icon: Wrench, countKey: 'totalServiceRecords' },
  { label: 'Warranty Claims', href: '/vlm/warranty', icon: ShieldCheck, countKey: 'totalWarrantyRecords' },
];

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await reportService.getDashboardSummary();
        if (!cancelled) setSummary(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <VLMModulePage className="space-y-6">
      <VLMPageHeader
        title="Reports"
        subtitle="Lifecycle analytics and operational summaries"
        breadcrumb={buildVlmBreadcrumb({ label: 'Reports', href: '/vlm/reports' })}
      />

      {loading ? (
        <Card variant="elevated" className="p-10">
          <LoadingSpinner message="Loading report summary…" />
        </Card>
      ) : (
        <>
          <VLMKpiRow>
            <KPICard title="Total Vehicles" value={summary?.totalVehicles || 0} icon={Car} colorScheme="orange" />
            <KPICard title="Allocations" value={summary?.totalAllocations || 0} icon={MapPin} colorScheme="orange" />
            <KPICard
              title="Service Records"
              value={summary?.totalServiceRecords || 0}
              icon={Wrench}
              colorScheme="orange"
            />
            <KPICard
              title="Warranty Claims"
              value={summary?.totalWarrantyRecords || 0}
              icon={ShieldCheck}
              colorScheme="orange"
            />
          </VLMKpiRow>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              const count = summary?.[link.countKey] || 0;
              return (
                <DashboardInsightShell
                  key={link.href}
                  title={link.label}
                  action={
                    <button
                      type="button"
                      onClick={() => router.push(link.href)}
                      className="text-xs font-medium text-brand-primary hover:underline"
                    >
                      View all
                    </button>
                  }
                >
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-5 ring-1 ring-gray-100">
                    <div>
                      <p className="text-3xl font-bold tabular-nums text-gray-900">{count}</p>
                      <p className="mt-1 text-sm text-gray-500">Total records in {link.label.toLowerCase()}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 ring-1 ring-orange-100">
                      <Icon className="h-6 w-6 text-brand-primary" strokeWidth={2} />
                    </div>
                  </div>
                </DashboardInsightShell>
              );
            })}
          </div>

          <Card variant="elevated" className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 ring-1 ring-orange-100">
                <BarChart3 className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Fleet overview</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  VLM tracks vehicle lifecycle events — allocations, service, and warranty — with status derived
                  from the event timeline. Use the module pages above to drill into each area.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </VLMModulePage>
  );
}
