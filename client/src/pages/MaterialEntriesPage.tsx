import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Filter,
  Receipt,
  IndianRupee,
  Building2,
  Truck,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  FileText,
  CreditCard,
  Pencil,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { CacheManager } from '@/lib/CacheManager';
import SiteMaterialsView from './SiteMaterialsView';

type PresetFilter = 'ALL' | 'PAST_WEEK_ENTRIES' | 'PAST_MONTH_ENTRIES' | 'PAST_WEEK_PAYMENTS' | 'PAST_MONTH_PAYMENTS' | 'PENDING_ONLY' | 'PAID_ONLY';

export default function MaterialEntriesPage() {
  const confirmDialog = useConfirm();
  const queryClient = useQueryClient();
  const { id: siteId } = useParams();

  // If siteId in route params (e.g. /materials/:id), render site materials view
  if (siteId) {
    return <SiteMaterialsView projectId={siteId} />;
  }

  // Active Tab: 'ENTRIES' (Material Entries & Bills), 'STOCK' (Site Inventory Levels), 'CATALOG' (Directory)
  const [activeTab, setActiveTab] = useState<'ENTRIES' | 'STOCK' | 'CATALOG'>('ENTRIES');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('ALL');
  const [selectedSiteId, setSelectedSiteId] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isViewItemsOpen, setIsViewItemsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Directory Modals state
  const [isAddDirOpen, setIsAddDirOpen] = useState(false);
  const [newDir, setNewDir] = useState({
    name: '',
    unit: 'BAGS',
    rate: '',
    gstRate: '18',
  });
  const [isEditDirOpen, setIsEditDirOpen] = useState(false);
  const [editDir, setEditDir] = useState<any | null>(null);

  // Quick Add listener
  useQuickAddListener('material', () => setIsCreateOpen(true));

  // Create Order state
  const [newOrder, setNewOrder] = useState({
    vendorId: '',
    projectId: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    notes: '',
    items: [{ materialId: '', quantityOrdered: '', rate: '' }],
    gstMode: 'NONE',
    gstPercentage: 18,
    gstAmount: '',
    initialPaidAmount: '',
    paymentMethod: 'BANK_TRANSFER',
    accountId: '',
  });
  const [selectedVendorAgency, setSelectedVendorAgency] = useState('');

  // Pay Modal state
  const [payFormData, setPayFormData] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    accountId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    remarks: '',
  });

  // Settings
  const { data: settings } = useQuery({
    queryKey: ['financial-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data?.data?.settings || {};
    },
  });

  useEffect(() => {
    if (settings && isCreateOpen) {
      if (settings.defaultGstMode && newOrder.gstMode === 'NONE') {
        setNewOrder((prev) => ({
          ...prev,
          gstMode: settings.defaultGstMode,
          gstPercentage: settings.defaultGstPercentage || 18,
        }));
      }
    }
  }, [settings, isCreateOpen]);

  // Handle Preset Filters -> Date calculations
  const handlePresetChange = (preset: PresetFilter) => {
    setPresetFilter(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      setPaymentStatusFilter('ALL');
    } else if (preset === 'PAST_WEEK_ENTRIES' || preset === 'PAST_WEEK_PAYMENTS') {
      const pastWeek = new Date();
      pastWeek.setDate(now.getDate() - 7);
      setStartDate(pastWeek.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setPaymentStatusFilter('ALL');
    } else if (preset === 'PAST_MONTH_ENTRIES' || preset === 'PAST_MONTH_PAYMENTS') {
      const pastMonth = new Date();
      pastMonth.setDate(now.getDate() - 30);
      setStartDate(pastMonth.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setPaymentStatusFilter('ALL');
    } else if (preset === 'PENDING_ONLY') {
      setStartDate('');
      setEndDate('');
      setPaymentStatusFilter('PENDING');
    } else if (preset === 'PAID_ONLY') {
      setStartDate('');
      setEndDate('');
      setPaymentStatusFilter('PAID');
    }
  };

  // Queries
  const { data: ordersResponse, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['material-orders', startDate, endDate, selectedSiteId],
    queryFn: async () => {
      let url = '/material-orders?limit=1000';
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      if (selectedSiteId && selectedSiteId !== 'ALL') {
        url += `&projectId=${selectedSiteId}`;
      }
      const { data } = await api.get(url);
      return data.data;
    },
  });

  const rawOrdersList = useMemo(() => ordersResponse?.data || [], [ordersResponse]);
  const ordersSummary = useMemo(() => ordersResponse?.summary || {}, [ordersResponse]);

  const { data: stockData = [], isLoading: isStockLoading } = useQuery({
    queryKey: ['material-stock'],
    queryFn: async () => {
      const { data } = await api.get('/materials/stock');
      return data.data?.data || [];
    },
  });

  const { data: materialsList = [] } = useQuery({
    queryKey: ['materials-list'],
    queryFn: async () => {
      const { data } = await api.get('/materials?limit=1000');
      return data.data?.data || [];
    },
  });

  const { data: vendorsList = [] } = useQuery({
    queryKey: ['vendors-select'],
    queryFn: async () => {
      const { data } = await api.get('/vendors?limit=1000');
      return data.data?.data || [];
    },
  });

  const { data: projectsList = [] } = useQuery({
    queryKey: ['projects-select'],
    queryFn: async () => {
      const { data } = await api.get('/projects?limit=1000');
      return data.data?.data || [];
    },
  });

  const { data: accountsRaw } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data } = await api.get('/bank-accounts');
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.data?.data)) return data.data.data;
      return [];
    },
  });
  const bankAccounts = Array.isArray(accountsRaw) ? accountsRaw : [];

  // Filtered orders based on search & payment status filter
  const filteredOrders = useMemo(() => {
    return rawOrdersList.filter((order: any) => {
      const matchesSearch =
        searchTerm === '' ||
        order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items?.some((it: any) => it.material?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        paymentStatusFilter === 'ALL' || order.paymentStatus === paymentStatusFilter;

      const matchesSite =
        selectedSiteId === 'ALL' || order.projectId === selectedSiteId;

      return matchesSearch && matchesStatus && matchesSite;
    });
  }, [rawOrdersList, searchTerm, paymentStatusFilter, selectedSiteId]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const totalBills = rawOrdersList.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);
    const totalPaid = rawOrdersList.reduce((sum: number, o: any) => sum + Number(o.paidAmount || 0), 0);
    const totalAdvance = rawOrdersList.reduce((sum: number, o: any) => sum + Number(o.advanceAmount || 0), 0);
    const totalPending = rawOrdersList.reduce((sum: number, o: any) => sum + Number(o.pendingAmount || 0), 0);
    return {
      totalBills,
      totalPaid,
      totalAdvance,
      totalPending,
      count: rawOrdersList.length,
    };
  }, [rawOrdersList]);

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/material-orders', payload);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnMaterial(queryClient);
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      toast.success('Material entry logged successfully');
      setIsCreateOpen(false);
      setSelectedVendorAgency('');
      setNewOrder({
        vendorId: '',
        projectId: '',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        notes: '',
        items: [{ materialId: '', quantityOrdered: '', rate: '' }],
        gstMode: 'NONE',
        gstPercentage: 18,
        gstAmount: '',
        initialPaidAmount: '',
        paymentMethod: 'BANK_TRANSFER',
        accountId: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log material entry');
    },
  });

  const payOrderMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/material-orders/${id}/pay`, payload);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnExpense(queryClient);
      CacheManager.invalidateOnMaterial(queryClient);
      toast.success('Payment recorded and updated across all records');
      setIsPayOpen(false);
      setSelectedOrder(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/material-orders/${id}`);
    },
    onSuccess: () => {
      CacheManager.invalidateOnMaterial(queryClient);
      CacheManager.invalidateOnExpense(queryClient);
      toast.success('Material entry deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete material entry');
    },
  });

  // Directory mutations
  const addDirMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/materials', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-list'] });
      toast.success('Material added to directory');
      setIsAddDirOpen(false);
      setNewDir({ name: '', unit: 'BAGS', rate: '', gstRate: '18' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add material'),
  });

  const updateDirMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/materials/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-list'] });
      toast.success('Material updated');
      setIsEditDirOpen(false);
      setEditDir(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update material'),
  });

  const deleteDirMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-list'] });
      toast.success('Material removed from directory');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete material'),
  });

  // Handlers
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vendorInput = selectedVendorAgency || newOrder.vendorId;
    if (!vendorInput || !newOrder.projectId || !newOrder.items[0].materialId) {
      toast.error('Please fill required vendor, project site, and material details');
      return;
    }

    let finalVendorId = newOrder.vendorId;
    const matchedVendor = vendorsList.find(
      (v: any) => v.id === finalVendorId || v.name.toLowerCase() === vendorInput.trim().toLowerCase()
    );

    if (matchedVendor) {
      finalVendorId = matchedVendor.id;
    } else {
      try {
        const { data: vData } = await api.post('/vendors', {
          name: vendorInput.trim(),
          phone: 'N/A',
          categories: ['MATERIAL'],
        });
        finalVendorId = vData?.data?.id || vData?.id;
        queryClient.invalidateQueries({ queryKey: ['vendors-select'] });
      } catch (err: any) {
        toast.error('Failed to register vendor agency');
        return;
      }
    }

    const formattedItems = newOrder.items.map((it) => ({
      materialId: it.materialId,
      quantityOrdered: Number(it.quantityOrdered) || 1,
      rate: Number(it.rate) || 0,
    }));

    createOrderMutation.mutate({
      vendorId: finalVendorId,
      projectId: newOrder.projectId,
      orderDate: newOrder.orderDate,
      deliveryDate: newOrder.deliveryDate || undefined,
      notes: newOrder.notes,
      gstMode: newOrder.gstMode,
      gstPercentage: newOrder.gstPercentage,
      gstAmount: newOrder.gstMode === 'AMOUNT' ? newOrder.gstAmount : undefined,
      items: formattedItems,
      initialPaidAmount: Number(newOrder.initialPaidAmount) || 0,
      paymentMethod: newOrder.paymentMethod,
      accountId: newOrder.accountId || undefined,
    });
  };

  const handleOpenPayModal = (order: any) => {
    setSelectedOrder(order);
    setPayFormData({
      amount: String(order.pendingAmount > 0 ? order.pendingAmount : order.totalAmount),
      paymentMethod: 'BANK_TRANSFER',
      accountId: bankAccounts[0]?.id || '',
      paymentDate: new Date().toISOString().split('T')[0],
      reference: '',
      remarks: `Payment for material entry ${order.orderNumber}`,
    });
    setIsPayOpen(true);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amountNum = Number(payFormData.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    payOrderMutation.mutate({
      id: selectedOrder.id,
      payload: {
        ...payFormData,
        amount: amountNum,
      },
    });
  };

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading flex items-center gap-3">
            <Package className="w-8 h-8 text-[#7C6EF0]" />
            Material Entries & Site Supplies
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Complete site procurement: track material bills, paid amounts, pending balances, and site stock levels.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Create Material Entry</span>
        </button>
      </div>

      {/* Top Financial & Procurement KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="clay-card p-5 space-y-2 bg-gradient-to-br from-white to-violet-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Material Value</span>
            <div className="p-2 rounded-xl bg-violet-100/60 text-[#7C6EF0]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800 font-heading">
            {formatCurrency(kpis.totalBills)}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Across {kpis.count} material entries logged
          </div>
        </div>

        <div className="clay-card p-5 space-y-2 bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Payment Done (Paid)</span>
            <div className="p-2 rounded-xl bg-emerald-100/60 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-heading">
            {formatCurrency(kpis.totalPaid)}
          </div>
          <div className="text-xs text-emerald-600/80 font-medium">
            {kpis.totalBills > 0 ? Math.round((kpis.totalPaid / kpis.totalBills) * 100) : 0}% cleared
          </div>
        </div>

        <div className="clay-card p-5 space-y-2 bg-gradient-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Payment</span>
            <div className="p-2 rounded-xl bg-amber-100/60 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-heading">
            {formatCurrency(kpis.totalPending)}
          </div>
          <div className="text-xs text-amber-600/80 font-medium">
            Outstanding vendor balances
          </div>
        </div>

        <div className="clay-card p-5 space-y-2 bg-gradient-to-br from-white to-blue-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Advance Done</span>
            <div className="p-2 rounded-xl bg-blue-100/60 text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-600 font-heading">
            {formatCurrency(kpis.totalAdvance)}
          </div>
          <div className="text-xs text-blue-600/80 font-medium">
            Advance payments to suppliers
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-violet-100/30 pb-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'ENTRIES', label: `Material Entries & Bills (${rawOrdersList.length})` },
          { id: 'STOCK', label: `Site Inventory Levels (${projectsList.length} Sites)` },
          { id: 'CATALOG', label: `Material Catalog (${materialsList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[#7C6EF0] text-white shadow-md'
                : 'text-slate-600 hover:bg-violet-50/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MATERIAL ENTRIES & BILLS */}
      {activeTab === 'ENTRIES' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="clay-card p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search entry #, vendor, site, material..."
                  className="clay-input pl-10 w-full text-sm bg-white"
                />
              </div>

              {/* Site Filter */}
              <div className="w-full sm:w-56">
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="clay-input w-full text-sm bg-white"
                >
                  <option value="ALL">All Project Sites</option>
                  {projectsList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <div className="w-full sm:w-44">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="clay-input w-full text-sm bg-white"
                >
                  <option value="ALL">All Payments</option>
                  <option value="PAID">Paid Only</option>
                  <option value="PARTIAL">Partial Payment</option>
                  <option value="PENDING">Pending Payment</option>
                </select>
              </div>
            </div>

            {/* Duration Presets & Date Pickers */}
            <div className="pt-2 border-t border-violet-100/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Duration:</span>
                {[
                  { id: 'ALL', label: 'All Time' },
                  { id: 'PAST_WEEK_ENTRIES', label: 'Past Week Entries' },
                  { id: 'PAST_MONTH_ENTRIES', label: 'Past Month Entries' },
                  { id: 'PAST_WEEK_PAYMENTS', label: 'Past Week Payments' },
                  { id: 'PAST_MONTH_PAYMENTS', label: 'Past Month Payments' },
                  { id: 'PENDING_ONLY', label: 'Pending Only' },
                  { id: 'PAID_ONLY', label: 'Paid Only' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetChange(preset.id as PresetFilter)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      presetFilter === preset.id
                        ? 'bg-[#7C6EF0] text-white shadow-sm'
                        : 'bg-white/80 text-slate-600 hover:bg-white border border-violet-100/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Range from - to */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPresetFilter('ALL');
                  }}
                  className="clay-input px-2 py-1 text-xs bg-white rounded-lg"
                />
                <span className="text-slate-500 font-medium">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPresetFilter('ALL');
                  }}
                  className="clay-input px-2 py-1 text-xs bg-white rounded-lg"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => handlePresetChange('ALL')}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="clay-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse hidden md:table min-w-max">
                <thead>
                  <tr className="border-b border-violet-100/30 text-xs font-bold uppercase text-slate-400 bg-white/40">
                    <th className="p-4">Entry / PO No</th>
                    <th className="p-4">Project Site</th>
                    <th className="p-4">Vendor Agency</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Total Bill</th>
                    <th className="p-4 text-right">Paid Done</th>
                    <th className="p-4 text-right">Remaining Pending</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-100/30 text-sm">
                  {isOrdersLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Loading material entries...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No material entries found for the selected filter duration.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-violet-50/30 transition-colors">
                        <td className="p-4">
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setIsViewItemsOpen(true);
                            }}
                            className="font-mono font-bold text-[#7C6EF0] hover:underline flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {o.orderNumber}
                          </button>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {o.items?.length || 0} item(s)
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-800 block">
                            {o.project?.name || 'Site Project'}
                          </span>
                          {o.project?.client?.name && (
                            <span className="text-[11px] text-slate-500">
                              Client: {o.project.client.name}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-700 font-medium">
                          {o.vendor?.name || 'Direct Supplier'}
                        </td>
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                          {formatDate(o.orderDate || o.createdAt)}
                        </td>
                        <td className="p-4 font-mono font-extrabold text-slate-800 text-right">
                          {formatCurrency(Number(o.totalAmount))}
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-600 text-right">
                          {formatCurrency(Number(o.paidAmount || 0))}
                          {Number(o.advanceAmount) > 0 && (
                            <span className="block text-[10px] text-blue-500 font-sans">
                              (Adv: {formatCurrency(Number(o.advanceAmount))})
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-amber-600 text-right">
                          {Number(o.pendingAmount) > 0 ? (
                            formatCurrency(Number(o.pendingAmount))
                          ) : (
                            <span className="text-emerald-600 text-xs font-sans font-bold">₹0 (Cleared)</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-md border shadow-sm ${
                              o.paymentStatus === 'PAID' || o.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-[#5CB77E] border-emerald-200/50'
                                : o.paymentStatus === 'PARTIAL' || o.status === 'PARTIAL'
                                ? 'bg-amber-50 text-[#F2A65A] border-amber-200/50'
                                : 'bg-rose-50 text-[#E5636C] border-rose-200/50'
                            }`}
                          >
                            {o.paymentStatus === 'PAID'
                              ? 'PAID'
                              : o.paymentStatus === 'PARTIAL'
                              ? 'PARTIAL'
                              : 'PENDING'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenPayModal(o)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200/50 inline-flex items-center gap-1"
                            title="Record payment against this material entry"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setIsViewItemsOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-50 hover:bg-violet-100 text-[#7C6EF0] transition-colors border border-violet-200/50"
                          >
                            View
                          </button>
                          <button
                            onClick={async () => {
                              if (
                                await confirmDialog({
                                  title: 'Confirm Delete',
                                  message: `Are you sure you want to delete material entry ${o.orderNumber}?`,
                                })
                              ) {
                                deleteOrderMutation.mutate(o.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-[#E5636C] hover:bg-rose-50 transition-colors inline-flex items-center"
                            title="Delete Material Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="flex flex-col divide-y divide-violet-100/30 md:hidden">
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No material entries found.</div>
              ) : (
                filteredOrders.map((o: any) => (
                  <div key={o.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-bold text-[#7C6EF0] text-sm">{o.orderNumber}</div>
                        <div className="font-bold text-slate-800 text-sm mt-0.5">{o.project?.name || 'Site Project'}</div>
                        <div className="text-xs text-slate-500">{o.vendor?.name}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          o.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-[#5CB77E] border-emerald-200/50'
                            : o.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-50 text-[#F2A65A] border-amber-200/50'
                            : 'bg-rose-50 text-[#E5636C] border-rose-200/50'
                        }`}
                      >
                        {o.paymentStatus || 'PENDING'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs border-t border-violet-100/30 pt-2 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Total</span>
                        <span className="font-bold text-slate-800">{formatCurrency(Number(o.totalAmount))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block font-sans">Paid</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(Number(o.paidAmount || 0))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 block font-sans">Pending</span>
                        <span className="font-bold text-amber-600">{formatCurrency(Number(o.pendingAmount || 0))}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[11px] text-slate-400">{formatDate(o.orderDate || o.createdAt)}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenPayModal(o)}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200"
                        >
                          Pay
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsViewItemsOpen(true);
                          }}
                          className="px-3 py-1 bg-violet-50 text-[#7C6EF0] text-xs font-bold rounded-lg border border-violet-200"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SITE INVENTORY & STOCK LEVELS */}
      {activeTab === 'STOCK' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsList.length === 0 ? (
              <div className="col-span-full py-10 text-center text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No project sites available.</p>
              </div>
            ) : (
              projectsList.map((project: any) => {
                const siteStock = stockData.filter((s: any) => s.projectId === project.id);
                return (
                  <Link
                    key={project.id}
                    to={`/materials/${project.id}`}
                    className="clay-card p-6 flex flex-col justify-between hover:border-[#7C6EF0]/50 transition-all group cursor-pointer block"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-clay-violet/20 flex items-center justify-center border border-violet-100/40 text-[#7C6EF0]">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-violet-50 text-[#7C6EF0] border border-violet-100 shadow-sm">
                          {project.code || 'SITE'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 font-heading group-hover:text-[#7C6EF0] transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">{project.city || 'Location N/A'}</p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-violet-100/30 flex items-center justify-between text-sm">
                      <div className="text-slate-600 font-medium">
                        <strong className="text-slate-800 font-bold">{siteStock.length}</strong> Materials Tracked
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#7C6EF0]" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MATERIAL CATALOG / DIRECTORY */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsAddDirOpen(true)}
              className="clay-btn px-4 py-2 text-white font-bold text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Material to Directory
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {materialsList.map((m: any) => (
              <div key={m.id} className="clay-card p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/60 border border-violet-100/30 text-slate-600 shadow-sm">
                      {m.unit}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#7C6EF0]/10 border border-[#7C6EF0]/20 text-[#7C6EF0] shadow-sm">
                      GST {m.gstRate || 0}%
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base font-heading mt-2">{m.name}</h3>
                  <div className="text-sm font-semibold text-slate-700">
                    Standard Rate: <span className="font-mono text-[#7C6EF0] font-bold">{formatCurrency(Number(m.rate || 0))}</span> / {m.unit}
                  </div>
                </div>

                <div className="pt-4 border-t border-violet-100/30 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditDir(m);
                      setIsEditDirOpen(true);
                    }}
                    className="p-2 rounded-lg bg-violet-50 text-[#7C6EF0] hover:bg-violet-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Confirm Delete', message: `Remove ${m.name} from directory?` })) {
                        deleteDirMutation.mutate(m.id);
                      }
                    }}
                    className="p-2 rounded-lg bg-rose-50 text-[#E5636C] hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE MATERIAL ENTRY MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Create Material Entry</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Project Site *</label>
                  <select
                    required
                    value={newOrder.projectId}
                    onChange={(e) => setNewOrder({ ...newOrder, projectId: e.target.value })}
                    className="clay-input w-full text-sm"
                  >
                    <option value="">Select Project Site</option>
                    {projectsList.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Vendor Agency *</label>
                  <input
                    required
                    placeholder="Enter or select vendor..."
                    list="vendors-list-options"
                    value={selectedVendorAgency || newOrder.vendorId}
                    onChange={(e) => {
                      setSelectedVendorAgency(e.target.value);
                      const matched = vendorsList.find((v: any) => v.name.toLowerCase() === e.target.value.toLowerCase());
                      if (matched) setNewOrder((prev) => ({ ...prev, vendorId: matched.id }));
                    }}
                    className="clay-input w-full text-sm"
                  />
                  <datalist id="vendors-list-options">
                    {vendorsList.map((v: any) => (
                      <option key={v.id} value={v.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Entry Date *</label>
                  <input
                    type="date"
                    required
                    value={newOrder.orderDate}
                    onChange={(e) => setNewOrder({ ...newOrder, orderDate: e.target.value })}
                    className="clay-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={newOrder.deliveryDate}
                    onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                    className="clay-input w-full text-sm"
                  />
                </div>
              </div>

              {/* Items Line */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase text-slate-500 block">Items to Procure</label>
                {newOrder.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-violet-50/40 p-3 rounded-xl border border-violet-100/40">
                    <div className="col-span-6">
                      <select
                        required
                        value={item.materialId}
                        onChange={(e) => {
                          const mId = e.target.value;
                          const mat = materialsList.find((m: any) => m.id === mId);
                          const updated = [...newOrder.items];
                          updated[idx].materialId = mId;
                          if (mat && mat.rate) updated[idx].rate = String(mat.rate);
                          setNewOrder({ ...newOrder, items: updated });
                        }}
                        className="clay-input w-full text-sm"
                      >
                        <option value="">Select Material *</option>
                        {materialsList.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        required
                        min="0.1"
                        step="any"
                        placeholder="Qty"
                        value={item.quantityOrdered}
                        onChange={(e) => {
                          const updated = [...newOrder.items];
                          updated[idx].quantityOrdered = e.target.value;
                          setNewOrder({ ...newOrder, items: updated });
                        }}
                        className="clay-input w-full text-sm font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        placeholder="Rate (₹)"
                        value={item.rate}
                        onChange={(e) => {
                          const updated = [...newOrder.items];
                          updated[idx].rate = e.target.value;
                          setNewOrder({ ...newOrder, items: updated });
                        }}
                        className="clay-input w-full text-sm font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* GST section */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">GST Mode</label>
                  <select
                    value={newOrder.gstMode}
                    onChange={(e) => setNewOrder({ ...newOrder, gstMode: e.target.value })}
                    className="clay-input w-full text-sm"
                  >
                    <option value="NONE">No GST</option>
                    <option value="PERCENTAGE">GST Percentage (%)</option>
                    <option value="AMOUNT">Manual GST (₹)</option>
                  </select>
                </div>
                {newOrder.gstMode === 'PERCENTAGE' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">GST %</label>
                    <select
                      value={newOrder.gstPercentage}
                      onChange={(e) => setNewOrder({ ...newOrder, gstPercentage: Number(e.target.value) })}
                      className="clay-input w-full text-sm"
                    >
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                )}
                {newOrder.gstMode === 'AMOUNT' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">GST Amount (₹)</label>
                    <input
                      type="number"
                      value={newOrder.gstAmount}
                      onChange={(e) => setNewOrder({ ...newOrder, gstAmount: e.target.value })}
                      className="clay-input w-full text-sm font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Initial Payment / Advance Paid Option */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/60 space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800 uppercase">
                    Initial / Advance Payment Done? (Optional)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 20000"
                      value={newOrder.initialPaidAmount}
                      onChange={(e) => setNewOrder({ ...newOrder, initialPaidAmount: e.target.value })}
                      className="clay-input w-full text-sm font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Payment Method</label>
                    <select
                      value={newOrder.paymentMethod}
                      onChange={(e) => setNewOrder({ ...newOrder, paymentMethod: e.target.value })}
                      className="clay-input w-full text-sm bg-white"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">From Bank Account</label>
                    <select
                      value={newOrder.accountId}
                      onChange={(e) => setNewOrder({ ...newOrder, accountId: e.target.value })}
                      className="clay-input w-full text-sm bg-white"
                      disabled={newOrder.paymentMethod === 'CASH'}
                    >
                      <option value="">Select Account</option>
                      {bankAccounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} ({acc.accountNo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Bill Reference</label>
                <textarea
                  rows={2}
                  placeholder="Challan number, transporter name, or specific bill details..."
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="clay-input w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="clay-btn bg-[#7C6EF0] text-white px-6 py-2 rounded-xl font-bold text-sm"
                >
                  {createOrderMutation.isPending ? 'Logging Entry...' : 'Save Material Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPayOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-md rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-3">
              <div>
                <h3 className="font-bold text-lg font-heading text-slate-800">Record Material Payment</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Entry #{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setIsPayOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Vendor:</span>
                <span className="font-bold text-slate-800 font-sans">{selectedOrder.vendor?.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Bill Value:</span>
                <span className="font-bold text-slate-800">{formatCurrency(Number(selectedOrder.totalAmount))}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Already Paid:</span>
                <span>{formatCurrency(Number(selectedOrder.paidAmount || 0))}</span>
              </div>
              <div className="flex justify-between text-amber-600 font-bold border-t border-slate-200/60 pt-1">
                <span>Remaining Pending:</span>
                <span>{formatCurrency(Number(selectedOrder.pendingAmount || 0))}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={payFormData.amount}
                  onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                  className="clay-input w-full text-sm font-mono font-bold text-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={payFormData.paymentMethod}
                    onChange={(e) => setPayFormData({ ...payFormData, paymentMethod: e.target.value })}
                    className="clay-input w-full text-sm"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={payFormData.paymentDate}
                    onChange={(e) => setPayFormData({ ...payFormData, paymentDate: e.target.value })}
                    className="clay-input w-full text-sm"
                  />
                </div>
              </div>

              {payFormData.paymentMethod !== 'CASH' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">From Bank Account *</label>
                  <select
                    required
                    value={payFormData.accountId}
                    onChange={(e) => setPayFormData({ ...payFormData, accountId: e.target.value })}
                    className="clay-input w-full text-sm"
                  >
                    <option value="">Select Account</option>
                    {bankAccounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountNo} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Transaction Ref / Cheque No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / IMPS reference"
                  value={payFormData.reference}
                  onChange={(e) => setPayFormData({ ...payFormData, reference: e.target.value })}
                  className="clay-input w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payOrderMutation.isPending}
                  className="clay-btn bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md"
                >
                  {payOrderMutation.isPending ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ITEMS & PAYMENT AUDIT MODAL */}
      {isViewItemsOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-2xl rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-3">
              <div>
                <h3 className="font-bold text-lg font-heading text-slate-800">
                  Material Entry #{selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Site: <strong className="text-slate-800">{selectedOrder.project?.name}</strong> | Vendor:{' '}
                  <strong className="text-slate-800">{selectedOrder.vendor?.name}</strong>
                </p>
              </div>
              <button onClick={() => setIsViewItemsOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            {/* Items table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Items Ordered / Received</h4>
              <div className="overflow-x-auto rounded-xl border border-violet-100/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-violet-50/50 text-slate-500">
                    <tr>
                      <th className="p-3">Material</th>
                      <th className="p-3 text-center">Qty Ordered</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-100/30">
                    {selectedOrder.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="p-3 font-semibold text-slate-800">{item.material?.name || 'Material'}</td>
                        <td className="p-3 text-center font-mono font-bold">
                          {item.quantityOrdered} {item.material?.unit}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {formatCurrency(Number(item.rate))}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(Number(item.amount || Number(item.quantityOrdered) * Number(item.rate)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments History on this Order */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Outflows Recorded</h4>
              {(!selectedOrder.payments || selectedOrder.payments.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400 border border-slate-100">
                  No payment outflows recorded yet for this entry.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-violet-100/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-emerald-50/50 text-emerald-800">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Payment Method</th>
                        <th className="p-3">Account / Ref</th>
                        <th className="p-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-100/30 font-mono">
                      {selectedOrder.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-3 text-slate-600">{formatDate(p.paymentDate)}</td>
                          <td className="p-3 text-slate-800 font-semibold">{p.paymentMethod}</td>
                          <td className="p-3 text-slate-500 font-sans">{p.account?.bankName || p.remarks || '-'}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            {formatCurrency(Number(p.totalAmount || p.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-violet-100/30 text-xs">
              <span className="font-semibold text-slate-600">
                Pending Balance: <strong className="text-amber-600 font-mono">{formatCurrency(Number(selectedOrder.pendingAmount || 0))}</strong>
              </span>
              <button
                onClick={() => {
                  setIsViewItemsOpen(false);
                  handleOpenPayModal(selectedOrder);
                }}
                className="clay-btn bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MATERIAL TO DIRECTORY MODAL */}
      {isAddDirOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg font-heading text-slate-800">Add Material to Directory</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addDirMutation.mutate({
                  name: newDir.name,
                  unit: newDir.unit,
                  rate: Number(newDir.rate) || 0,
                  gstRate: Number(newDir.gstRate) || 0,
                });
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Material Name *</label>
                <input
                  required
                  placeholder="e.g. UltraTech Cement 53 Grade"
                  value={newDir.name}
                  onChange={(e) => setNewDir({ ...newDir, name: e.target.value })}
                  className="clay-input w-full text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Unit *</label>
                  <input
                    required
                    placeholder="BAGS, TON, CUM, SQFT..."
                    value={newDir.unit}
                    onChange={(e) => setNewDir({ ...newDir, unit: e.target.value.toUpperCase() })}
                    className="clay-input w-full text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Standard Rate (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 380"
                    value={newDir.rate}
                    onChange={(e) => setNewDir({ ...newDir, rate: e.target.value })}
                    className="clay-input w-full text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDirOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="clay-btn bg-[#7C6EF0] text-white px-5 py-2 rounded-xl font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MATERIAL IN DIRECTORY MODAL */}
      {isEditDirOpen && editDir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg font-heading text-slate-800">Edit Directory Material</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateDirMutation.mutate({
                  id: editDir.id,
                  payload: {
                    name: editDir.name,
                    unit: editDir.unit,
                    rate: Number(editDir.rate) || 0,
                  },
                });
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Material Name *</label>
                <input
                  required
                  value={editDir.name}
                  onChange={(e) => setEditDir({ ...editDir, name: e.target.value })}
                  className="clay-input w-full text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Unit *</label>
                  <input
                    required
                    value={editDir.unit}
                    onChange={(e) => setEditDir({ ...editDir, unit: e.target.value.toUpperCase() })}
                    className="clay-input w-full text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Standard Rate (₹)</label>
                  <input
                    type="number"
                    value={editDir.rate}
                    onChange={(e) => setEditDir({ ...editDir, rate: e.target.value })}
                    className="clay-input w-full text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditDirOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="clay-btn bg-[#7C6EF0] text-white px-5 py-2 rounded-xl font-bold">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
