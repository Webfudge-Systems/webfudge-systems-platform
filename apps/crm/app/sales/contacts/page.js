'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Mail, Phone, Building2, Calendar, User, Users, UserCheck } from 'lucide-react';
import {
  Button,
  Card,
  Table,
  EmptyState,
  Pagination,
  Avatar,
  Badge,
  LoadingSpinner,
  TabsWithActions,
  KPICard,
} from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import contactService from '../../../lib/api/contactService';

// Utility function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await contactService.getAll({
        sort: 'createdAt:desc',
        'pagination[pageSize]': 100,
        populate: ['leadCompany', 'clientAccount'],
      });
      setContacts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const contactStats = {
    all: contacts.length,
    withEmail: contacts.filter((c) => c.email).length,
    withPhone: contacts.filter((c) => c.phone).length,
    withCompany: contacts.filter((c) => c.company || c.leadCompany || c.clientAccount).length,
  };

  // Filter contacts
  const filteredContacts = contacts.filter((contact) => {
    if (!contact) return false;

    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase());

    // Tab filter
    let matchesTab = true;
    if (activeTab === 'withEmail') {
      matchesTab = !!contact.email;
    } else if (activeTab === 'withPhone') {
      matchesTab = !!contact.phone;
    } else if (activeTab === 'withCompany') {
      matchesTab = !!(contact.company || contact.leadCompany || contact.clientAccount);
    }
    // 'all' tab shows everything

    return matchesSearch && matchesTab;
  });

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Tab items
  const tabItems = [
    { key: 'all', label: 'All Contacts', count: contactStats.all },
    { key: 'withEmail', label: 'With Email', count: contactStats.withEmail },
    { key: 'withPhone', label: 'With Phone', count: contactStats.withPhone },
    { key: 'withCompany', label: 'With Company', count: contactStats.withCompany },
  ];

  const columns = [
    {
      key: 'contact',
      label: 'CONTACT',
      render: (_, contact) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <Avatar
            fallback={contact.firstName?.[0] || contact.email?.[0] || 'C'}
            alt={`${contact.firstName} ${contact.lastName}`}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {contact.firstName && contact.lastName
                ? `${contact.firstName} ${contact.lastName}`
                : contact.name || 'Unnamed'}
            </div>
            <div className="text-sm text-gray-500 truncate">{contact.role || 'No role'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact-info',
      label: 'CONTACT INFO',
      render: (_, contact) => (
        <div className="space-y-1 min-w-[200px]">
          <div className="flex items-center gap-2 text-sm text-gray-900">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{contact.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{contact.phone || 'No phone'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      label: 'COMPANY',
      render: (_, contact) => (
        <div className="flex items-center gap-2 min-w-[150px]">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 truncate">
            {contact.company || contact.leadCompany?.name || contact.clientAccount?.name || 'No company'}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'CREATED',
      render: (_, contact) => (
        <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{formatDate(contact.createdAt)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Contacts"
        subtitle="Manage your contacts and relationships"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sales', href: '/sales' },
          { label: 'Contacts', href: '/sales/contacts' },
        ]}
        showActions={true}
        onAddClick={() => router.push('/sales/contacts/new')}
        onFilterClick={() => console.log('Filter clicked')}
        onImportClick={() => console.log('Import clicked')}
        onExportClick={() => console.log('Export clicked')}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Contacts"
          value={contactStats.all}
          subtitle={contactStats.all === 0 ? 'No contacts' : `${contactStats.all} ${contactStats.all === 1 ? 'contact' : 'contacts'}`}
          icon={Users}
          colorScheme="orange"
        />
        <KPICard
          title="With Email"
          value={contactStats.withEmail}
          subtitle={`${Math.round((contactStats.withEmail / contactStats.all) * 100) || 0}% of total`}
          icon={Mail}
          colorScheme="orange"
        />
        <KPICard
          title="With Phone"
          value={contactStats.withPhone}
          subtitle={`${Math.round((contactStats.withPhone / contactStats.all) * 100) || 0}% of total`}
          icon={Phone}
          colorScheme="orange"
        />
        <KPICard
          title="With Company"
          value={contactStats.withCompany}
          subtitle={`${Math.round((contactStats.withCompany / contactStats.all) * 100) || 0}% of total`}
          icon={Building2}
          colorScheme="orange"
        />
      </div>

      {/* Tabs */}
      <TabsWithActions
        tabs={tabItems.map((item) => ({
          key: item.key,
          label: item.label,
          badge: item.count.toString(),
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch={true}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search..."
        showAdd={true}
        onAddClick={() => router.push('/sales/contacts/new')}
        addTitle="Add Contact"
        showFilter={true}
        onFilterClick={() => console.log('Filter clicked')}
        showColumnVisibility={true}
        onColumnVisibilityClick={() => console.log('Column visibility clicked')}
        showExport={true}
        onExportClick={() => console.log('Export clicked')}
        exportTitle="Export"
      />

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{filteredContacts.length}</span> result
        {filteredContacts.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" message="Loading contacts..." />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedContacts}
              keyField="id"
              variant="modern"
              onRowClick={(row) => router.push(`/sales/contacts/${row.id}`)}
            />
            {paginatedContacts.length === 0 && (
              <div className="p-12 text-center border-t border-gray-200">
                <div className="text-gray-400 mb-2">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No contacts found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || activeTab !== 'all' ? 'Try adjusting your filters' : 'Add your first contact to get started'}
                </p>
                {!searchQuery && activeTab === 'all' && (
                  <Button variant="primary" onClick={() => router.push('/sales/contacts/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredContacts.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
