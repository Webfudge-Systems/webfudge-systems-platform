import {
  Target,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

export const PERFORMANCE_SECTION_PREFIXES = ['reviews', 'feedback', 'appraisals', 'pips']

export const HR_PERFORMANCE_NAV = [
  { id: 'performance-goals', label: 'Goals', href: '/performance', icon: Target },
  { id: 'performance-reviews', label: 'Reviews', href: '/performance/reviews', icon: ClipboardList },
  { id: 'performance-feedback', label: 'Feedback', href: '/performance/feedback', icon: MessageSquare },
  { id: 'performance-appraisals', label: 'Appraisals', href: '/performance/appraisals', icon: TrendingUp },
  { id: 'performance-pips', label: 'PIPs', href: '/performance/pips', icon: AlertTriangle },
]

export function isPerformanceGoalsActive(pathname) {
  if (pathname === '/performance') return true
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'performance' || parts.length < 2) return false
  return !PERFORMANCE_SECTION_PREFIXES.includes(parts[1])
}

export function isPerformanceSectionActive(pathname) {
  return pathname === '/performance' || pathname.startsWith('/performance/')
}

export function getPerformancePageMeta(section = 'goals') {
  const meta = {
    goals: {
      title: 'Performance',
      breadcrumbLabel: 'Goals',
      subtitle: 'Set company objectives, track key results, and align teams on outcomes',
      showKpis: true,
    },
    reviews: {
      title: 'Reviews',
      breadcrumbLabel: 'Reviews',
      subtitle: 'Manage quarterly and annual review cycles across the organization',
      showKpis: true,
    },
    feedback: {
      title: 'Feedback',
      breadcrumbLabel: 'Feedback',
      subtitle: 'Collect peer and manager feedback during review cycles',
      showKpis: true,
    },
    appraisals: {
      title: 'Appraisals',
      breadcrumbLabel: 'Appraisals',
      subtitle: 'Finalize ratings, salary revisions, and promotion recommendations',
      showKpis: true,
    },
    pips: {
      title: 'PIPs',
      breadcrumbLabel: 'PIPs',
      subtitle: 'Track performance improvement plans, milestones, and outcomes',
      showKpis: true,
    },
  }
  return meta[section] || meta.goals
}
