'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Edit, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import dealService from '../../../../lib/api/dealService';

export default function DealDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await dealService.getOne(id);
        if (!cancelled && res?.data) setDeal(res.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const name = deal?.name || 'Deal';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title={loading ? 'Loading...' : name}
        subtitle={deal?.value != null ? `₹${Number(deal.value).toLocaleString()}` : ''}
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Deals', href: '/sales/deals' },
          { label: name, href: `/sales/deals/${id}` },
        ]}
      >
        <div className="flex gap-2">
          <Link href={`/sales/deals/${id}/edit`}>
            <Button variant="outline" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </Link>
          <Link href="/sales/deals">
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </CRMPageHeader>

      {loading ? (
        <Card className="p-12 text-center text-gray-500">Loading...</Card>
      ) : !deal ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600">Deal not found.</p>
          <Link href="/sales/deals" className="mt-4 inline-block">
            <Button variant="primary">Back to deals</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-brand-dark mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Name</dt>
                <dd className="font-medium">{deal.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Value</dt>
                <dd className="font-medium">
                  {deal.value != null ? `₹${Number(deal.value).toLocaleString()}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Stage</dt>
                <dd className="font-medium">{deal.stage || '—'}</dd>
              </div>
            </dl>
          </Card>
          <Card className="p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-brand-dark mb-4">Activity</h2>
            <p className="text-gray-500 text-sm">Activity and notes will appear here when connected to your backend.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
