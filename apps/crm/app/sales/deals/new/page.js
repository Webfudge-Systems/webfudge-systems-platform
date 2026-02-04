'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, Select } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import dealService from '../../../../lib/api/dealService';

const stages = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export default function NewDealPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    value: '',
    stage: 'lead',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleStageChange = (value) => {
    setForm((prev) => ({ ...prev, stage: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, value: form.value ? Number(form.value) : null };
      await dealService.create(payload);
      router.push('/sales/deals');
    } catch (err) {
      setError(err?.message || 'Failed to create deal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="New deal"
        subtitle="Create an opportunity"
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Deals', href: '/sales/deals' },
          { label: 'New', href: '/sales/deals/new' },
        ]}
      />

      <Card className="max-w-2xl p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <Input
            label="Deal name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Acme Corp - Annual contract"
          />
          <Input
            label="Value (₹)"
            name="value"
            type="number"
            value={form.value}
            onChange={handleChange}
            placeholder="0"
          />
          <Select
            label="Stage"
            value={form.stage}
            onChange={handleStageChange}
            options={stages}
          />
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Create deal'}
            </Button>
            <Link href="/sales/deals">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
