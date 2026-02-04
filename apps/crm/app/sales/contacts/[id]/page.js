'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import contactService from '../../../../lib/api/contactService';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await contactService.getOne(id);
        if (!cancelled && res?.data) setContact(res.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const name = contact?.firstName && contact?.lastName
    ? `${contact.firstName} ${contact.lastName}`
    : contact?.name || 'Contact';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title={loading ? 'Loading...' : name}
        subtitle={contact?.email}
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Contacts', href: '/sales/contacts' },
          { label: name, href: `/sales/contacts/${id}` },
        ]}
      >
        <div className="flex gap-2">
          <Link href={`/sales/contacts/${id}/edit`}>
            <Button variant="outline" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </Link>
          <Link href="/sales/contacts">
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </CRMPageHeader>

      {loading ? (
        <Card className="p-12 text-center text-gray-500">Loading...</Card>
      ) : !contact ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600">Contact not found.</p>
          <Link href="/sales/contacts" className="mt-4 inline-block">
            <Button variant="primary">Back to contacts</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-brand-dark mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Name</dt>
                <dd className="font-medium">{name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="font-medium">{contact.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="font-medium">{contact.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Company</dt>
                <dd className="font-medium">{contact.companyName || contact.company || '—'}</dd>
              </div>
            </dl>
          </Card>
          <Card className="p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-brand-dark mb-4">Activity</h2>
            <p className="text-gray-500 text-sm">Activity timeline will appear here when connected to your backend.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
