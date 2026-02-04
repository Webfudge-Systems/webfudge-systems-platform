'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Building2,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Users,
} from 'lucide-react';
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
import clientAccountService from '../../../lib/api/clientAccountService';

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

export default function ClientAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await clientAccountService.getAll({
        sort: 'createdAt:desc',
        'pagination[pageSize]': 100,
        populate: ['contacts', 'assignedTo', 'deals'],
      });
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching client accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const clientStats = {
    all: accounts.length,
    active: accounts.filter((a) => a.status?.toLowerCase() === 'active').length,
    inactive: accounts.filter((a) => a.status?.toLowerCase() === 'inactive').length,
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    if (!account) return false;
    const matchesSearch =
      searchQuery === '' ||
      account.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'all' || account.status?.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  // Pagination
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Tab items
  const tabItems = [
    { key: 'all', label: 'All Clients', count: clientStats.all },
    { key: 'active', label: 'Active', count: clientStats.active },
    { key: 'inactive', label: 'Inactive', count: clientStats.inactive },
  ];

  const columns = [
    {
      key: 'company',
      label: 'COMPANY',
      render: (_, account) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <Avatar
            fallback={account.companyName?.[0] || account.name?.[0] || 'C'}
            alt={account.companyName || account.name}
            size="sm"
            className="flex-shrink-0 bg-blue-100 text-blue-600"
          />
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {account.companyName || account.name || 'Unnamed'}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {account.contacts && account.contacts.length > 0
                ? `${account.contacts.length} contact${account.contacts.length !== 1 ? 's' : ''}`
                : 'No contacts'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact-info',
      label: 'CONTACT INFO',
      render: (_, account) => (
        <div className="space-y-1 min-w-[200px]">
          <div className="flex items-center gap-2 text-sm text-gray-900">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{account.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{account.phone || 'No phone'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (_, account) => {
        const status = account.status?.toLowerCase() || 'active';
        const statusConfig = {
          active: { variant: 'success', label: 'Active', icon: CheckCircle },
          inactive: { variant: 'danger', label: 'Inactive', icon: AlertCircle },
        };
        const config = statusConfig[status] || statusConfig.active;
        return (
          <Badge variant={config.variant} className="font-semibold">
            {config.label.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'deals',
      label: 'DEALS',
      render: (_, account) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{account.deals ? account.deals.length : 0}</span>
        </div>
      ),
    },
    {
      key: 'assignedTo',
      label: 'ASSIGNED TO',
      render: (_, account) => {
        const assignedUser = account.assignedTo;
        const assignedName = assignedUser
          ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() ||
          assignedUser.username ||
          'Unknown'
          : 'Unassigned';
        return (
          <div className="flex items-center gap-2 min-w-[150px]">
            <Avatar
              fallback={(assignedName || '?').charAt(0).toUpperCase()}
              alt={assignedName}
              size="sm"
              className="flex-shrink-0"
            />
            <span className="text-sm text-gray-600 truncate">{assignedName}</span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'CREATED',
      render: (_, account) => (
        <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{formatDate(account.createdAt)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Client Accounts"
        subtitle="Manage your client accounts and relationships"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Clients', href: '/clients' },
          { label: 'Accounts', href: '/clients/accounts' },
        ]}
        showActions={true}
        onAddClick={() => router.push('/clients/accounts/new')}
        onFilterClick={() => console.log('Filter clicked')}
        onImportClick={() => console.log('Import clicked')}
        onExportClick={() => console.log('Export clicked')}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Clients"
          value={clientStats.all}
          subtitle={clientStats.all === 0 ? 'No clients' : `${clientStats.all} ${clientStats.all === 1 ? 'client' : 'clients'}`}
          icon={Building2}
          colorScheme="orange"
        />
        <KPICard
          title="Active Clients"
          value={clientStats.active}
          subtitle={clientStats.active === 0 ? 'No clients' : `${clientStats.active} ${clientStats.active === 1 ? 'client' : 'clients'}`}
          icon={CheckCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Inactive Clients"
          value={clientStats.inactive}
          subtitle={clientStats.inactive === 0 ? 'No clients' : `${clientStats.inactive} ${clientStats.inactive === 1 ? 'client' : 'clients'}`}
          icon={AlertCircle}
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
        onAddClick={() => router.push('/clients/accounts/new')}
        addTitle="Add Client Account"
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
        Showing <span className="font-semibold text-gray-900">{filteredAccounts.length}</span> result
        {filteredAccounts.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" message="Loading client accounts..." />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedAccounts}
              keyField="id"
              variant="modern"
              onRowClick={(row) => router.push(`/clients/accounts/${row.id}`)}
            />
            {paginatedAccounts.length === 0 && (
              <div className="p-12 text-center border-t border-gray-200">
                <div className="text-gray-400 mb-2">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No client accounts found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || activeTab !== 'all' ? 'Try adjusting your filters' : 'Add your first client account to get started'}
                </p>
                {!searchQuery && activeTab === 'all' && (
                  <Button variant="primary" onClick={() => router.push('/clients/accounts/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client Account
                  </Button>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAccounts.length}
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
