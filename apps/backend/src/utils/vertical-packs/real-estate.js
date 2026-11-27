'use strict';

/** Real estate (G22): brokers and developers selling plots, flats and villas. */
module.exports = {
  key: 'real_estate',
  label: 'Real estate',
  description: 'Site visits, property interest and booking amounts for brokers and developers.',
  pipelines: [
    {
      name: 'Property sales',
      stages: [
        { label: 'Enquiry', kind: 'open', color: 'blue', probability: 10 },
        { label: 'Site visit scheduled', kind: 'open', color: 'violet', probability: 25 },
        { label: 'Site visit done', kind: 'open', color: 'teal', probability: 40 },
        { label: 'Negotiation', kind: 'open', color: 'amber', probability: 60 },
        { label: 'Booking', kind: 'open', color: 'orange', probability: 85 },
        { label: 'Won', kind: 'won', color: 'emerald', probability: 100 },
        { label: 'Lost', kind: 'lost', color: 'red', probability: 0 },
      ],
    },
  ],
  leadStatuses: [
    { key: 'SITE_VISIT_SCHEDULED', label: 'Site visit scheduled', color: 'violet' },
    { key: 'SITE_VISIT_DONE', label: 'Site visit done', color: 'teal' },
  ],
  customFields: [
    { entity: 'lead', label: 'Property type', type: 'select', options: ['Plot', 'Apartment', 'Villa', 'Commercial'], showInTable: true },
    { entity: 'lead', label: 'Budget', type: 'currency', showInTable: true },
    { entity: 'lead', label: 'Preferred location', type: 'text' },
    { entity: 'lead', label: 'BHK', type: 'select', options: ['1 BHK', '2 BHK', '3 BHK', '4+ BHK'] },
    { entity: 'lead', label: 'Site visit date', type: 'date', showInTable: true },
    { entity: 'deal', label: 'Project / unit', type: 'text' },
    { entity: 'deal', label: 'Booking amount', type: 'currency' },
    { entity: 'deal', label: 'Home loan needed', type: 'checkbox' },
  ],
  cadences: [
    { name: 'Site visit follow-up', steps: ['WhatsApp: visit confirmation (day 0)', 'Call: feedback (day 1)', 'WhatsApp: price sheet (day 3)'] },
  ],
  whatsappTemplates: [
    { name: 'site_visit_confirmation', body: 'Hi {{1}}, your site visit at {{2}} is confirmed for {{3}}. Reply 1 to reschedule.' },
    { name: 'site_visit_feedback', body: 'Hi {{1}}, thanks for visiting {{2}}. Shall we share the price sheet and floor plans?' },
  ],
  views: [
    { scope: 'crm:leads', name: 'Site visits scheduled', config: { view: 'table', statusTab: 'SITE_VISIT_SCHEDULED' } },
    { scope: 'crm:deals', name: 'Property board', config: { view: 'kanban' } },
  ],
};
