export const siteContact = {
  phone: '+91 73853 02967',
  phoneHref: 'tel:+917385302967',
  email: 'contact@webfudge.in',
  location: { city: 'Pune', region: 'Maharashtra', country: 'India', display: 'Pune, Maharashtra, India' },
}

export const company = {
  name: 'Webfudge Systems',
  // TODO: add before launch — shown in the footer and on invoices.
  gstin: '',
  registeredAddress: 'Pune, Maharashtra, India',
}

export const apps = [
  { slug: 'crm', name: 'CRM', href: '/crm', icon: '/apps/crm.svg', tint: '#FFF1E8', text: 'Leads, contacts and deals in one pipeline', available: true },
  { slug: 'pm', name: 'Projects', href: '/projects', icon: '/apps/projects.svg', tint: '#EEF1FF', text: 'Tasks, timelines and team workload', available: true },
  { slug: 'books', name: 'Books', href: '/pricing#books', icon: '/apps/books.svg', tint: '#E9F8F1', text: 'Invoices and GST-ready accounts', available: false },
  { slug: 'hr', name: 'HR', href: '/pricing#hr', icon: '/apps/hr.svg', tint: '#F3EEFF', text: 'People, leave and attendance', available: false },
]

// TODO: replace with real numbers before launch (kept here so they're easy to update).
export const kpis = [
  { value: '25+', label: 'Businesses running on our software' },
  { value: '60+', label: 'Projects delivered' },
  { value: '1,000+', label: 'People using Webfudge every day' },
  { value: '14', label: 'Days free on every app' },
]

export const steps = [
  { n: '1', title: 'Create your account', text: 'Name, work email and a password. A 6-digit code confirms it’s you.' },
  { n: '2', title: 'Name your organization', text: 'Your company becomes a workspace. Run several from one login.' },
  { n: '3', title: 'Pick your apps', text: 'CRM, Projects or both — each with its own 14-day trial.' },
  { n: '4', title: 'Invite your team', text: 'Add teammates by email with the right role, then get to work.' },
]

export const services = [
  { name: 'ERP systems', example: 'Built around how your company runs — like the ERP we built for EVI' },
  { name: 'Client portals', example: 'Live project views for your clients' },
  { name: 'Browser extensions', example: 'Capture leads from LinkedIn straight into your CRM' },
  { name: 'Fleet management', example: 'Vehicles, riders and servicing for mobility businesses' },
  { name: 'Custom web apps', example: 'Software shaped around one workflow only you have' },
]

export const faqs = [
  { q: 'Do I need a card to start a trial?', a: 'No. Every app has a 14-day free trial and you only add a payment method when you choose a plan.' },
  { q: 'Can I buy only the CRM, or only Projects?', a: 'Yes. Each app is billed on its own. Start with one and add the other whenever you are ready — they link up automatically.' },
  { q: 'What happens when my trial ends?', a: 'The app turns read-only, so nothing is lost. Pick a plan to carry on. If you don’t, the app locks after 7 more days and your data is kept for 90 days.' },
  { q: 'How do I pay, and do I get a GST invoice?', a: 'You pay online by UPI, card or netbanking through Razorpay. Prices exclude GST, and a tax invoice is issued for every payment.' },
  { q: 'Can I switch between monthly and yearly?', a: 'Yes, at any time from Apps & billing in Webfudge Accounts. Yearly billing saves 15%.' },
  { q: 'Can you build something custom for us?', a: 'Yes. We build ERPs, client portals, browser extensions and fleet systems that connect to your Webfudge apps. Talk to our team.' },
]

export const footerColumns = [
  { title: 'Products', links: [['CRM', '/crm'], ['Projects', '/projects'], ['Pricing', '/pricing'], ['Books (soon)', '/pricing#books']] },
  { title: 'Company', links: [['About', '/about'], ['Customers', '/customers'], ['Services', '/services'], ['Contact', '/contact']] },
  { title: 'Legal', links: [['Terms', '/legal/terms'], ['Privacy', '/legal/privacy'], ['Refunds', '/legal/refunds']] },
]
