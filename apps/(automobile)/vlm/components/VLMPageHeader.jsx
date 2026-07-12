'use client';

import { usePathname } from 'next/navigation';
import { AppPageHeader } from '@webfudge/ui';
import notificationService from '../lib/api/notificationService';

export default function VLMPageHeader({ showBack, ...props }) {
  const pathname = usePathname();
  const isRootList =
    pathname === '/vlm/vehicles' ||
    pathname === '/vlm/allocations' ||
    pathname === '/vlm/service' ||
    pathname === '/vlm/warranty' ||
    pathname === '/vlm/reports';
  const defaultShowBack = !isRootList;

  return (
    <AppPageHeader
      {...props}
      showBack={showBack ?? defaultShowBack}
      notificationService={notificationService}
      searchPlaceholder={props.searchPlaceholder ?? 'Search vehicles…'}
    />
  );
}
