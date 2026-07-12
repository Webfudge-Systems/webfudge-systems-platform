'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import {
  EmptyState,
  KPICard,
  LoadingSpinner,
  Table,
  TableCellCreated,
  TableCellStatusPill,
  TabsWithActions,
} from '@webfudge/ui';
import VLMPageHeader from '../../../components/VLMPageHeader';
import VLMModulePage from '../../../components/layout/VLMModulePage';
import VLMKpiRow from '../../../components/layout/VLMKpiRow';
import VLMDataTableCard from '../../../components/shared/VLMDataTableCard';
import { buildVlmBreadcrumb } from '../../../lib/pageHeader';
import { vehicleLabel } from '../../../lib/vlmDisplay';
import { allocationService } from '../../../lib/api';

export default function AllocationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await allocationService.getAll({
          sort: 'createdAt:desc',
          'pagination[pageSize]': 100,
          populate: ['vehicle', 'createdBy'],
        });
        if (!cancelled) setRows(Array.isArray(res?.data) ? res.data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const allocated = rows.filter((r) => String(r?.status || '').toUpperCase() === 'ALLOCATED').length;
    const uniqueVehicles = new Set(rows.map((r) => r?.vehicle?.id ?? r?.vehicle).filter(Boolean)).size;
    return { total, allocated, uniqueVehicles };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const status = String(row?.status || 'ALLOCATED').toUpperCase();
      const matchesTab = activeTab === 'all' || status === activeTab;
      const vehicleName = vehicleLabel(row.vehicle).toLowerCase();
      const dealer = String(row?.dealerId || '').toLowerCase();
      const matchesQuery = q === '' || vehicleName.includes(q) || dealer.includes(q);
      return matchesTab && matchesQuery;
    });
  }, [rows, query, activeTab]);

  const tabs = [
    { key: 'all', label: 'All', badge: String(stats.total) },
    { key: 'ALLOCATED', label: 'Allocated', badge: String(stats.allocated) },
  ];

  const columns = [
    {
      key: 'vehicle',
      label: 'VEHICLE',
      render: (_, row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{vehicleLabel(row.vehicle)}</p>
        </div>
      ),
    },
    { key: 'dealerId', label: 'DEALER', render: (_, row) => row.dealerId || '—' },
    {
      key: 'status',
      label: 'STATUS',
      render: (_, row) => <TableCellStatusPill status={row.status || 'ALLOCATED'} />,
    },
    {
      key: 'createdAt',
      label: 'ALLOCATED',
      render: (_, row) => <TableCellCreated dateString={row.createdAt} />,
    },
  ];

  return (
    <VLMModulePage className="space-y-6">
      <VLMPageHeader
        title="Allocations"
        subtitle="Vehicle to dealer assignment history"
        breadcrumb={buildVlmBreadcrumb({ label: 'Allocations', href: '/vlm/allocations' })}
      />

      <VLMKpiRow columns={3}>
        <KPICard title="Total Allocations" value={stats.total} icon={MapPin} colorScheme="orange" />
        <KPICard title="Active Allocations" value={stats.allocated} icon={MapPin} colorScheme="orange" />
        <KPICard title="Vehicles Assigned" value={stats.uniqueVehicles} icon={MapPin} colorScheme="orange" />
      </VLMKpiRow>

      <TabsWithActions
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by vehicle or dealer…"
      />

      <VLMDataTableCard>
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <LoadingSpinner message="Loading allocations…" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No allocations found"
            description="Vehicle allocation records will appear here once vehicles are assigned to dealers."
          />
        ) : (
          <Table
            columns={columns}
            data={filtered}
            keyField="id"
            variant="modern"
            onRowClick={(row) => {
              const vehicleId = row?.vehicle?.id ?? row?.vehicle;
              if (vehicleId) router.push(`/vlm/vehicles/${vehicleId}`);
            }}
          />
        )}
      </VLMDataTableCard>
    </VLMModulePage>
  );
}
