'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import leadCompanyService from '../../../../lib/api/leadCompanyService';

export default function NewLeadCompanyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await leadCompanyService.create(form);
      router.push('/sales/lead-companies');
    } catch (err) {
      setError(err?.message || 'Failed to create lead company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="New lead company"
        subtitle="Add a lead company"
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Lead companies', href: '/sales/lead-companies' },
          { label: 'New', href: '/sales/lead-companies/new' },
        ]}
      />
      <Card className="max-w-2xl p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <Input label="Company name" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Company name" />
          <Input label="Contact name" name="contactName" value={form.contactName} onChange={handleChange} placeholder="Contact name" />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@company.com" />
          <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Create lead company'}
            </Button>
            <Link href="/sales/lead-companies">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
