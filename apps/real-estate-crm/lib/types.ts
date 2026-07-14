// Domain types for the real-estate CRM. Field names mirror the Strapi
// content types that land in Stage 2 (camelCase, org-relation scoped).

export type LeadSource = 'meta_instant_form' | 'meta_whatsapp' | 'landing_page' | 'manual'
export type LeadTimeline = 'immediate' | 'three_to_six_months' | 'browsing'
export type LeadPurpose = 'own_use' | 'investment'
export type LeadTier = 'hot' | 'warm' | 'cold'
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'site_visit_scheduled'
  | 'site_visit_done'
  | 'negotiating'
  | 'booked'
  | 'lost'

export const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'site_visit_scheduled',
  'site_visit_done',
  'negotiating',
  'booked',
  'lost',
]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  site_visit_scheduled: 'Visit scheduled',
  site_visit_done: 'Visit done',
  negotiating: 'Negotiating',
  booked: 'Booked',
  lost: 'Lost',
}

export interface ScoreFactor {
  factor: string
  points: number
  reason: string
}

export interface RealEstateLead {
  id: number | string
  name: string
  phone?: string
  email?: string
  source: LeadSource
  metaLeadId?: string | null
  metaCampaignId?: string | null
  budgetRange?: string | null
  timeline?: LeadTimeline | null
  purpose?: LeadPurpose | null
  configInterest?: string | null
  pageVisited: boolean
  pageTimeSeconds?: number | null
  score: number
  tier: LeadTier
  scoreBreakdown?: ScoreFactor[]
  status: LeadStatus
  assignedTo?: { id: number; username?: string; email?: string } | null
  lastContactedAt?: string | null
  project?: { id: number; name: string } | null
  createdAt?: string
  updatedAt?: string
}

export type ProjectStatus = 'upcoming' | 'active' | 'sold_out' | 'archived'

export const PROJECT_STATUSES: ProjectStatus[] = ['upcoming', 'active', 'sold_out', 'archived']

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  sold_out: 'Sold out',
  archived: 'Archived',
}

export interface RealEstateProject {
  id: number | string
  name: string
  developerName?: string | null
  location?: string | null
  minPrice?: number | string | null
  maxPrice?: number | string | null
  configurations?: string[]
  possessionDate?: string | null
  status?: ProjectStatus
  landingPageUrl?: string | null
  metaCampaignId?: string | null
  metaFormFieldMapping?: Record<string, string[]> | null
  createdAt?: string
}

export interface SiteVisit {
  id: number | string
  lead?: Partial<RealEstateLead> | null
  project?: Partial<RealEstateProject> | null
  scheduledAt?: string
  completedAt?: string | null
  outcome?: string | null
  notes?: string | null
  createdAt?: string
}

export interface LeadActivity {
  id: number | string
  type: string
  payload?: Record<string, unknown> | null
  createdAt?: string
}

export interface OrgUser {
  id: number
  email?: string
  username?: string
  firstName?: string
  lastName?: string
  role?: string
  roleCode?: string
}
