'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../../components/CRMPageHeader';
import contactService from '../../../../../lib/api/contactService';

export default function EditContactPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await contactService.getOne(id);
        if (!cancelled && res?.data) {
          const d = res.data;
          setForm({
            firstName: d.firstName ?? '',
            lastName: d.lastName ?? '',
            email: d.email ?? '',
            phone: d.phone ?? '',
            companyName: d.companyName ?? d.company ?? '',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await contactService.update(id, form);
      router.push(`/sales/contacts/${id}`);
    } catch (err) {
      setError(err?.message || 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Edit contact"
        subtitle={form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : ''}
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Contacts', href: '/sales/contacts' },
          { label: 'Edit', href: `/sales/contacts/${id}/edit` },
        ]}
      />

      <Card className="max-w-2xl p-6 border border-gray-200">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First name" name="firstName" value={form.firstName} onChange={handleChange} />
              <Input label="Last name" name="lastName" value={form.lastName} onChange={handleChange} />
            </div>
            <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
            <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
            <Input label="Company" name="companyName" value={form.companyName} onChange={handleChange} />
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              <Link href={`/sales/contacts/${id}`}>
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
