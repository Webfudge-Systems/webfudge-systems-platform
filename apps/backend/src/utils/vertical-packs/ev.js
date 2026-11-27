'use strict';

/** EV dealers (G22): two- and four-wheeler showrooms running test rides. */
module.exports = {
  key: 'ev',
  label: 'Electric vehicles',
  description: 'Test rides, models and financing for EV showrooms and dealers.',
  pipelines: [
    {
      name: 'Vehicle sales',
      stages: [
        { label: 'Enquiry', kind: 'open', color: 'blue', probability: 10 },
        { label: 'Test ride booked', kind: 'open', color: 'violet', probability: 30 },
        { label: 'Test ride done', kind: 'open', color: 'teal', probability: 50 },
        { label: 'Finance / quote', kind: 'open', color: 'amber', probability: 70 },
        { label: 'Booked', kind: 'open', color: 'orange', probability: 90 },
        { label: 'Delivered', kind: 'won', color: 'emerald', probability: 100 },
        { label: 'Lost', kind: 'lost', color: 'red', probability: 0 },
      ],
    },
  ],
  leadStatuses: [
    { key: 'TEST_RIDE_BOOKED', label: 'Test ride booked', color: 'violet' },
    { key: 'TEST_RIDE_DONE', label: 'Test ride done', color: 'teal' },
  ],
  customFields: [
    { entity: 'lead', label: 'Model of interest', type: 'text', showInTable: true },
    { entity: 'lead', label: 'Vehicle type', type: 'select', options: ['Two-wheeler', 'Three-wheeler', 'Four-wheeler'], showInTable: true },
    { entity: 'lead', label: 'Test ride date', type: 'date', showInTable: true },
    { entity: 'lead', label: 'Needs financing', type: 'checkbox' },
    { entity: 'lead', label: 'Exchange vehicle', type: 'text' },
    { entity: 'deal', label: 'Variant / colour', type: 'text' },
    { entity: 'deal', label: 'Expected delivery', type: 'date' },
  ],
  cadences: [
    { name: 'Test ride follow-up', steps: ['WhatsApp: ride reminder (day -1)', 'Call: ride feedback (day 1)', 'WhatsApp: offer + EMI (day 3)'] },
  ],
  whatsappTemplates: [
    { name: 'test_ride_reminder', body: 'Hi {{1}}, your {{2}} test ride is booked for {{3}} at {{4}}. See you there!' },
    { name: 'test_ride_feedback', body: 'Hi {{1}}, how was the {{2}}? Reply YES for an on-road price and EMI options.' },
  ],
  views: [
    { scope: 'crm:leads', name: 'Test rides booked', config: { view: 'table', statusTab: 'TEST_RIDE_BOOKED' } },
    { scope: 'crm:deals', name: 'Vehicle board', config: { view: 'kanban' } },
  ],
};
