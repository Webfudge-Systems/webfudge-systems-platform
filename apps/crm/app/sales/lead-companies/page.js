'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Mail,
  Phone,
  Calendar,
  User,
  Building2,
  CheckCircle,
  XCircle,
  PhoneCall,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  Button,
  Card,
  Table,
  EmptyState,
  Pagination,
  Badge,
  Avatar,
  LoadingSpinner,
  TabsWithActions,
  KPICard,
} from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';
import leadCompanyService from '../../../lib/api/leadCompanyService';

// Utility function to format currency
const formatCurrency = (value) => {
  if (!value) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

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

export default function LeadCompaniesPage() {
  const router = useRouter();
  const [leadCompanies, setLeadCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [loadingActions, setLoadingActions] = useState({});
  const itemsPerPage = 15;

  // Fetch lead companies
  useEffect(() => {
    fetchLeadCompanies();
    fetchStats();
  }, []);

  const fetchLeadCompanies = async () => {
    try {
      setLoading(true);
      const response = await leadCompanyService.getAll({
        sort: 'createdAt:desc',
        'pagination[pageSize]': 100,
        populate: ['contacts', 'assignedTo', 'deals'],
      });
      setLeadCompanies(response.data || []);
    } catch (err) {
      console.error('Error fetching lead companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await leadCompanyService.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Calculate statistics
  const leadStats = {
    new: stats.byStatus?.NEW || leadCompanies.filter((c) => c.status?.toUpperCase() === 'NEW').length,
    contacted: stats.byStatus?.CONTACTED || leadCompanies.filter((c) => c.status?.toUpperCase() === 'CONTACTED').length,
    qualified: stats.byStatus?.QUALIFIED || leadCompanies.filter((c) => c.status?.toUpperCase() === 'QUALIFIED').length,
    lost: stats.byStatus?.LOST || leadCompanies.filter((c) => c.status?.toUpperCase() === 'LOST').length,
  };

  // Filter companies based on search and tab
  const filteredCompanies = leadCompanies.filter((company) => {
    if (!company) return false;

    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      company.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.contacts?.some(
        (c) =>
          c.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Tab filter
    const matchesTab = activeTab === 'all' || company.status?.toLowerCase() === activeTab.toLowerCase();

    return matchesSearch && matchesTab;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Tab items
  const tabItems = [
    { key: 'all', label: 'All Companies', count: leadCompanies.length },
    { key: 'new', label: 'New', count: leadStats.new },
    { key: 'contacted', label: 'Contacted', count: leadStats.contacted },
    { key: 'qualified', label: 'Qualified', count: leadStats.qualified },
    { key: 'lost', label: 'Lost', count: leadStats.lost },
  ];

  // Table columns
  const columns = [
    {
      key: 'company',
      label: 'COMPANY',
      render: (_, company) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <Avatar fallback={company.companyName?.[0] || 'C'} alt={company.companyName} size="sm" className="flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{company.companyName || 'Unnamed'}</div>
            <div className="text-sm text-gray-500 truncate">
              {company.contacts && company.contacts.length > 0
                ? `${company.contacts[0].firstName} ${company.contacts[0].lastName}`
                : 'No primary contact'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'PRIMARY CONTACT',
      render: (_, company) => (
        <div className="space-y-1 min-w-[200px]">
          <div className="flex items-center gap-2 text-sm text-gray-900">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">
              {company.contacts && company.contacts.length > 0
                ? company.contacts[0].email
                : company.email || 'No email'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">
              {company.contacts && company.contacts.length > 0
                ? company.contacts[0].phone || 'No contact'
                : company.phone || 'No contact'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (_, company) => {
        const status = company.status?.toLowerCase() || 'new';
        const statusConfig = {
          new: { variant: 'primary', label: 'New' },
          contacted: { variant: 'warning', label: 'Contacted' },
          qualified: { variant: 'success', label: 'Qualified' },
          lost: { variant: 'danger', label: 'Lost' },
        };
        const config = statusConfig[status] || statusConfig.new;
        return (
          <Badge variant={config.variant} className="font-semibold">
            {config.label.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'source',
      label: 'SOURCE',
      render: (_, company) => (
        <span className="text-sm text-gray-600 capitalize whitespace-nowrap">
          {company.source?.replace('_', ' ') || 'N/A'}
        </span>
      ),
    },
    {
      key: 'value',
      label: 'DEAL VALUE',
      render: (_, company) => {
        const totalDealValue = company.deals
          ? company.deals.reduce((total, deal) => total + (parseFloat(deal.value) || 0), 0)
          : company.dealValue || 0;
        return <span className="font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(totalDealValue)}</span>;
      },
    },
    {
      key: 'contacts',
      label: 'CONTACTS',
      render: (_, company) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <UserPlus className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{company.contacts ? company.contacts.length : 0}</span>
        </div>
      ),
    },
    {
      key: 'assignedTo',
      label: 'ASSIGNED TO',
      render: (_, company) => {
        const assignedUser = company.assignedTo;
        const assignedName = assignedUser
          ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.username || 'Unknown'
          : 'Unassigned';
        return (
          <div className="flex items-center gap-2 min-w-[150px]">
            <Avatar fallback={(assignedName || '?').charAt(0).toUpperCase()} alt={assignedName} size="sm" className="flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">{assignedName}</span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'CREATED',
      render: (_, company) => (
        <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{formatDate(company.createdAt)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      render: (_, company) => (
        <div className="flex items-center gap-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleStatusUpdate(company.id, 'CONTACTED');
            }}
            disabled={loadingActions[`${company.id}-contacted`]}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 p-2 rounded-lg transition-all duration-200 disabled:opacity-50"
            title="Mark as Contacted"
          >
            {loadingActions[`${company.id}-contacted`] ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleStatusUpdate(company.id, 'QUALIFIED');
            }}
            disabled={loadingActions[`${company.id}-qualified`]}
            className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-lg transition-all duration-200 disabled:opacity-50"
            title="Mark as Qualified"
          >
            {loadingActions[`${company.id}-qualified`] ? (
              <LoadingSpinner size="sm" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setCompanyToDelete(company);
              setShowDeleteModal(true);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
            title="Delete Company"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Handle status updates
  const handleStatusUpdate = async (companyId, newStatus) => {
    if (!companyId) return;
    const loadingKey = `${companyId}-${newStatus.toLowerCase()}`;
    setLoadingActions((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      await leadCompanyService.update(companyId, {
        status: newStatus.toUpperCase(),
      });
      setLeadCompanies((prevCompanies) =>
        prevCompanies.map((company) =>
          company?.id === companyId ? { ...company, status: newStatus.toLowerCase() } : company
        )
      );
      await fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setLoadingActions((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Handle delete company
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    const loadingKey = `${companyToDelete.id}-delete`;
    setLoadingActions((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      await leadCompanyService.delete(companyToDelete.id);
      setLeadCompanies((prev) => prev.filter((company) => company.id !== companyToDelete.id));
      await fetchStats();
      setShowDeleteModal(false);
      setCompanyToDelete(null);
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Failed to delete company. Please try again.');
    } finally {
      setLoadingActions((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <CRMPageHeader
        title="Lead Companies"
        subtitle="Track and manage potential client companies"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sales', href: '/sales' },
          { label: 'Lead Companies', href: '/sales/lead-companies' },
        ]}
        showActions={true}
        onAddClick={() => router.push('/sales/lead-companies/new')}
        onFilterClick={() => console.log('Filter clicked')}
        onImportClick={() => console.log('Import clicked')}
        onExportClick={() => console.log('Export clicked')}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="New Leads"
          value={leadStats.new}
          subtitle={leadStats.new === 0 ? 'No leads' : `${leadStats.new} ${leadStats.new === 1 ? 'lead' : 'leads'}`}
          icon={Building2}
          colorScheme="orange"
        />
        <KPICard
          title="Contacted Leads"
          value={leadStats.contacted}
          subtitle={leadStats.contacted === 0 ? 'No leads' : `${leadStats.contacted} ${leadStats.contacted === 1 ? 'lead' : 'leads'}`}
          icon={PhoneCall}
          colorScheme="orange"
        />
        <KPICard
          title="Qualified Leads"
          value={leadStats.qualified}
          subtitle={leadStats.qualified === 0 ? 'No leads' : `${leadStats.qualified} ${leadStats.qualified === 1 ? 'lead' : 'leads'}`}
          icon={CheckCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Lost Leads"
          value={leadStats.lost}
          subtitle={leadStats.lost === 0 ? 'No leads' : `${leadStats.lost} ${leadStats.lost === 1 ? 'lead' : 'leads'}`}
          icon={XCircle}
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
        onAddClick={() => router.push('/sales/lead-companies/new')}
        addTitle="Add Lead Company"
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
        Showing <span className="font-semibold text-gray-900">{filteredCompanies.length}</span> result
        {filteredCompanies.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" message="Loading lead companies..." />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedCompanies}
              keyField="id"
              variant="modern"
              onRowClick={(row) => router.push(`/sales/lead-companies/${row.id}`)}
            />
            {paginatedCompanies.length === 0 && (
              <div className="p-12 text-center border-t border-gray-200">
                <div className="text-gray-400 mb-2">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No lead companies found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || activeTab !== 'all' ? 'Try adjusting your filters' : 'Add your first lead company to get started'}
                </p>
                {!searchQuery && activeTab === 'all' && (
                  <Button variant="primary" onClick={() => router.push('/sales/lead-companies/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lead Company
                  </Button>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredCompanies.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && companyToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card variant="glass" className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Lead Company</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Are you sure you want to delete <strong>{companyToDelete.companyName}</strong>?
              </p>
              <Card className="bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700 font-medium mb-2">⚠️ This will permanently delete:</p>
                <ul className="text-sm text-red-600 space-y-1">
                  <li>• Company information and details</li>
                  <li>• All associated contacts</li>
                  <li>• All deals and proposals</li>
                  <li>• Activity history and notes</li>
                </ul>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCompanyToDelete(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteCompany}
                disabled={loadingActions[`${companyToDelete.id}-delete`]}
                variant="danger"
                className="flex-1"
              >
                {loadingActions[`${companyToDelete.id}-delete`] ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete Company
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
