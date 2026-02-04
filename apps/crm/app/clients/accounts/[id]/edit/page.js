'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../../components/CRMPageHeader';
import clientAccountService from '../../../../../lib/api/clientAccountService';

export default function EditClientAccountPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ companyName: '', email: '', phone: '' });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await clientAccountService.getOne(id);
        if (!cancelled && res?.data) {
          const d = res.data;
          setForm({
            companyName: d.companyName ?? d.name ?? '',
            email: d.email ?? '',
            phone: d.phone ?? '',
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
      await clientAccountService.update(id, form);
      router.push(`/clients/accounts/${id}`);
    } catch (err) {
      setError(err?.message || 'Failed to update client account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Edit client account"
        subtitle={form.companyName}
        breadcrumb={[
          { label: 'Clients', href: '/clients' },
          { label: 'Accounts', href: '/clients/accounts' },
          { label: 'Edit', href: `/clients/accounts/${id}/edit` },
        ]}
      />
      <Card className="max-w-2xl p-6 border border-gray-200">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <Input label="Company name" name="companyName" value={form.companyName} onChange={handleChange} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
            <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              <Link href={`/clients/accounts/${id}`}>
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
