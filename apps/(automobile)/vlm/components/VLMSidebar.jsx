'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { SidebarProductBranding } from '@webfudge/ui';
import { Car, Wrench, ShieldCheck, BarChart3, MapPin, PanelLeftClose } from 'lucide-react';
import { VLM_SITE } from '../lib/site';

const NAV_ITEMS = [
  { id: 'vehicles', href: '/vlm/vehicles', label: 'Vehicles', icon: Car },
  { id: 'allocations', href: '/vlm/allocations', label: 'Allocations', icon: MapPin },
  { id: 'service', href: '/vlm/service', label: 'Service', icon: Wrench },
  { id: 'warranty', href: '/vlm/warranty', label: 'Warranty', icon: ShieldCheck },
];

const SYSTEM_ITEMS = [{ id: 'reports', href: '/vlm/reports', label: 'Reports', icon: BarChart3 }];

function sectionRule(id, collapsed) {
  if (collapsed) return null;
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <div className="h-px flex-1 bg-white/25" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-light">{id}</span>
      <div className="h-px flex-1 bg-white/25" />
    </div>
  );
}

export default function VLMSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (!href || href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const tileClass = (active) =>
    `relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3.5 shadow-md transition-all ${
      active
        ? 'border-brand-primary/40 bg-brand-primary text-white shadow-lg shadow-orange-500/25'
        : 'border-white/30 bg-white/20 text-brand-foreground backdrop-blur-md hover:bg-white/35 hover:shadow-lg'
    }`;

  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-white/30 bg-white shadow-xl backdrop-blur-xl transition-[width] duration-300`}
    >
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className={`flex gap-2 ${collapsed ? 'flex-col items-center' : 'items-center justify-between'}`}>
          {collapsed ? (
            <Link href="/vlm/vehicles" className="flex shrink-0" aria-label={`${VLM_SITE.name} home`}>
              <Image
                src={VLM_SITE.logoPath}
                alt={VLM_SITE.brandName}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </Link>
          ) : (
            <Link
              href="/vlm/vehicles"
              className="flex min-w-0 flex-1 items-center gap-2.5"
              aria-label={`${VLM_SITE.name} home`}
            >
              <Image
                src={VLM_SITE.logoPath}
                alt={VLM_SITE.brandName}
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain"
                priority
              />
              <SidebarProductBranding productName={VLM_SITE.name} companyName={VLM_SITE.brandName} />
            </Link>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-50"
            aria-label="Hide sidebar"
          >
            <PanelLeftClose className="h-5 w-5 text-brand-foreground" strokeWidth={1.75} />
          </button>
        </div>
        {!collapsed ? (
          <div
            className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-orange-400/50 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="px-3 pb-2 pt-3">
          {sectionRule('Navigate', collapsed)}
          <div className={`grid gap-2.5 ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={tileClass(active)}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={2} />
                  {!collapsed && (
                    <span className="line-clamp-2 px-0.5 text-center text-xs font-semibold leading-snug">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="px-3 pb-4 pt-2">
          {sectionRule('System', collapsed)}
          <div className={`grid gap-2.5 ${collapsed ? 'grid-cols-1' : 'grid-cols-1'}`}>
            {SYSTEM_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${tileClass(active)} ${collapsed ? '' : 'min-h-[3.5rem] flex-row justify-center gap-2 px-3 py-3'}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                  {!collapsed && <span className="text-xs font-semibold">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
