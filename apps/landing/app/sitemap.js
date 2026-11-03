import { customers } from '../data/customers'
import { LEGAL } from '../data/legal'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://webfudgesystems.in').replace(/\/$/, '')

export default function sitemap() {
  const now = new Date()
  const page = (path, priority, changeFrequency = 'monthly') => ({ url: `${siteUrl}${path}`, lastModified: now, changeFrequency, priority })
  return [
    page('/', 1.0, 'weekly'),
    page('/crm', 0.9, 'weekly'),
    page('/projects', 0.9, 'weekly'),
    page('/pricing', 0.9, 'weekly'),
    page('/customers', 0.8),
    ...customers.map((c) => page(`/customers/${c.slug}`, 0.7)),
    page('/services', 0.8),
    page('/about', 0.7),
    page('/contact', 0.7),
    ...Object.keys(LEGAL).map((doc) => page(`/legal/${doc}`, 0.3, 'yearly')),
  ]
}
