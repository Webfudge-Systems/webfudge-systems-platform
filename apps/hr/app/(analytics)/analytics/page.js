import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Analytics & Reports — not released yet (PM-style coming soon). */
export default function AnalyticsPage() {
  redirect('/coming-soon?feature=analytics-reports')
}
