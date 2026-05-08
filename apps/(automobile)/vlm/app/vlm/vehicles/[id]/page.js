'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, LoadingSpinner, TabsWithActions } from '@webfudge/ui';
import VLMPageHeader from '../../../../components/VLMPageHeader';
import { allocationService, serviceRecordService, vehicleService, warrantyService } from '../../../../lib/api';
import VehicleEventsTimeline from '../../../../modules/vehicles/components/VehicleEventsTimeline';

export default function VehicleDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [services, setServices] = useState([]);
  const [warranties, setWarranties] = useState([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [vehicleRes, allocationRes, serviceRes, warrantyRes] = await Promise.all([
          vehicleService.getOneWithLifecycle(id),
          allocationService.getAll({ filters: { vehicle: { id: { $eq: Number(id) } } }, sort: 'createdAt:desc' }),
          serviceRecordService.getAll({ filters: { vehicle: { id: { $eq: Number(id) } } }, sort: 'createdAt:desc' }),
          warrantyService.getAll({ filters: { vehicle: { id: { $eq: Number(id) } } }, sort: 'createdAt:desc' }),
        ]);
        if (!cancelled) {
          setVehicle(vehicleRes?.data || null);
          setAllocations(allocationRes?.data || []);
          setServices(serviceRes?.data || []);
          setWarranties(warrantyRes?.data || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tabs = useMemo(
    () => [
      { key: 'overview', label: 'Overview' },
      { key: 'timeline', label: 'Timeline' },
      { key: 'allocations', label: 'Allocation History', badge: String(allocations.length) },
      { key: 'service', label: 'Service History', badge: String(services.length) },
      { key: 'warranty', label: 'Warranty', badge: String(warranties.length) },
    ],
    [allocations.length, services.length, warranties.length]
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VLMPageHeader
        title={vehicle?.name || 'Vehicle'}
        subtitle={`${vehicle?.vin || 'No VIN'} • ${vehicle?.derivedStatus || 'UNKNOWN'}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'VLM', href: '/vlm/vehicles' },
          { label: 'Vehicles', href: '/vlm/vehicles' },
          { label: vehicle?.name || 'Vehicle', href: `/vlm/vehicles/${id}` },
        ]}
      />

      {loading ? (
        <Card variant="elevated" className="p-10">
          <LoadingSpinner message="Loading vehicle..." />
        </Card>
      ) : (
        <>
          <TabsWithActions tabs={tabs} activeTab={tab} onTabChange={setTab} />

          {tab === 'overview' && (
            <Card variant="elevated" className="space-y-3 p-6">
              <p className="text-sm text-gray-500">Vehicle Name</p>
              <p className="text-xl font-semibold text-gray-900">{vehicle?.name || '—'}</p>
              <p className="text-sm text-gray-500">VIN: {vehicle?.vin || '—'}</p>
              <p className="text-sm text-gray-500">Registration: {vehicle?.registrationNumber || '—'}</p>
              <p className="text-sm text-gray-500">Current Status: {vehicle?.derivedStatus || 'UNKNOWN'}</p>
            </Card>
          )}

          {tab === 'timeline' && <VehicleEventsTimeline events={vehicle?.events || []} />}

          {tab === 'allocations' && (
            <Card variant="elevated" className="p-6">
              <p className="text-sm text-gray-600">Total allocations: {allocations.length}</p>
            </Card>
          )}

          {tab === 'service' && (
            <Card variant="elevated" className="p-6">
              <p className="text-sm text-gray-600">Total service records: {services.length}</p>
            </Card>
          )}

          {tab === 'warranty' && (
            <Card variant="elevated" className="p-6">
              <p className="text-sm text-gray-600">Total warranty records: {warranties.length}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

