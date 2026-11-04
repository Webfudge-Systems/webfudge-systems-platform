// Real Webfudge Systems customers, used by the logo strip, the Customers page and /customers/[slug].
// Keep claims factual. Quotes are drafts until the customer approves them; only approved quotes are shown.

export const customers = [
  {
    slug: 'evi',
    name: 'EVI',
    logo: { src: '/customers/evi.webp', width: 2000, height: 916, surface: 'light' },
    industry: 'Electric mobility',
    status: 'live',
    built: ['ERP'],
    headline: 'One ERP in place of spreadsheets and disconnected tools',
    summary:
      'We designed and built a custom ERP for EVI, so their teams run day-to-day operations from one system with one shared set of records.',
    challenge:
      'As EVI grew, the information each team depended on lived in separate spreadsheets and tools. Every handover between teams meant re-entering data, and getting a clear picture of the business meant pulling reports together by hand.',
    solution:
      'We mapped how work actually moves through EVI, then built an ERP around those workflows rather than forcing a generic template onto them. Each team works in its own module, while records, approvals and reports are shared across the company.',
    delivered: [
      'Custom ERP built around EVI’s own workflows',
      'Role-based access, so each team sees what it needs',
      'Shared records across departments, entered once',
      'Reports and dashboards for management',
    ],
    // Draft for EVI to approve. Set approved: true and fill in name and role to show it on the site.
    quote: { text: 'Webfudge built an ERP around the way we actually work. Our teams now share one set of records instead of a dozen spreadsheets.', name: '', role: '', approved: false },
  },
  {
    slug: 'xtrawrkx',
    name: 'Xtrawrkx',
    logo: { src: '/customers/xtrawrkx.png', width: 670, height: 670, surface: 'tile' },
    industry: 'Business services',
    status: 'live',
    built: ['CRM', 'PM', 'Accounts', 'LinkedIn extension', 'Client portal'],
    headline: 'A complete suite, from the first LinkedIn lead to the client portal',
    summary:
      'Xtrawrkx runs its whole client lifecycle on software we built: a CRM, project management, an Accounts admin centre, a LinkedIn extension for capturing leads, and a portal for their clients.',
    challenge:
      'Leads were found on LinkedIn, tracked in one place, delivered as projects in another, and reported to clients by email. Nothing connected, so context was lost at every step and clients had no view of their own work.',
    solution:
      'We built Xtrawrkx a connected suite. The LinkedIn extension sends prospects straight into the CRM. Won deals move into project management. Accounts controls users, roles and access across both. The client portal gives each client a live view of their projects, without another email.',
    delivered: [
      'CRM for leads, companies, contacts and deals',
      'Project management with tasks, timelines and team workload',
      'Accounts: users, roles, departments and access in one place',
      'LinkedIn extension that captures leads into the CRM in one click',
      'Client portal so clients follow their own projects',
    ],
    // Draft for Xtrawrkx to approve.
    quote: { text: 'From the LinkedIn extension to the client portal, our whole client lifecycle now runs on one connected suite.', name: '', role: '', approved: false },
  },
  {
    slug: 'positiev',
    name: 'PositiEV',
    logo: { src: '/customers/positiev.png', width: 490, height: 170, surface: 'light' },
    industry: 'Electric mobility',
    status: 'live',
    built: ['CRM', 'PM'],
    headline: 'Sales and delivery on one connected platform',
    summary:
      'PositiEV uses Webfudge CRM to manage its sales pipeline and Webfudge PM to deliver the work it wins, with both apps sharing the same customer records.',
    challenge:
      'Customer conversations and project delivery were tracked separately, so the delivery team often started work without the context the sales team already had.',
    solution:
      'We set up Webfudge CRM and PM for PositiEV as one workspace. Deals, contacts and companies live in the CRM; when work is confirmed it carries straight into PM, where tasks, owners and deadlines keep delivery on track.',
    delivered: [
      'CRM pipeline for leads, contacts and deals',
      'Project management for delivery, tasks and deadlines',
      'Customer records shared between sales and delivery',
      'Team roles and permissions set up for their organisation',
    ],
    // Draft for PositiEV to approve.
    quote: { text: 'Sales and delivery now work from the same customer records, so every project starts with the full context.', name: '', role: '', approved: false },
  },
  {
    slug: 'bikewo',
    name: 'BikeWo',
    logo: { src: '/customers/bikewo.webp', width: 2000, height: 798, surface: 'dark' },
    industry: 'Electric mobility',
    status: 'deploying',
    built: ['CRM', 'PM'],
    upcoming: ['FMS'],
    headline: 'Getting an electric mobility business onto one platform',
    summary:
      'We are rolling out Webfudge CRM and PM across BikeWo, with a fleet management system (FMS) next on the roadmap.',
    challenge:
      'BikeWo is growing quickly and needed a single place to manage customers, partners and the projects behind its expansion, before adding more people and more vehicles.',
    solution:
      'We are deploying Webfudge CRM and PM first, so sales and operations share one view of every customer and project. The FMS will build on the same platform, so fleet data sits next to the customers and projects it relates to.',
    delivered: [
      'Webfudge CRM for customers and partners (rolling out)',
      'Webfudge PM for projects and operations (rolling out)',
      'Fleet management system (FMS) — next on the roadmap',
    ],
    // Draft for BikeWo to approve once the rollout is live.
    quote: { text: 'Getting our customers, partners and projects onto one platform has made it much easier to grow.', name: '', role: '', approved: false },
  },
]

export const getCustomer = (slug) => customers.find((c) => c.slug === slug)
