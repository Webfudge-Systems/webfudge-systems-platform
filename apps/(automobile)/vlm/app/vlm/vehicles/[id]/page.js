'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Car, MapPin, ShieldCheck, Wrench } from 'lucide-react';
import {
  Card,
  InfoRow,
  InfoSection,
  KPICard,
  LoadingSpinner,
  Table,
  TableCellCreated,
  TableCellStatusPill,
  TabsWithActions,
} from '@webfudge/ui';
import VLMPageHeader from '../../../../components/VLMPageHeader';
import VLMModulePage from '../../../../components/layout/VLMModulePage';
import VLMKpiRow from '../../../../components/layout/VLMKpiRow';
import VLMDataTableCard from '../../../../components/shared/VLMDataTableCard';
import { buildVlmBreadcrumb } from '../../../../lib/pageHeader';
import { formatDate } from '../../../../lib/vlmDisplay';
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
          allocationService.getAll({
            filters: { vehicle: { id: { $eq: Number(id) } } },
            sort: 'createdAt:desc',
            populate: ['vehicle', 'createdBy'],
          }),
          serviceRecordService.getAll({
            filters: { vehicle: { id: { $eq: Number(id) } } },
            sort: 'createdAt:desc',
            populate: ['vehicle', 'createdBy'],
          }),
          warrantyService.getAll({
            filters: { vehicle: { id: { $eq: Number(id) } } },
            sort: 'createdAt:desc',
            populate: ['vehicle', 'createdBy'],
          }),
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
      { key: 'timeline', label: 'Timeline', badge: String(vehicle?.events?.length || 0) },
      { key: 'allocations', label: 'Allocations', badge: String(allocations.length) },
      { key: 'service', label: 'Service', badge: String(services.length) },
      { key: 'warranty', label: 'Warranty', badge: String(warranties.length) },
    ],
    [allocations.length, services.length, warranties.length, vehicle?.events?.length]
  );

  const allocationColumns = [
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

  const serviceColumns = [
    { key: 'title', label: 'SERVICE', render: (_, row) => row.title || '—' },
    {
      key: 'serviceDate',
      label: 'DATE',
      render: (_, row) => formatDate(row.serviceDate),
    },
    {
      key: 'createdAt',
      label: 'RECORDED',
      render: (_, row) => <TableCellCreated dateString={row.createdAt} />,
    },
  ];

  const warrantyColumns = [
    { key: 'provider', label: 'PROVIDER', render: (_, row) => row.provider || '—' },
    { key: 'claimNumber', label: 'CLAIM #', render: (_, row) => row.claimNumber || '—' },
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
        title={vehicle?.name || 'Vehicle'}
        subtitle={[vehicle?.vin, vehicle?.derivedStatus].filter(Boolean).join(' • ') || 'Loading vehicle details…'}
        breadcrumb={buildVlmBreadcrumb(
          { label: 'Vehicles', href: '/vlm/vehicles' },
          { label: vehicle?.name || 'Vehicle', href: `/vlm/vehicles/${id}` }
        )}
      />

      {loading ? (
        <Card variant="elevated" className="p-10">
          <LoadingSpinner message="Loading vehicle…" />
        </Card>
      ) : (
        <>
          <VLMKpiRow>
            <KPICard
              title="Status"
              value={(vehicle?.derivedStatus || 'UNKNOWN').replace(/_/g, ' ')}
              icon={Car}
              colorScheme="orange"
            />
            <KPICard title="Allocations" value={allocations.length} icon={MapPin} colorScheme="orange" />
            <KPICard title="Service Records" value={services.length} icon={Wrench} colorScheme="orange" />
            <KPICard title="Warranty Claims" value={warranties.length} icon={ShieldCheck} colorScheme="orange" />
          </VLMKpiRow>

          <TabsWithActions tabs={tabs} activeTab={tab} onTabChange={setTab} />

          {tab === 'overview' && (
            <Card variant="elevated" className="p-6">
              <InfoSection title="Vehicle Details" icon={Car} isFirst>
                <div className="grid gap-6 sm:grid-cols-2">
                  <InfoRow label="Vehicle Name" value={vehicle?.name} emphasize />
                  <InfoRow label="Current Status" value={vehicle?.derivedStatus?.replace(/_/g, ' ')} />
                  <InfoRow label="VIN" value={vehicle?.vin} />
                  <InfoRow label="Registration" value={vehicle?.registrationNumber} />
                  <InfoRow label="Make" value={vehicle?.make} />
                  <InfoRow label="Model" value={vehicle?.model} />
                  <InfoRow label="Year" value={vehicle?.year} />
                  <InfoRow label="Created" value={formatDate(vehicle?.createdAt)} />
                </div>
              </InfoSection>
            </Card>
          )}

          {tab === 'timeline' && <VehicleEventsTimeline events={vehicle?.events || []} />}

          {tab === 'allocations' && (
            <VLMDataTableCard>
              {allocations.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">No allocation records for this vehicle.</p>
              ) : (
                <Table columns={allocationColumns} data={allocations} keyField="id" variant="modern" />
              )}
            </VLMDataTableCard>
          )}

          {tab === 'service' && (
            <VLMDataTableCard>
              {services.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">No service records for this vehicle.</p>
              ) : (
                <Table columns={serviceColumns} data={services} keyField="id" variant="modern" />
              )}
            </VLMDataTableCard>
          )}

          {tab === 'warranty' && (
            <VLMDataTableCard>
              {warranties.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">No warranty records for this vehicle.</p>
              ) : (
                <Table columns={warrantyColumns} data={warranties} keyField="id" variant="modern" />
              )}
            </VLMDataTableCard>
          )}
        </>
      )}
    </VLMModulePage>
  );
}
