'use client'

import HRModulePage from '../layout/HRModulePage'

/** @deprecated Prefer HRModulePage — kept for dashboard / legacy imports. */
export default function HRPageLayout({ children, className = '' }) {
  return <HRModulePage className={className}>{children}</HRModulePage>
}
