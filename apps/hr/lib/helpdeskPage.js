import { HELPDESK_TICKETS, TICKET_CATEGORIES, FAQ_ITEMS } from './mock-data/helpdesk'

export function computeHelpdeskStats(tickets = HELPDESK_TICKETS) {
  let open = 0
  let inProgress = 0
  let resolved = 0
  let highPriority = 0

  for (const t of tickets) {
    if (t.status === 'Open') open += 1
    else if (t.status === 'In Progress') inProgress += 1
    else if (t.status === 'Resolved' || t.status === 'Closed') resolved += 1
    if (t.priority === 'High') highPriority += 1
  }

  return {
    open,
    inProgress,
    resolved,
    highPriority,
    total: tickets.length,
    slaCompliance: 94,
    avgResolutionHours: 18,
    breaches: 3,
  }
}

export function getHelpdeskTabItems() {
  return [
    { key: 'tickets', label: 'Tickets', count: HELPDESK_TICKETS.length },
    { key: 'categories', label: 'Categories', count: TICKET_CATEGORIES.length },
    { key: 'sla', label: 'SLA', count: 0 },
    { key: 'faq', label: 'FAQ', count: FAQ_ITEMS.length },
  ]
}

export function filterHelpdeskTickets(tickets, { search = '', statusFilter = '', priorityFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    if (!q) return true
    return (
      t.id.toLowerCase().includes(q) ||
      t.employee.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.assignee || '').toLowerCase().includes(q)
    )
  })
}

export function filterTicketCategories(categories, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return categories.map((row, index) => ({ ...row, id: `cat-${index}` }))
  return categories
    .map((row, index) => ({ ...row, id: `cat-${index}` }))
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.assignee.toLowerCase().includes(q) ||
        c.sub.some((s) => s.toLowerCase().includes(q))
    )
}
