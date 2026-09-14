/** Primary contact row for lead company tables (list + dashboard). */
export function primaryContactForLeadCompany(company) {
  const contacts = company?.contacts || [];
  const contact =
    contacts.find((c) => c.isPrimaryContact) || contacts[0] || null;
  const name = contact
    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
    : '';
  // Prefer primary contact email, then lead company, then any associated contact.
  const emailFromAnyContact = contacts.find((c) => c?.email)?.email || '';
  return {
    contact,
    name,
    email: contact?.email || company?.email || emailFromAnyContact || '',
    phone: contact?.phone || company?.phone || '',
  };
}
