'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import clientAccountService from '../../../../lib/api/clientAccountService';

export default function NewClientAccountPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ companyName: '', email: '', phone: '' });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await clientAccountService.create(form);
      router.push('/clients/accounts');
    } catch (err) {
      setError(err?.message || 'Failed to create client account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="New client account"
        subtitle="Add a client"
        breadcrumb={[
          { label: 'Clients', href: '/clients' },
          { label: 'Accounts', href: '/clients/accounts' },
          { label: 'New', href: '/clients/accounts/new' },
        ]}
      />
      <Card className="max-w-2xl p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <Input label="Company name" name="companyName" value={form.companyName} onChange={handleChange} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
          <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Create client account'}
            </Button>
            <Link href="/clients/accounts">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
