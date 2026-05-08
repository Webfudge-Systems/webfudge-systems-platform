'use client';

import { AppShell } from '@webfudge/ui';
import VLMSidebar from './VLMSidebar';

export default function LayoutContent({ children }) {
  return <AppShell sidebar={VLMSidebar}>{children}</AppShell>;
}

