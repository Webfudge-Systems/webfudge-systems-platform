'use strict';

/** Clinics (G22): dental, skin, physio and multi-speciality clinics booking consultations. */
module.exports = {
  key: 'clinics',
  label: 'Clinics',
  description: 'Consultations, treatments and follow-up visits for clinics.',
  pipelines: [
    {
      name: 'Patient journey',
      stages: [
        { label: 'Enquiry', kind: 'open', color: 'blue', probability: 10 },
        { label: 'Consultation booked', kind: 'open', color: 'violet', probability: 35 },
        { label: 'Consulted', kind: 'open', color: 'teal', probability: 55 },
        { label: 'Treatment plan shared', kind: 'open', color: 'amber', probability: 75 },
        { label: 'Treatment started', kind: 'won', color: 'emerald', probability: 100 },
        { label: 'Lost', kind: 'lost', color: 'red', probability: 0 },
      ],
    },
  ],
  leadStatuses: [
    { key: 'CONSULTATION_BOOKED', label: 'Consultation booked', color: 'violet' },
    { key: 'CONSULTED', label: 'Consulted', color: 'teal' },
  ],
  customFields: [
    { entity: 'lead', label: 'Treatment of interest', type: 'text', showInTable: true },
    { entity: 'lead', label: 'Appointment date', type: 'date', showInTable: true },
    { entity: 'lead', label: 'Preferred doctor', type: 'text' },
    { entity: 'lead', label: 'First visit', type: 'checkbox' },
    { entity: 'deal', label: 'Treatment plan value', type: 'currency' },
    { entity: 'deal', label: 'Sessions', type: 'number' },
  ],
  cadences: [
    { name: 'Consultation follow-up', steps: ['WhatsApp: appointment reminder (day -1)', 'Call: post-visit check-in (day 2)', 'WhatsApp: next session reminder (day 14)'] },
  ],
  whatsappTemplates: [
    { name: 'appointment_reminder', body: 'Hi {{1}}, a reminder of your appointment with {{2}} on {{3}}. Reply 1 to reschedule.' },
    { name: 'post_visit_checkin', body: 'Hi {{1}}, how are you feeling after your visit? Reply here if you have any questions.' },
  ],
  views: [
    { scope: 'crm:leads', name: 'Consultations booked', config: { view: 'table', statusTab: 'CONSULTATION_BOOKED' } },
    { scope: 'crm:deals', name: 'Patient board', config: { view: 'kanban' } },
  ],
};
