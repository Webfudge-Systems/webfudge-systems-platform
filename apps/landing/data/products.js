import { siteContact } from './site'

export const productTypes = [
  { id: 'all', label: 'All Products', icon: 'lucide:sparkles' },
  { id: 'sales', label: 'Sales & CRM', icon: 'lucide:trending-up' },
  { id: 'operations', label: 'Operations', icon: 'lucide:layout-grid' },
  { id: 'finance', label: 'Finance', icon: 'lucide:credit-card' },
  { id: 'custom', label: 'Custom', icon: 'lucide:code-2' },
]

export const products = [
  {
    slug: 'crm',
    name: 'CRM System',
    description: 'Complete Customer Relationship Management solution for your team.',
    longDescription:
      'Manage leads, deals, and customer communication in one place. Track pipeline, automate follow-ups, and close more deals.',
    typeId: 'sales',
    icon: 'lucide:users',
  },
  {
    slug: 'erp',
    name: 'ERP System',
    description: 'Unified enterprise resource planning for your entire business.',
    longDescription:
      'Connect finance, inventory, HR, and operations in one integrated platform built around your workflows.',
    typeId: 'operations',
    icon: 'lucide:layout-grid',
  },
  {
    slug: 'hrms',
    name: 'HRMS System',
    description: 'Manage people, payroll, and performance in one place.',
    longDescription:
      'Employee records, leave management, org structure, and team operations — built for growing businesses.',
    typeId: 'operations',
    icon: 'lucide:user-cog',
  },
  {
    slug: 'finance',
    name: 'Finance System',
    description: 'Financial management with clarity and control.',
    longDescription:
      'Handle billing, ledgers, reporting, and financial workflows with accurate, real-time visibility.',
    typeId: 'finance',
    icon: 'lucide:credit-card',
  },
  {
    slug: 'lead-generation',
    name: 'Lead Generation Extension',
    description: 'Capture and convert more leads from your daily workflow.',
    longDescription:
      'Browser extensions and tools to find, track, and nurture leads directly where your team works.',
    typeId: 'sales',
    icon: 'lucide:target',
  },
  {
    slug: 'invoice-billing',
    name: 'Invoice & Billing',
    description: 'Streamline invoicing, payments, and subscriptions.',
    longDescription:
      'Create invoices, track payments, manage subscriptions, and keep billing workflows accurate and on time.',
    typeId: 'finance',
    icon: 'lucide:receipt',
  },
  {
    slug: 'inventory',
    name: 'Inventory Management',
    description: 'Track stock, warehouses, and supply chain operations.',
    longDescription:
      'Monitor inventory levels, automate reordering, and gain full visibility across your supply chain.',
    typeId: 'operations',
    icon: 'lucide:package',
  },
  {
    slug: 'custom-web-app',
    name: 'Custom Web Application',
    description: 'Tailored web applications built around your business.',
    longDescription:
      'Custom software designed specifically for your processes, teams, and growth goals.',
    typeId: 'custom',
    icon: 'lucide:globe',
  },
]

export function getProductBySlug(slug) {
  return products.find((p) => p.slug === slug) || null
}

export { siteContact }
