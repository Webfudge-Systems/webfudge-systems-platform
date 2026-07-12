'use client';

import { WorkspaceLayoutContent } from '@webfudge/ui';
import { usePathname } from 'next/navigation';
import VLMSidebar from './VLMSidebar';
import { VLM_SITE } from '../lib/site';

const PUBLIC_PATHS = ['/login', '/unauthorized'];

export default function LayoutContent({ children }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <WorkspaceLayoutContent
      sidebar={VLMSidebar}
      sidebarBehavior="hide"
      sidebarBranding={{
        logoPath: VLM_SITE.logoPath,
        productName: VLM_SITE.name,
        companyName: VLM_SITE.brandName,
        homeHref: '/vlm/vehicles',
      }}
      appName={VLM_SITE.name}
      pwaStorageKey="vlm"
      canView={isPublic || true}
    >
      {children}
    </WorkspaceLayoutContent>
  );
}
