'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, LoadingSpinner, Table, TabsWithActions } from '@webfudge/ui';
import { Car } from 'lucide-react';
import VLMPageHeader from '../../../components/VLMPageHeader';
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
          .includes(q);
      return matchesTab && matchesQuery;
    });
  }, [vehicles, query, activeTab]);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'INACTIVE', label: 'Inactive' },
    { key: 'ALLOCATED', label: 'Allocated' },
    { key: 'IN_TRANSIT', label: 'In Transit' },
  ];

  const columns = [
    { key: 'name', label: 'NAME', render: (_, row) => row.name || 'Untitled vehicle' },
    { key: 'vin', label: 'VIN', render: (_, row) => row.vin || '—' },
    { key: 'registrationNumber', label: 'REGISTRATION', render: (_, row) => row.registrationNumber || '—' },
    { key: 'derivedStatus', label: 'STATUS', render: (_, row) => row.derivedStatus || 'UNKNOWN' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VLMPageHeader
        title="Vehicles"
        subtitle="Track the full vehicle lifecycle with event-derived status"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'VLM', href: '/vlm/vehicles' },
          { label: 'Vehicles', href: '/vlm/vehicles' },
        ]}
        showActions
        onAddClick={() => router.push('/vlm/vehicles/new')}
      />

      <TabsWithActions
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by vehicle name or VIN…"
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <LoadingSpinner message="Loading vehicles..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Car className="mx-auto mb-3 h-10 w-10 text-gray-400" />
            <p className="mb-4 text-sm text-gray-600">No vehicles found.</p>
            <Button variant="primary" onClick={() => router.push('/vlm/vehicles/new')}>
              Add Vehicle
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filtered}
            keyField="id"
            variant="modern"
            onRowClick={(row) => router.push(`/vlm/vehicles/${row.id}`)}
          />
        )}
      </div>
    </div>
  );
}

