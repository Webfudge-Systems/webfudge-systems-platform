'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';
import {
  EmptyState,
  KPICard,
  LoadingSpinner,
  Table,
  TableCellCreated,
  TabsWithActions,
} from '@webfudge/ui';
import VLMPageHeader from '../../../components/VLMPageHeader';
import VLMModulePage from '../../../components/layout/VLMModulePage';
import VLMKpiRow from '../../../components/layout/VLMKpiRow';
import VLMDataTableCard from '../../../components/shared/VLMDataTableCard';
import { buildVlmBreadcrumb } from '../../../lib/pageHeader';
import { formatDate, vehicleLabel } from '../../../lib/vlmDisplay';
import { serviceRecordService } from '../../../lib/api';

export default function ServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await serviceRecordService.getAll({
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
    const uniqueVehicles = new Set(rows.map((r) => r?.vehicle?.id ?? r?.vehicle).filter(Boolean)).size;
    const withDate = rows.filter((r) => r?.serviceDate).length;
    return { total, uniqueVehicles, withDate };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const title = String(row?.title || '').toLowerCase();
      const vehicleName = vehicleLabel(row.vehicle).toLowerCase();
      return title.includes(q) || vehicleName.includes(q);
    });
  }, [rows, query]);

  const columns = [
    {
      key: 'title',
      label: 'SERVICE',
      render: (_, row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{row.title || '—'}</p>
          {row.description ? <p className="truncate text-xs text-gray-500">{row.description}</p> : null}
        </div>
      ),
    },
    {
      key: 'vehicle',
      label: 'VEHICLE',
      render: (_, row) => vehicleLabel(row.vehicle),
    },
    {
      key: 'serviceDate',
      label: 'SERVICE DATE',
      render: (_, row) => formatDate(row.serviceDate),
    },
    {
      key: 'createdAt',
      label: 'RECORDED',
      render: (_, row) => <TableCellCreated dateString={row.createdAt} />,
    },
  ];

  return (
    <VLMModulePage className="space-y-6">
      <VLMPageHeader
        title="Service"
        subtitle="Service history and maintenance records"
        breadcrumb={buildVlmBreadcrumb({ label: 'Service', href: '/vlm/service' })}
      />

      <VLMKpiRow columns={3}>
        <KPICard title="Total Records" value={stats.total} icon={Wrench} colorScheme="orange" />
        <KPICard title="Vehicles Serviced" value={stats.uniqueVehicles} icon={Wrench} colorScheme="orange" />
        <KPICard title="With Service Date" value={stats.withDate} icon={Wrench} colorScheme="orange" />
      </VLMKpiRow>

      <TabsWithActions
        tabs={[{ key: 'all', label: 'All', badge: String(stats.total) }]}
        activeTab="all"
        onTabChange={() => {}}
        showSearch
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by service title or vehicle…"
      />

      <VLMDataTableCard>
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <LoadingSpinner message="Loading service records…" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No service records found"
            description="Maintenance and service history for your fleet will appear here."
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
