'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
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
import { warrantyService } from '../../../lib/api';

export default function WarrantyPage() {
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
        const res = await warrantyService.getAll({
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
    const open = rows.filter((r) => String(r?.claimStatus || 'OPEN').toUpperCase() === 'OPEN').length;
    const closed = rows.filter((r) => {
      const s = String(r?.claimStatus || '').toUpperCase();
      return s === 'CLOSED' || s === 'RESOLVED';
    }).length;
    return { total, open, closed };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const status = String(row?.claimStatus || 'OPEN').toUpperCase();
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'OPEN' && status === 'OPEN') ||
        (activeTab === 'CLOSED' && (status === 'CLOSED' || status === 'RESOLVED'));
      const provider = String(row?.provider || '').toLowerCase();
      const claim = String(row?.claimNumber || '').toLowerCase();
      const vehicleName = vehicleLabel(row.vehicle).toLowerCase();
      const matchesQuery = q === '' || provider.includes(q) || claim.includes(q) || vehicleName.includes(q);
      return matchesTab && matchesQuery;
    });
  }, [rows, query, activeTab]);

  const tabs = [
    { key: 'all', label: 'All', badge: String(stats.total) },
    { key: 'OPEN', label: 'Open', badge: String(stats.open) },
    { key: 'CLOSED', label: 'Closed', badge: String(stats.closed) },
  ];

  const columns = [
    {
      key: 'provider',
      label: 'PROVIDER',
      render: (_, row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{row.provider || '—'}</p>
          {row.claimNumber ? <p className="truncate text-xs text-gray-500">Claim #{row.claimNumber}</p> : null}
        </div>
      ),
    },
    {
      key: 'vehicle',
      label: 'VEHICLE',
      render: (_, row) => vehicleLabel(row.vehicle),
    },
    {
      key: 'claimStatus',
      label: 'STATUS',
      render: (_, row) => <TableCellStatusPill status={row.claimStatus || 'OPEN'} />,
    },
    {
      key: 'createdAt',
      label: 'FILED',
      render: (_, row) => <TableCellCreated dateString={row.createdAt} />,
    },
  ];

  return (
    <VLMModulePage className="space-y-6">
      <VLMPageHeader
        title="Warranty"
        subtitle="Warranty claims and provider records"
        breadcrumb={buildVlmBreadcrumb({ label: 'Warranty', href: '/vlm/warranty' })}
      />

      <VLMKpiRow columns={3}>
        <KPICard title="Total Claims" value={stats.total} icon={ShieldCheck} colorScheme="orange" />
        <KPICard title="Open Claims" value={stats.open} icon={ShieldCheck} colorScheme="orange" />
        <KPICard title="Closed Claims" value={stats.closed} icon={ShieldCheck} colorScheme="orange" />
      </VLMKpiRow>

      <TabsWithActions
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by provider, claim, or vehicle…"
      />

      <VLMDataTableCard>
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <LoadingSpinner message="Loading warranty records…" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No warranty records found"
            description="Warranty claims and provider records for your fleet will appear here."
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
