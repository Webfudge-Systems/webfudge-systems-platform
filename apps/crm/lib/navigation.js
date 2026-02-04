/**
 * CRM navigation structure (matches ref CRM)
 */
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  UserCheck,
  FileText,
  Receipt,
  FolderOpen,
  BarChart3,
  CheckSquare,
  Target,
  DollarSign,
  Mail,
  Phone,
  Calendar,
  HeadphonesIcon,
} from 'lucide-react';

const comingSoonUrl = (feature) => `/coming-soon?feature=${encodeURIComponent(feature)}`;

export const navigationData = [
  {
    id: 'sales',
    label: 'Sales',
    children: [
      {
        id: 'lead-companies',
        label: 'Lead Companies',
        icon: Users,
        href: '/sales/lead-companies',
        children: [
          { id: 'lead-companies-list', label: 'All Leads', href: '/sales/lead-companies' },
          { id: 'lead-companies-board', label: 'Pipeline Board (Kanban)', href: '/sales/lead-companies' },
          { id: 'lead-companies-new', label: 'New Lead', href: '/sales/lead-companies/new' },
        ],
      },
      {
        id: 'contacts',
        label: 'Contacts',
        icon: UserCheck,
        href: '/sales/contacts',
        children: [
          { id: 'contacts-list', label: 'Contacts List', href: '/sales/contacts' },
          { id: 'contacts-new', label: 'New Contact', href: '/sales/contacts/new' },
        ],
      },
      {
        id: 'deals',
        label: 'Opportunities / Deals',
        icon: Briefcase,
        href: '/sales/deals',
        children: [
          { id: 'pipeline-board', label: 'Pipeline Board', href: '/sales/deals/pipeline' },
          { id: 'deals-list', label: 'Deals List', href: '/sales/deals' },
          { id: 'deals-new', label: 'New Deal', href: '/sales/deals/new' },
        ],
      },
      { id: 'campaigns', label: 'Campaigns', icon: Mail, href: comingSoonUrl('Campaigns'), children: [] },
      { id: 'meetings', label: 'Meetings & Calls', icon: Phone, href: comingSoonUrl('Meetings & Calls'), children: [] },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    children: [
      {
        id: 'tasks',
        label: 'Tasks',
        icon: CheckSquare,
        href: '/delivery/tasks',
        children: [
          { id: 'tasks-list', label: 'My Tasks', href: '/delivery/tasks' },
        ],
      },
      {
        id: 'projects',
        label: 'Projects',
        icon: FolderOpen,
        href: '/delivery/projects',
        children: [
          { id: 'projects-list', label: 'All Projects', href: '/delivery/projects' },
          { id: 'projects-board', label: 'Board', href: '/delivery/projects/board' },
        ],
      },
      { id: 'documents', label: 'Documents', icon: FileText, href: comingSoonUrl('Documents'), children: [] },
      { id: 'support', label: 'Support Tickets', icon: HeadphonesIcon, href: comingSoonUrl('Support'), children: [] },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    children: [
      { id: 'reports', label: 'Reports & Forecasts', icon: BarChart3, href: comingSoonUrl('Analytics'), children: [] },
    ],
  },
  {
    id: 'client-portal',
    label: 'Client Portal',
    children: [
      {
        id: 'accounts',
        label: 'Client Accounts',
        icon: Building2,
        href: '/clients/accounts',
        children: [
          { id: 'accounts-list', label: 'All Clients', href: '/clients/accounts' },
          { id: 'accounts-new', label: 'New Client', href: '/clients/accounts/new' },
        ],
      },
      {
        id: 'proposals',
        label: 'Proposals',
        icon: FileText,
        href: '/clients/proposals',
        children: [{ id: 'proposals-list', label: 'View Proposals', href: '/clients/proposals' }],
      },
      {
        id: 'invoices',
        label: 'Invoices',
        icon: Receipt,
        href: '/clients/invoices',
        children: [{ id: 'invoices-list', label: 'View Invoices', href: '/clients/invoices' }],
      },
      { id: 'client-documents', label: 'Documents', icon: FolderOpen, href: comingSoonUrl('Client Documents'), children: [] },
      { id: 'client-tickets', label: 'Support Tickets', icon: HeadphonesIcon, href: comingSoonUrl('Client Support'), children: [] },
      { id: 'client-meetings', label: 'Meetings', icon: Calendar, href: comingSoonUrl('Client Meetings'), children: [] },
    ],
  },
];

export const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/', hasSubNav: false, priority: 'high' },
  { id: 'sales', label: 'Sales', icon: DollarSign, hasSubNav: true, priority: 'high' },
  { id: 'delivery', label: 'Delivery', icon: FolderOpen, hasSubNav: true, priority: 'high' },
  { id: 'client-portal', label: 'Client Portal', icon: UserCheck, hasSubNav: true, priority: 'high' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, hasSubNav: true, priority: 'low' },
];

export const quickActionItems = [
  { label: 'Add Lead Company', icon: Users, href: '/sales/lead-companies/new' },
  { label: 'Add Deal', icon: Briefcase, href: '/sales/deals/new' },
  { label: 'Add Contact', icon: UserCheck, href: '/sales/contacts/new' },
  { label: 'Add Task', icon: CheckSquare, href: '/delivery/tasks' },
];
