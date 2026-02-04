'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Receipt,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
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

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Mock data - replace with API call
  useEffect(() => {
    // TODO: Fetch invoices from API
    setInvoices([]);
  }, []);

  // Calculate statistics
  const invoiceStats = {
    all: invoices.length,
    draft: invoices.filter((i) => i.status?.toLowerCase() === 'draft').length,
    sent: invoices.filter((i) => i.status?.toLowerCase() === 'sent').length,
    paid: invoices.filter((i) => i.status?.toLowerCase() === 'paid').length,
    overdue: invoices.filter((i) => i.status?.toLowerCase() === 'overdue').length,
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    if (!invoice) return false;
    const matchesSearch =
      searchQuery === '' ||
      invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || invoice.status?.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Tab items
  const tabItems = [
    { key: 'all', label: 'All Invoices', count: invoiceStats.all },
    { key: 'draft', label: 'Draft', count: invoiceStats.draft },
    { key: 'sent', label: 'Sent', count: invoiceStats.sent },
    { key: 'paid', label: 'Paid', count: invoiceStats.paid },
    { key: 'overdue', label: 'Overdue', count: invoiceStats.overdue },
  ];

  const columns = [
    {
      key: 'invoice',
      label: 'INVOICE',
      render: (_, invoice) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{invoice.invoiceNumber || 'No number'}</div>
            <div className="text-sm text-gray-500 truncate">{invoice.title || 'Untitled Invoice'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'CLIENT',
      render: (_, invoice) => (
        <div className="flex items-center gap-2 min-w-[150px]">
          <Avatar fallback={invoice.clientName?.[0] || 'C'} size="sm" className="flex-shrink-0 bg-blue-100 text-blue-600" />
          <span className="text-sm text-gray-600 truncate">{invoice.clientName || 'No client'}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'AMOUNT',
      render: (_, invoice) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-gray-900">{formatCurrency(invoice.amount || 0)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (_, invoice) => {
        const status = invoice.status?.toLowerCase() || 'draft';
        const statusConfig = {
          draft: { variant: 'default', label: 'Draft' },
          sent: { variant: 'info', label: 'Sent' },
          paid: { variant: 'success', label: 'Paid' },
          overdue: { variant: 'danger', label: 'Overdue' },
          cancelled: { variant: 'danger', label: 'Cancelled' },
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
      key: 'issueDate',
      label: 'ISSUE DATE',
      render: (_, invoice) => (
        <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{formatDate(invoice.issueDate)}</span>
        </div>
      ),
    },
    {
      key: 'dueDate',
      label: 'DUE DATE',
      render: (_, invoice) => (
        <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{formatDate(invoice.dueDate)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <CRMPageHeader
        title="Invoices"
        subtitle="View and manage client invoices"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Clients', href: '/clients' },
          { label: 'Invoices', href: '/clients/invoices' },
        ]}
        showActions={true}
        onAddClick={() => router.push('/clients/invoices/new')}
        onFilterClick={() => console.log('Filter clicked')}
        onImportClick={() => console.log('Import clicked')}
        onExportClick={() => console.log('Export clicked')}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Invoices"
          value={invoiceStats.all}
          subtitle={invoiceStats.all === 0 ? 'No invoices' : `${invoiceStats.all} ${invoiceStats.all === 1 ? 'invoice' : 'invoices'}`}
          icon={Receipt}
          colorScheme="orange"
        />
        <KPICard
          title="Draft"
          value={invoiceStats.draft}
          subtitle={`${invoiceStats.draft} ${invoiceStats.draft === 1 ? 'invoice' : 'invoices'}`}
          icon={Receipt}
          colorScheme="orange"
        />
        <KPICard
          title="Sent"
          value={invoiceStats.sent}
          subtitle={`${invoiceStats.sent} ${invoiceStats.sent === 1 ? 'invoice' : 'invoices'}`}
          icon={AlertCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Paid"
          value={invoiceStats.paid}
          subtitle={`${invoiceStats.paid} ${invoiceStats.paid === 1 ? 'invoice' : 'invoices'}`}
          icon={CheckCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Overdue"
          value={invoiceStats.overdue}
          subtitle={`${invoiceStats.overdue} ${invoiceStats.overdue === 1 ? 'invoice' : 'invoices'}`}
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
        onAddClick={() => router.push('/clients/invoices/new')}
        addTitle="Create Invoice"
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
        Showing <span className="font-semibold text-gray-900">{filteredInvoices.length}</span> result
        {filteredInvoices.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" message="Loading invoices..." />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedInvoices}
              keyField="id"
              variant="modern"
              onRowClick={(row) => router.push(`/clients/invoices/${row.id}`)}
            />
            {paginatedInvoices.length === 0 && (
              <div className="p-12 text-center border-t border-gray-200">
                <div className="text-gray-400 mb-2">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No invoices found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || activeTab !== 'all' ? 'Try adjusting your filters' : 'Create your first invoice to get started'}
                </p>
                {!searchQuery && activeTab === 'all' && (
                  <Button variant="primary" onClick={() => router.push('/clients/invoices/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredInvoices.length}
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
