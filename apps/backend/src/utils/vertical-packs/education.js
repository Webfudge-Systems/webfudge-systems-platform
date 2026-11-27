'use strict';

/** Education (G22): schools, colleges, coaching and edtech admissions. */
module.exports = {
  key: 'education',
  label: 'Education',
  description: 'Counselling sessions, courses, intakes and fee status for admissions teams.',
  pipelines: [
    {
      name: 'Admissions',
      stages: [
        { label: 'Enquiry', kind: 'open', color: 'blue', probability: 10 },
        { label: 'Counselling done', kind: 'open', color: 'violet', probability: 30 },
        { label: 'Campus visit / demo', kind: 'open', color: 'teal', probability: 45 },
        { label: 'Application', kind: 'open', color: 'amber', probability: 65 },
        { label: 'Fee paid', kind: 'won', color: 'emerald', probability: 100 },
        { label: 'Lost', kind: 'lost', color: 'red', probability: 0 },
      ],
    },
  ],
  leadStatuses: [
    { key: 'COUNSELLING_SCHEDULED', label: 'Counselling scheduled', color: 'violet' },
    { key: 'DEMO_CLASS', label: 'Demo class', color: 'teal' },
  ],
  customFields: [
    { entity: 'lead', label: 'Course of interest', type: 'text', showInTable: true },
    { entity: 'lead', label: 'Intake', type: 'select', options: ['January', 'April', 'July', 'September'], showInTable: true },
    { entity: 'lead', label: 'Student name', type: 'text' },
    { entity: 'lead', label: 'Current qualification', type: 'text' },
    { entity: 'lead', label: 'Counselling date', type: 'date' },
    { entity: 'deal', label: 'Course fee', type: 'currency' },
    { entity: 'deal', label: 'Scholarship', type: 'checkbox' },
  ],
  cadences: [
    { name: 'Admission nurture', steps: ['WhatsApp: brochure (day 0)', 'Call: counselling (day 1)', 'WhatsApp: deadline reminder (day 7)'] },
  ],
  whatsappTemplates: [
    { name: 'counselling_confirmation', body: 'Hi {{1}}, your counselling session for {{2}} is on {{3}}. Join here: {{4}}' },
    { name: 'admission_deadline', body: 'Hi {{1}}, applications for the {{2}} intake close on {{3}}. Need help applying?' },
  ],
  views: [
    { scope: 'crm:leads', name: 'Counselling scheduled', config: { view: 'table', statusTab: 'COUNSELLING_SCHEDULED' } },
    { scope: 'crm:deals', name: 'Admissions board', config: { view: 'kanban' } },
  ],
};
