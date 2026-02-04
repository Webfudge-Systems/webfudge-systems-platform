export const productTypes = [
  { id: 'all', label: 'Recent Launches', icon: 'lucide:sparkles' },
  { id: 'sales', label: 'Sales', icon: 'lucide:trending-up' },
  { id: 'project-management', label: 'Project Management', icon: 'lucide:layout-grid' },
  { id: 'finance', label: 'Finance', icon: 'lucide:credit-card' },
]

export const products = [
  {
    slug: 'crm',
    name: 'CRM',
    description: 'Complete Customer Relationship Management solution for your team.',
    longDescription: 'Manage leads, deals, and customer communication in one place. Track pipeline, automate follow-ups, and close more deals.',
    typeId: 'sales',
    icon: 'lucide:users',
  },
  {
    slug: 'pm',
    name: 'Project Management',
    description: 'Tasks, timelines, and delivery—all in one place.',
    longDescription: 'Plan projects, assign tasks, and hit deadlines. Boards, timelines, and reports keep everyone aligned.',
    typeId: 'project-management',
    icon: 'lucide:layout-grid',
  },
  {
    slug: 'accounts',
    name: 'Accounts',
    description: 'Billing and subscription management.',
    longDescription: 'Handle billing, subscriptions, and invoices. One place for your accounts and payments.',
    typeId: 'finance',
    icon: 'lucide:credit-card',
  },
]

export function getProductBySlug(slug) {
  return products.find((p) => p.slug === slug) || null
}
