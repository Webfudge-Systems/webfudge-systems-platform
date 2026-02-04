'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';
import {
  Button,
  Table,
  Pagination,
  Avatar,
  Badge,
  LoadingSpinner,
  TabsWithActions,
  KPICard,
} from '@webfudge/ui';
import CRMPageHeader from '../../../components/CRMPageHeader';

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

export default function ProposalsPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Mock data - replace with API call
  useEffect(() => {
    // TODO: Fetch proposals from API
    setProposals([]);
  }, []);

  // Calculate statistics
  const proposalStats = {
    all: proposals.length,
    draft: proposals.filter((p) => p.status?.toLowerCase() === 'draft').length,
    sent: proposals.filter((p) => p.status?.toLowerCase() === 'sent').length,
    accepted: proposals.filter((p) => p.status?.toLowerCase() === 'accepted').length,
    rejected: proposals.filter((p) => p.status?.toLowerCase() === 'rejected').length,
  };

  // Filter proposals
  const filteredProposals = proposals.filter((proposal) => {
    if (!proposal) return false;
    const matchesSearch =
      searchQuery === '' ||
      proposal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || proposal.status?.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProposals.length / itemsPerPage);
  const paginatedProposals = filteredProposals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Tab items
  const tabItems = [
    { key: 'all', label: 'All Proposals', count: proposalStats.all },
    { key: 'draft', label: 'Draft', count: proposalStats.draft },
    { key: 'sent', label: 'Sent', count: proposalStats.sent },
    { key: 'accepted', label: 'Accepted', count: proposalStats.accepted },
    { key: 'rejected', label: 'Rejected', count: proposalStats.rejected },
  ];

  const columns = [
    {
      key: 'proposal',
      label: 'PROPOSAL',
      render: (_, proposal) => (
        <div className="flex items-center gap-3 min-w-[250px]">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{proposal.title || 'Untitled Proposal'}</div>
            <div className="text-sm text-gray-500 truncate">{proposal.proposalNumber || 'No number'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'CLIENT',
      render: (_, proposal) => (
        <div className="flex items-center gap-2 min-w-[150px]">
          <Avatar fallback={proposal.clientName?.[0] || 'C'} size="sm" className="flex-shrink-0" />
          <span className="text-sm text-gray-600 truncate">{proposal.clientName || 'No client'}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'AMOUNT',
      render: (_, proposal) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-gray-900">{formatCurrency(proposal.amount || 0)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (_, proposal) => {
        const status = proposal.status?.toLowerCase() || 'draft';
        const statusConfig = {
          draft: { variant: 'default', label: 'Draft' },
          sent: { variant: 'info', label: 'Sent' },
          accepted: { variant: 'success', label: 'Accepted' },
          rejected: { variant: 'danger', label: 'Rejected' },
        };
        const config = statusConfig[status] || statusConfig.draft;
        return (
          <Badge variant={config.variant} className="font-semibold">
            {config.label.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'date',
      label: 'DATE',
      render: (_, proposal) => (
        <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{formatDate(proposal.date)}</span>
        </div>
      ),
    },
    {
      key: 'validUntil',
      label: 'VALID UNTIL',
      render: (_, proposal) => (
        <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{formatDate(proposal.validUntil)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Proposals"
        subtitle="Create and manage proposals for clients"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Clients', href: '/clients' },
          { label: 'Proposals', href: '/clients/proposals' },
        ]}
        showActions={true}
        onAddClick={() => router.push('/clients/proposals/new')}
        onFilterClick={() => console.log('Filter clicked')}
        onImportClick={() => console.log('Import clicked')}
        onExportClick={() => console.log('Export clicked')}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Proposals"
          value={proposalStats.all}
          subtitle={proposalStats.all === 0 ? 'No proposals' : `${proposalStats.all} ${proposalStats.all === 1 ? 'proposal' : 'proposals'}`}
          icon={FileText}
          colorScheme="orange"
        />
        <KPICard
          title="Draft"
          value={proposalStats.draft}
          subtitle={`${proposalStats.draft} ${proposalStats.draft === 1 ? 'proposal' : 'proposals'}`}
          icon={FileText}
          colorScheme="orange"
        />
        <KPICard
          title="Sent"
          value={proposalStats.sent}
          subtitle={`${proposalStats.sent} ${proposalStats.sent === 1 ? 'proposal' : 'proposals'}`}
          icon={Send}
          colorScheme="orange"
        />
        <KPICard
          title="Accepted"
          value={proposalStats.accepted}
          subtitle={`${proposalStats.accepted} ${proposalStats.accepted === 1 ? 'proposal' : 'proposals'}`}
          icon={CheckCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Rejected"
          value={proposalStats.rejected}
          subtitle={`${proposalStats.rejected} ${proposalStats.rejected === 1 ? 'proposal' : 'proposals'}`}
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
        onAddClick={() => router.push('/clients/proposals/new')}
        addTitle="Create Proposal"
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
        Showing <span className="font-semibold text-gray-900">{filteredProposals.length}</span> result
        {filteredProposals.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" message="Loading proposals..." />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedProposals}
              keyField="id"
              variant="modern"
              onRowClick={(row) => router.push(`/clients/proposals/${row.id}`)}
            />
            {paginatedProposals.length === 0 && (
              <div className="p-12 text-center border-t border-gray-200">
                <div className="text-gray-400 mb-2">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No proposals found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || activeTab !== 'all' ? 'Try adjusting your filters' : 'Create your first proposal to get started'}
                </p>
                {!searchQuery && activeTab === 'all' && (
                  <Button variant="primary" onClick={() => router.push('/clients/proposals/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Proposal
                  </Button>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredProposals.length}
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
