export const HR_SETTINGS_SECTIONS = [
  { id: 'company', label: 'Company Profile', icon: 'Building2' },
  { id: 'departments', label: 'Departments & Locations', icon: 'MapPin' },
  { id: 'roles', label: 'Roles & Permissions', icon: 'Shield' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell' },
  { id: 'integrations', label: 'Integrations', icon: 'Plug' },
  { id: 'billing', label: 'Billing & Plan', icon: 'CreditCard' },
]

export const NOTIFICATION_PREFS = [
  { id: 'leave', label: 'Leave Approval', inApp: true, email: true, whatsapp: false },
  { id: 'payroll', label: 'Payroll Processed', inApp: true, email: true, whatsapp: false },
  { id: 'hire', label: 'New Hire', inApp: true, email: true, whatsapp: true },
  { id: 'birthday', label: 'Birthday', inApp: true, email: false, whatsapp: false },
  { id: 'anniversary', label: 'Anniversary', inApp: true, email: true, whatsapp: false },
]
