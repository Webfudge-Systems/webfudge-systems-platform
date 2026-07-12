'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, CheckCircle2, MapPin, Truck } from 'lucide-react';
import {
  Button,
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
import { computeVehicleStats } from '../../../lib/vlmDisplay';
import { vehicleService } from '../../../lib/api';

export default function VehiclesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await vehicleService.getAll({
          sort: 'createdAt:desc',
          'pagination[pageSize]': 100,
          populate: ['organization', 'createdBy'],
        });
        if (!cancelled) setVehicles(Array.isArray(res?.data) ? res.data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => computeVehicleStats(vehicles), [vehicles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => {
      const status = String(v?.derivedStatus || 'UNKNOWN').toUpperCase();
      const matchesTab = activeTab === 'all' || status === activeTab;
      const matchesQuery =
        q === '' ||
        String(v?.name || '')
          .toLowerCase()
          .includes(q) ||
        String(v?.vin || '')
          .toLowerCase()
          .includes(q) ||
        String(v?.registrationNumber || '')
          .toLowerCase()
          .includes(q);
      return matchesTab && matchesQuery;
    });
  }, [vehicles, query, activeTab]);

  const tabs = [
    { key: 'all', label: 'All', badge: String(stats.total) },
    { key: 'ACTIVE', label: 'Active', badge: String(stats.active) },
    { key: 'INACTIVE', label: 'Inactive' },
    { key: 'ALLOCATED', label: 'Allocated', badge: String(stats.allocated) },
    { key: 'IN_TRANSIT', label: 'In Transit', badge: String(stats.inTransit) },
  ];

  const columns = [
    {
      key: 'name',
      label: 'VEHICLE',
      render: (_, row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{row.name || 'Untitled vehicle'}</p>
          {row.vin ? <p className="truncate text-xs text-gray-500">{row.vin}</p> : null}
        </div>
      ),
    },
    {
      key: 'registrationNumber',
      label: 'REGISTRATION',
      render: (_, row) => row.registrationNumber || '—',
    },
    {
      key: 'make',
      label: 'MAKE / MODEL',
      render: (_, row) => {
        const parts = [row.make, row.model].filter(Boolean);
        return parts.length ? parts.join(' ') : '—';
      },
    },
    {
      key: 'derivedStatus',
      label: 'STATUS',
      render: (_, row) => <TableCellStatusPill status={row.derivedStatus || 'INACTIVE'} />,
    },
    {
      key: 'createdAt',
      label: 'CREATED',
      render: (_, row) => <TableCellCreated dateString={row.createdAt} />,
    },
  ];

  return (
    <VLMModulePage className="space-y-6">
      <VLMPageHeader
        title="Vehicles"
        subtitle="Track the full vehicle lifecycle with event-derived status"
        breadcrumb={buildVlmBreadcrumb({ label: 'Vehicles', href: '/vlm/vehicles' })}
        showActions
        onAddClick={() => router.push('/vlm/vehicles/new')}
      />

      <VLMKpiRow>
        <KPICard title="Total Vehicles" value={stats.total} icon={Car} colorScheme="orange" />
        <KPICard title="Active" value={stats.active} icon={CheckCircle2} colorScheme="orange" />
        <KPICard title="Allocated" value={stats.allocated} icon={MapPin} colorScheme="orange" />
        <KPICard title="In Transit" value={stats.inTransit} icon={Truck} colorScheme="orange" />
      </VLMKpiRow>

      <TabsWithActions
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name, VIN, or registration…"
        onAddClick={() => router.push('/vlm/vehicles/new')}
      />

      <VLMDataTableCard>
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <LoadingSpinner message="Loading vehicles…" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No vehicles found"
            description={
              query || activeTab !== 'all'
                ? 'Try adjusting your search or filter to find vehicles.'
                : 'Add your first vehicle to start tracking its lifecycle.'
            }
            action={
              !query && activeTab === 'all' ? (
                <Button variant="primary" onClick={() => router.push('/vlm/vehicles/new')}>
                  Add Vehicle
                </Button>
              ) : null
            }
          />
        ) : (
          <Table
            columns={columns}
            data={filtered}
            keyField="id"
            variant="modern"
            onRowClick={(row) => router.push(`/vlm/vehicles/${row.id}`)}
          />
        )}
      </VLMDataTableCard>
    </VLMModulePage>
  );
}
