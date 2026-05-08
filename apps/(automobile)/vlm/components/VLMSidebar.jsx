'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Car, Wrench, ShieldCheck, BarChart3, MapPin } from 'lucide-react';

const navItems = [
  { href: '/vlm/vehicles', label: 'Vehicles', icon: Car },
  { href: '/vlm/allocations', label: 'Allocations', icon: MapPin },
  { href: '/vlm/service', label: 'Service', icon: Wrench },
  { href: '/vlm/warranty', label: 'Warranty', icon: ShieldCheck },
  { href: '/vlm/reports', label: 'Reports', icon: BarChart3 },
];

export default function VLMSidebar({ collapsed = false }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (!href || href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } h-full min-h-0 bg-white backdrop-blur-xl border-r border-white/30 flex flex-col shadow-xl overflow-hidden transition-[width] duration-300 flex-shrink-0`}
    >
      <div className="shrink-0 p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <span className="font-bold text-xl text-brand-foreground">Webfudge VLM</span>
          )}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${active ? 'text-white' : 'text-orange-500'}`}
                aria-hidden
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

