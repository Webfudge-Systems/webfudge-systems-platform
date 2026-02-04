'use client';

import Link from 'next/link';
import { CheckSquare, FolderOpen } from 'lucide-react';
import { Card } from '@webfudge/ui';

export default function DeliveryPage() {
  const links = [
    { href: '/delivery/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/delivery/projects', label: 'Projects', icon: FolderOpen },
  ];
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-brand-dark">Delivery</h1>
      <p className="text-gray-600">Tasks and projects.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="p-6 border border-gray-200 hover:border-brand-primary/30 hover:shadow-md transition-all cursor-pointer">
              <Icon className="w-10 h-10 text-brand-primary mb-3" />
              <h2 className="text-lg font-semibold text-brand-dark">{label}</h2>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
