'use strict';

/** Jewellery retail (G22): store walk-ins, custom orders and occasions. */
module.exports = {
  key: 'jewellery',
  label: 'Jewellery',
  description: 'Store visits, custom orders, occasions and metal preferences for jewellers.',
  pipelines: [
    {
      name: 'Jewellery orders',
      stages: [
        { label: 'Enquiry', kind: 'open', color: 'blue', probability: 10 },
        { label: 'Store visit', kind: 'open', color: 'violet', probability: 30 },
        { label: 'Design / estimate', kind: 'open', color: 'amber', probability: 50 },
        { label: 'Advance paid', kind: 'open', color: 'orange', probability: 80 },
        { label: 'Delivered', kind: 'won', color: 'emerald', probability: 100 },
        { label: 'Lost', kind: 'lost', color: 'red', probability: 0 },
      ],
    },
  ],
  leadStatuses: [{ key: 'STORE_VISIT', label: 'Store visit', color: 'violet' }],
  customFields: [
    { entity: 'lead', label: 'Occasion', type: 'select', options: ['Wedding', 'Engagement', 'Anniversary', 'Festival', 'Gift', 'Other'], showInTable: true },
    { entity: 'lead', label: 'Metal', type: 'multiselect', options: ['Gold', 'Diamond', 'Silver', 'Platinum'], showInTable: true },
    { entity: 'lead', label: 'Budget', type: 'currency' },
    { entity: 'lead', label: 'Occasion date', type: 'date' },
    { entity: 'deal', label: 'Weight (g)', type: 'number' },
    { entity: 'deal', label: 'Advance amount', type: 'currency' },
  ],
  cadences: [
    { name: 'Occasion reminder', steps: ['WhatsApp: new collection (30 days before)', 'Call: book store visit (14 days before)'] },
  ],
  whatsappTemplates: [
    { name: 'store_visit_invite', body: 'Hi {{1}}, our new {{2}} collection is in. Visit us at {{3}} this week?' },
    { name: 'order_ready', body: 'Hi {{1}}, your order {{2}} is ready for pickup. Store hours: {{3}}.' },
  ],
  views: [
    { scope: 'crm:leads', name: 'Store visits', config: { view: 'table', statusTab: 'STORE_VISIT' } },
    { scope: 'crm:deals', name: 'Order board', config: { view: 'kanban' } },
  ],
};
