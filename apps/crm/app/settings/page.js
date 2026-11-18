'use client';

import Link from 'next/link';
import { ChevronRight, GitBranch, Package, SlidersHorizontal, UserCheck } from 'lucide-react';
import { Card } from '@webfudge/ui';
import CRMPageHeader from '../../components/CRMPageHeader';

const SECTIONS = [
  {
    href: '/settings/pipelines',
    icon: GitBranch,
    title: 'Pipelines & lead statuses',
    description: 'Deal pipelines and their stages (order, win probability, colour, required fields) and your lead status list.',
  },
  {
    href: '/settings/custom-fields',
    icon: SlidersHorizontal,
    title: 'Custom fields',
    description: 'Extra fields on lead companies, contacts, client accounts and deals: text, numbers, ₹, dates, dropdowns, team members and more.',
  },
  {
    href: '/settings/assignment',
    icon: UserCheck,
    title: 'Lead assignment & SLA',
    description: 'Auto-assign new leads (round robin, fewest open leads, by city, state, pincode, source or industry) and set a first-contact time limit.',
  },
  {
    href: '/settings/products',
    icon: Package,
    title: 'Products & price books',
    description: 'Your catalogue with HSN/SAC and GST rates, plus price books, used to build quotes that convert to GST invoices.',
  },
];

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Settings"
        subtitle="Configure Grow for your organization"
        breadcrumb={[{ label: 'Settings', href: '/settings' }]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href} className="group block">
            <Card className="flex h-full items-start gap-4 border border-gray-200 p-5 transition-shadow group-hover:shadow-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50">
                <Icon className="h-5 w-5 text-orange-600" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-400 group-hover:text-orange-600" aria-hidden />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
