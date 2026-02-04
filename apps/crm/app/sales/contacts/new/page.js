'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@webfudge/ui';
import CRMPageHeader from '../../../../components/CRMPageHeader';
import contactService from '../../../../lib/api/contactService';

export default function NewContactPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
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
      await contactService.create(form);
      router.push('/sales/contacts');
    } catch (err) {
      setError(err?.message || 'Failed to create contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="New contact"
        subtitle="Add a new contact"
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Contacts', href: '/sales/contacts' },
          { label: 'New', href: '/sales/contacts/new' },
        ]}
      />

      <Card className="max-w-2xl p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First name"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="First name"
            />
            <Input
              label="Last name"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Last name"
            />
          </div>
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="email@company.com"
          />
          <Input
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="+1 234 567 8900"
          />
          <Input
            label="Company"
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            placeholder="Company name"
          />
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Create contact'}
            </Button>
            <Link href="/sales/contacts">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
