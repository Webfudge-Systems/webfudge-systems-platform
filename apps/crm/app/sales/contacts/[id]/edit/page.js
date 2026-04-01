'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Card,
  Input,
  LoadingSpinner,
  Select,
  Textarea,
} from '@webfudge/ui';
import CRMPageHeader from '../../../../../components/CRMPageHeader';
import contactService from '../../../../../lib/api/contactService';
import leadCompanyService from '../../../../../lib/api/leadCompanyService';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Hash,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Save,
  User,
} from 'lucide-react';

export default function EditContactPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [contact, setContact] = useState(null);

  const [leadCompaniesLoading, setLeadCompaniesLoading] = useState(false);
  const [leadCompanies, setLeadCompanies] = useState([]);

  const statusOptions = useMemo(
    () => [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' },
      { value: 'LEAD', label: 'Lead' },
    ],
    []
  );

  const contactRoleOptions = useMemo(
    () => [
      { value: 'PRIMARY_CONTACT', label: 'Primary contact' },
      { value: 'DECISION_MAKER', label: 'Decision maker' },
      { value: 'INFLUENCER', label: 'Influencer' },
      { value: 'CONTACT', label: 'Contact' },
      { value: 'GATEKEEPER', label: 'Gatekeeper' },
    ],
    []
  );

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    birthDate: '',
    preferredContactMethod: '',
    source: 'OTHER',
    jobTitle: '',
    department: '',
    contactRole: 'PRIMARY_CONTACT',
    leadCompany: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    linkedinUrl: '',
    twitter: '',
    notes: '',
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
          setContact(d);
          const lcId = d.leadCompany && typeof d.leadCompany === 'object' ? d.leadCompany.id ?? d.leadCompany.documentId : d.leadCompany;
          setForm((prev) => ({
            ...prev,
            firstName: d.firstName ?? '',
            lastName: d.lastName ?? '',
            email: d.email ?? '',
            phone: d.phone ?? '',
            status: d.status ?? 'ACTIVE',
            birthDate: d.birthDate ?? '',
            jobTitle: d.jobTitle ?? '',
            department: d.department ?? '',
            contactRole: d.contactRole ?? 'PRIMARY_CONTACT',
            leadCompany: lcId != null ? String(lcId) : '',
            address: d.address ?? '',
            city: d.city ?? '',
            state: d.state ?? '',
            zipCode: d.zipCode ?? '',
            country: d.country ?? '',
            linkedinUrl: d.linkedIn ?? d.linkedinUrl ?? '',
            twitter: d.twitter ?? '',
            notes: d.notes ?? '',
          }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLeadCompaniesLoading(true);
      try {
        const res = await leadCompanyService.getAll({
          sort: 'createdAt:desc',
          'pagination[pageSize]': 200,
          populate: [],
        });
        const list = Array.isArray(res.data) ? res.data : [];
        if (cancelled) return;
        setLeadCompanies(list);
      } catch {
        if (cancelled) return;
        setLeadCompanies([]);
      } finally {
        if (!cancelled) setLeadCompaniesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const leadCompanyOptions = useMemo(() => {
    const arr = leadCompanies || [];
    return [
      { value: '', label: 'No lead company' },
      ...arr.map((lc) => ({
        value: String(lc.id ?? lc.documentId),
        label: lc.companyName || lc.name || `Lead company ${lc.id ?? ''}`.trim(),
      })),
    ].filter((o) => o.value !== 'undefined');
  }, [leadCompanies]);

  const setFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSaving(true);
    try {
      if (!form.firstName.trim()) {
        setSubmitError('First name is required');
        return;
      }
      if (!form.lastName.trim()) {
        setSubmitError('Last name is required');
        return;
      }
      if (!form.email.trim()) {
        setSubmitError('Email is required');
        return;
      }
      if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
        setSubmitError('Please enter a valid email address');
        return;
      }

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      };

      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.status) payload.status = form.status;
      if (form.birthDate) payload.birthDate = form.birthDate;
      if (form.jobTitle.trim()) payload.jobTitle = form.jobTitle.trim();
      if (form.department.trim()) payload.department = form.department.trim();

      if (form.contactRole) payload.contactRole = form.contactRole.trim();
      if (payload.contactRole) payload.isPrimaryContact = payload.contactRole === 'PRIMARY_CONTACT';

      if (form.leadCompany) payload.leadCompany = form.leadCompany;

      // Keep denormalized company fields in sync with the selected lead company.
      if (form.leadCompany) {
        const selectedLead = leadCompanies.find(
          (lc) => String(lc.id ?? lc.documentId) === String(form.leadCompany)
        );
        if (selectedLead) {
          if (selectedLead.companyName || selectedLead.name) {
            payload.companyName = (selectedLead.companyName || selectedLead.name || '').trim();
          }
          if (selectedLead.website) {
            payload.companyWebsite = selectedLead.website.trim();
          }
        }
      }

      if (form.address.trim()) payload.address = form.address.trim();
      if (form.city.trim()) payload.city = form.city.trim();
      if (form.state.trim()) payload.state = form.state.trim();
      if (form.zipCode.trim()) payload.zipCode = form.zipCode.trim();
      if (form.country.trim()) payload.country = form.country.trim();

      if (form.linkedinUrl.trim()) payload.linkedinUrl = form.linkedinUrl.trim();
      if (form.twitter.trim()) payload.twitter = form.twitter.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();

      const res = await contactService.update(id, payload);
      if (res?.data) setContact(res.data);
      setShowSuccess(true);
      window.setTimeout(() => {
        router.push(`/sales/contacts/${id}`);
      }, 1200);
    } catch (err) {
      setSubmitError(err?.message || 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  const headerUpdateButtonClassName =
    'min-w-[180px] rounded-xl border-0 bg-gradient-to-r from-orange-500 to-pink-500 py-2.5 font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-60';

  if (showSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Success!</h2>
          <p className="mb-4 text-gray-600">Contact updated successfully</p>
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-orange-500" />
          <p className="mt-2 text-sm text-gray-500">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <form onSubmit={handleSubmit}>
        <CRMPageHeader
          title="Edit Contact"
          subtitle={
            loading
              ? undefined
              : contact?.firstName || contact?.lastName
                ? `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim()
                : undefined
          }
          breadcrumb={[
            { label: 'Sales', href: '/sales' },
            { label: 'Contacts', href: '/sales/contacts' },
            { label: 'Edit', href: `/sales/contacts/${id}/edit` },
          ]}
          showSearch={false}
          showActions={false}
        >
          <div className="flex items-center justify-end gap-3">
            <Link href={`/sales/contacts/${id}`}>
              <Button type="button" variant="secondary" className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={saving || loading} className={headerUpdateButtonClassName}>
              {!saving ? <Save className="mr-2 h-4 w-4" /> : null}
              {saving ? 'Updating…' : 'Update Contact'}
            </Button>
          </div>
        </CRMPageHeader>

        {loading ? (
          <Card variant="elevated" className="mt-6 p-12 flex justify-center rounded-xl">
            <LoadingSpinner message="Loading contact..." />
          </Card>
        ) : (
          <div className="mt-6 space-y-6">
            {submitError ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                {submitError}
              </p>
            ) : null}

            <Card className="rounded-xl p-6" variant="elevated">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary shadow-sm">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                  <p className="text-sm text-gray-500">Personal and status details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  label="First Name *"
                  value={form.firstName}
                  onChange={(e) => setFormField('firstName', e.target.value)}
                  required
                />
                <Input
                  label="Last Name *"
                  value={form.lastName}
                  onChange={(e) => setFormField('lastName', e.target.value)}
                  required
                />
                <Input
                  label="Email *"
                  type="email"
                  value={form.email}
                  onChange={(e) => setFormField('email', e.target.value)}
                  required
                  icon={Mail}
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setFormField('phone', e.target.value)}
                  icon={Phone}
                />
                <Input
                  label="Birth date"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setFormField('birthDate', e.target.value)}
                  icon={Calendar}
                />
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(v) => setFormField('status', v)}
                  options={statusOptions}
                  placeholder="Select status"
                />
              </div>
            </Card>

            <Card className="rounded-xl p-6" variant="elevated">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary shadow-sm">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Professional Information</h2>
                  <p className="text-sm text-gray-500">Work and role details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input label="Job Title" value={form.jobTitle} onChange={(e) => setFormField('jobTitle', e.target.value)} />
                <Input
                  label="Department"
                  value={form.department}
                  onChange={(e) => setFormField('department', e.target.value)}
                />
                <Select
                  label="Primary Contact"
                  value={form.contactRole}
                  onChange={(v) => setFormField('contactRole', v)}
                  options={contactRoleOptions}
                  placeholder="Select role"
                />
              </div>
            </Card>

            <Card className="rounded-xl p-6" variant="elevated">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary shadow-sm">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Company Association</h2>
                  <p className="text-sm text-gray-500">Lead company linked to this contact</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Select
                  label="Lead Company"
                  value={form.leadCompany}
                  onChange={(v) => setFormField('leadCompany', v)}
                  options={leadCompanyOptions}
                  placeholder="Select lead company"
                  disabled={leadCompaniesLoading}
                />
                <Select
                  label="Client Account"
                  value=""
                  onChange={() => {}}
                  options={[{ value: '', label: '— No client account linked —' }]}
                  disabled
                />
              </div>
            </Card>

            <Card className="rounded-xl p-6" variant="elevated">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary shadow-sm">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Address Information</h2>
                  <p className="text-sm text-gray-500">Primary location on file</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    value={form.address}
                    onChange={(e) => setFormField('address', e.target.value)}
                    placeholder="Munibai, Maharashtra, India"
                    icon={MapPin}
                  />
                </div>
                <Input label="City" value={form.city} onChange={(e) => setFormField('city', e.target.value)} />
                <Input
                  label="State / Province"
                  value={form.state}
                  onChange={(e) => setFormField('state', e.target.value)}
                />
                <Input label="Country" value={form.country} onChange={(e) => setFormField('country', e.target.value)} />
                <Input label="ZIP / Postal code" value={form.zipCode} onChange={(e) => setFormField('zipCode', e.target.value)} />
              </div>
            </Card>

            <Card className="rounded-xl p-6" variant="elevated">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary shadow-sm">
                  <Hash className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Social & Additional Information</h2>
                  <p className="text-sm text-gray-500">Links and notes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  label="LinkedIn"
                  value={form.linkedinUrl}
                  onChange={(e) => setFormField('linkedinUrl', e.target.value)}
                  placeholder="https://www.linkedin.com/in/…"
                  icon={Linkedin}
                />
                <Input
                  label="Twitter / X"
                  value={form.twitter}
                  onChange={(e) => setFormField('twitter', e.target.value)}
                  placeholder="https://twitter.com/…"
                />
                <div className="md:col-span-2">
                  <Textarea
                    label="Notes"
                    value={form.notes}
                    onChange={(e) => setFormField('notes', e.target.value)}
                    placeholder="Additional notes about this contact…"
                    rows={4}
                  />
                </div>
              </div>
            </Card>
            <div className="flex flex-col-reverse items-center justify-end gap-3 pt-2 md:flex-row md:gap-3">
              <Link href={`/sales/contacts/${id}`} className="w-full md:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full md:w-auto rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-700"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={saving || loading} className={headerUpdateButtonClassName}>
                {!saving ? <Save className="mr-2 h-4 w-4" /> : null}
                {saving ? 'Updating…' : 'Update Contact'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
