'use client';

import Link from 'next/link';
import { Bell, ChevronRight, ExternalLink, GitBranch, Inbox, ListChecks, Megaphone, MessageSquare, Package, ShieldCheck, SlidersHorizontal, UserCheck } from 'lucide-react';
import { Card, IS_SAAS_PLATFORM } from '@webfudge/ui';
import { getAppUrl } from '@webfudge/utils';
import CRMPageHeader from '../../components/CRMPageHeader';

const SECTIONS = [
  {
    href: '/settings/pipelines',
    icon: GitBranch,
    title: 'Pipelines & lead statuses',
    description: 'Deal pipelines and their stages (order, win probability, colour, required fields) and your lead status list.',
  },
  {
    href: '/settings/picklists',
    icon: ListChecks,
    title: 'Industries, lead sources & lost reasons',
    description: 'Add your own industries and set the lead sources and deal lost reasons your team picks from.',
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
  // Meta Lead Ads capture (G6) is SaaS-only.
  ...(IS_SAAS_PLATFORM
    ? [
        {
          href: '/settings/meta-lead-ads',
          icon: Megaphone,
          title: 'Meta Lead Ads',
          description: 'Connect your Facebook Page and bring leads from Facebook and Instagram lead forms into Grow automatically.',
        },
      ]
    : []),
  // G7: lead capture connectors (SaaS only).
  ...(IS_SAAS_PLATFORM
    ? [
        {
          href: '/settings/lead-sources',
          icon: Inbox,
          title: 'Lead sources',
          description: 'Capture leads automatically from your website form, Google Ads, IndiaMART, JustDial, 99acres and MagicBricks, with a log of every lead received.',
        },
      ]
    : []),
  {
    href: '/settings/products',
    icon: Package,
    title: 'Products & price books',
    description: 'Your catalogue with HSN/SAC and GST rates, plus price books, used to build quotes that convert to GST invoices.',
  },
  {
    href: '/settings/notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'Choose which in-app notifications your team gets: leads, deals, tasks, comments, mentions, SLA alerts.',
  },
  {
    href: `${getAppUrl('accounts')}/roles`,
    external: true,
    icon: ShieldCheck,
    title: 'Users, roles & permissions',
    description: 'Invite teammates and set what each role can see and do in every Grow module. Managed in Webfudge Accounts.',
  },
  {
    icon: MessageSquare,
    title: 'Email & WhatsApp connections',
    description: 'Connect your inbox and WhatsApp Business number to log conversations on leads. Coming with Fudge Connect.',
    soon: true,
  },
];

function SectionCard({ icon: Icon, title, description, external, soon }) {
  return (
    <Card
      className={`flex h-full items-start gap-4 border border-gray-200 p-5 transition-shadow ${soon ? 'opacity-70' : 'group-hover:shadow-md'}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50">
        <Icon className="h-5 w-5 text-orange-600" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-gray-900">
          {title}
          {soon ? <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Coming soon</span> : null}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      {soon ? null : external ? (
        <ExternalLink className="mt-1 h-5 w-5 shrink-0 text-gray-400 group-hover:text-orange-600" aria-hidden />
      ) : (
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-400 group-hover:text-orange-600" aria-hidden />
      )}
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Settings"
        subtitle="Configure Grow for your organization. Changes apply only to your organization."
        breadcrumb={[{ label: 'Settings', href: '/settings' }]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) =>
          s.soon ? (
            <div key={s.title}>
              <SectionCard {...s} />
            </div>
          ) : s.external ? (
            <a key={s.title} href={s.href} className="group block" target="_blank" rel="noreferrer">
              <SectionCard {...s} />
            </a>
          ) : (
            <Link key={s.title} href={s.href} className="group block">
              <SectionCard {...s} />
            </Link>
          )
        )}
      </div>
    </div>
  );
}
