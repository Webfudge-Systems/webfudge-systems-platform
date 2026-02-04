'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
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
import dealService from '../../../lib/api/dealService';

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

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const res = await dealService.getAll({
        sort: 'createdAt:desc',
        'pagination[pageSize]': 100,
        populate: ['leadCompany', 'clientAccount', 'contact', 'assignedTo'],
      });
      setDeals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const dealStats = {
    all: deals.length,
    prospect: deals.filter((d) => d.stage?.toLowerCase() === 'prospect').length,
    proposal: deals.filter((d) => d.stage?.toLowerCase() === 'proposal').length,
    negotiation: deals.filter((d) => d.stage?.toLowerCase() === 'negotiation').length,
    won: deals.filter((d) => d.stage?.toLowerCase() === 'won').length,
    lost: deals.filter((d) => d.stage?.toLowerCase() === 'lost').length,
  };

  // Filter deals
  const filteredDeals = deals.filter((deal) => {
    if (!deal) return false;
    const matchesSearch =
      searchQuery === '' ||
      deal.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.leadCompany?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.clientAccount?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || deal.stage?.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDeals.length / itemsPerPage);
  const paginatedDeals = filteredDeals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Tab items
  const tabItems = [
    { key: 'all', label: 'All Deals', count: dealStats.all },
    { key: 'prospect', label: 'Prospect', count: dealStats.prospect },
    { key: 'proposal', label: 'Proposal', count: dealStats.proposal },
    { key: 'negotiation', label: 'Negotiation', count: dealStats.negotiation },
    { key: 'won', label: 'Won', count: dealStats.won },
    { key: 'lost', label: 'Lost', count: dealStats.lost },
  ];

  const columns = [
    {
      key: 'deal',
      label: 'DEAL',
      render: (_, deal) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{deal.name || 'Unnamed Deal'}</div>
            <div className="text-sm text-gray-500 truncate">{deal.description || 'No description'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      label: 'COMPANY',
      render: (_, deal) => (
        <div className="flex items-center gap-2 min-w-[150px]">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 truncate">
            {deal.leadCompany?.name || deal.clientAccount?.name || deal.contact?.name || 'No company'}
          </span>
        </div>
      ),
    },
    {
      key: 'value',
      label: 'VALUE',
      render: (_, deal) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-gray-900">{formatCurrency(deal.value || 0)}</span>
        </div>
      ),
    },
    {
      key: 'stage',
      label: 'STAGE',
      render: (_, deal) => {
        const stage = deal.stage?.toLowerCase() || 'prospect';
        const stageConfig = {
          prospect: { variant: 'primary', label: 'Prospect' },
          proposal: { variant: 'warning', label: 'Proposal' },
          negotiation: { variant: 'info', label: 'Negotiation' },
          won: { variant: 'success', label: 'Won' },
          lost: { variant: 'danger', label: 'Lost' },
        };
        const config = stageConfig[stage] || stageConfig.prospect;
        return (
          <Badge variant={config.variant} className="font-semibold">
            {config.label.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'assignedTo',
      label: 'ASSIGNED TO',
      render: (_, deal) => {
        const assignedUser = deal.assignedTo;
        const assignedName = assignedUser
          ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() ||
          assignedUser.username ||
          'Unknown'
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
      render: (_, deal) => (
        <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{formatDate(deal.createdAt)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Deals"
        subtitle="Manage opportunities and sales pipeline"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sales', href: '/sales' },
          { label: 'Deals', href: '/sales/deals' },
        ]}
        showActions={true}
        onAddClick={() => router.push('/sales/deals/new')}
        onFilterClick={() => console.log('Filter clicked')}
        onImportClick={() => console.log('Import clicked')}
        onExportClick={() => console.log('Export clicked')}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="New Deals"
          value={dealStats.all}
          subtitle={`${dealStats.all} ${dealStats.all === 1 ? 'deal' : 'deals'}`}
          icon={Briefcase}
          colorScheme="orange"
        />
        <KPICard
          title="Contacted Deals"
          value={dealStats.prospect}
          subtitle={`${dealStats.prospect} ${dealStats.prospect === 1 ? 'deal' : 'deals'}`}
          icon={Target}
          colorScheme="orange"
        />
        <KPICard
          title="Qualified Deals"
          value={dealStats.proposal}
          subtitle={dealStats.proposal === 0 ? 'No deals' : `${dealStats.proposal} ${dealStats.proposal === 1 ? 'deal' : 'deals'}`}
          icon={TrendingUp}
          colorScheme="orange"
        />
        <KPICard
          title="Lost Deals"
          value={dealStats.lost}
          subtitle={dealStats.lost === 0 ? 'No deals' : `${dealStats.lost} ${dealStats.lost === 1 ? 'deal' : 'deals'}`}
          icon={Users}
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
        onAddClick={() => router.push('/sales/deals/new')}
        addTitle="Add Deal"
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
        Showing <span className="font-semibold text-gray-900">{filteredDeals.length}</span> result
        {filteredDeals.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" message="Loading deals..." />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedDeals}
              keyField="id"
              variant="modern"
              onRowClick={(row) => router.push(`/sales/deals/${row.id}`)}
            />
            {paginatedDeals.length === 0 && (
              <div className="p-12 text-center border-t border-gray-200">
                <div className="text-gray-400 mb-2">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No deals found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || activeTab !== 'all' ? 'Try adjusting your filters' : 'Create your first deal to get started'}
                </p>
                {!searchQuery && activeTab === 'all' && (
                  <div className="flex gap-3 justify-center">
                    <Button variant="primary" onClick={() => router.push('/sales/deals/new')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Deal
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/sales/deals/pipeline')}>
                      View Pipeline
                    </Button>
                  </div>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredDeals.length}
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
