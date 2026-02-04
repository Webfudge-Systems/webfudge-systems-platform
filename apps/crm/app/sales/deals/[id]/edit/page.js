'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, Select } from '@webfudge/ui';
import CRMPageHeader from '../../../../../components/CRMPageHeader';
import dealService from '../../../../../lib/api/dealService';

const stages = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export default function EditDealPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', value: '', stage: 'lead' });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await dealService.getOne(id);
        if (!cancelled && res?.data) {
          const d = res.data;
          setForm({
            name: d.name ?? '',
            value: d.value != null ? String(d.value) : '',
            stage: d.stage ?? 'lead',
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
      await dealService.update(id, payload);
      router.push(`/sales/deals/${id}`);
    } catch (err) {
      setError(err?.message || 'Failed to update deal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Edit deal"
        subtitle={form.name}
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Deals', href: '/sales/deals' },
          { label: 'Edit', href: `/sales/deals/${id}/edit` },
        ]}
      />

      <Card className="max-w-2xl p-6 border border-gray-200">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <Input label="Deal name" name="name" value={form.name} onChange={handleChange} />
            <Input label="Value (₹)" name="value" type="number" value={form.value} onChange={handleChange} />
            <Select label="Stage" value={form.stage} onChange={handleStageChange} options={stages} />
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              <Link href={`/sales/deals/${id}`}>
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
