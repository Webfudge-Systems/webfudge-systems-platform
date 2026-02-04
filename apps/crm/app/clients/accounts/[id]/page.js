'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Edit, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import clientAccountService from '../../../../lib/api/clientAccountService';

export default function ClientAccountDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await clientAccountService.getOne(id);
        if (!cancelled && res?.data) setAccount(res.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const name = account?.companyName || account?.name || 'Client';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title={loading ? 'Loading...' : name}
        subtitle={account?.email}
        breadcrumb={[
          { label: 'Clients', href: '/clients' },
          { label: 'Accounts', href: '/clients/accounts' },
          { label: name, href: `/clients/accounts/${id}` },
        ]}
      >
        <div className="flex gap-2">
          <Link href={`/clients/accounts/${id}/edit`}>
            <Button variant="outline" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </Link>
          <Link href="/clients/accounts">
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </CRMPageHeader>

      {loading ? (
        <Card className="p-12 text-center text-gray-500">Loading...</Card>
      ) : !account ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600">Client account not found.</p>
          <Link href="/clients/accounts" className="mt-4 inline-block">
            <Button variant="primary">Back to client accounts</Button>
          </Link>
        </Card>
      ) : (
        <Card className="p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-brand-dark mb-4">Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Company name</dt>
              <dd className="font-medium">{account.companyName || account.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="font-medium">{account.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="font-medium">{account.phone || '—'}</dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}
