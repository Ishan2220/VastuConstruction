import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  IndianRupee,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

import type { PaymentHistoryRecord, PaymentHistorySummary } from '@/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import PaymentDetailDrawer from '@/components/payments/PaymentDetailDrawer';

// --- Claymorphism utilities ---
const clayCard = "bg-[#f8fafc] rounded-[24px] shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff,inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.02)] border border-white/50";
const clayButton = "bg-[#f8fafc] rounded-2xl shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] hover:shadow-[inset_4px_4px_8px_#e2e8f0,inset_-4px_-4px_8px_#ffffff] active:shadow-[inset_6px_6px_12px_#e2e8f0,inset_-6px_-6px_12px_#ffffff] transition-all duration-200 border border-white/60";
const clayInput = "bg-[#f1f5f9] rounded-2xl shadow-[inset_4px_4px_8px_#e2e8f0,inset_-4px_-4px_8px_#ffffff] border-none focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all px-4 py-3";

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentHistoryRecord[]>([]);
  const [summary, setSummary] = useState<PaymentHistorySummary>({
    todayInflow: 0,
    todayOutflow: 0,
    pendingPayments: 0,
    completedPayments: 0,
    cancelledPayments: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    direction: '',
    type: '',
    method: '',
    dateFilter: 'this_month'
  });

  // Detail Drawer
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryRecord | null>(null);
  
  const { user } = useAuthStore();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchTerm,
        ...filters
      });

      const [historyRes, summaryRes] = await Promise.all([
        api.get(`/api/payments/history?${params.toString()}`),
        api.get('/api/payments/summary')
      ]);

      if (historyRes.data.success) {
        setPayments(historyRes.data.data);
        setTotalPages(historyRes.data.meta.totalPages || 1);
      }
      
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, searchTerm, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page
  };

  return (
    <div className="min-h-screen bg-[#e2e8f0] p-4 md:p-6 lg:p-8 font-sans pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Payment History</h1>
          <p className="text-slate-500 font-medium mt-1">Track all inflows and outflows across the organization</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className={cn(clayButton, "px-4 py-2.5 flex items-center gap-2 text-slate-600 font-semibold")}
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {(filters.direction || filters.type || filters.method || filters.dateFilter !== 'this_month') && (
              <span className="h-2 w-2 rounded-full bg-indigo-500 ml-1"></span>
            )}
          </button>
          <button className={cn(clayButton, "px-4 py-2.5 flex items-center gap-2 text-slate-600 font-semibold")}>
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard 
          title="Today's Inflow" 
          amount={summary.todayInflow} 
          icon={ArrowDownRight}
          color="text-emerald-600"
          bg="bg-emerald-500"
        />
        <SummaryCard 
          title="Today's Outflow" 
          amount={summary.todayOutflow} 
          icon={ArrowUpRight}
          color="text-rose-600"
          bg="bg-rose-500"
        />
        <SummaryCard 
          title="Net (Today)" 
          amount={summary.todayInflow - summary.todayOutflow} 
          icon={IndianRupee}
          color={summary.todayInflow >= summary.todayOutflow ? "text-indigo-600" : "text-amber-600"}
          bg={summary.todayInflow >= summary.todayOutflow ? "bg-indigo-500" : "bg-amber-500"}
        />
        <SummaryCard 
          title="Pending Payments" 
          count={summary.pendingPayments} 
          icon={Clock}
          color="text-blue-600"
          bg="bg-blue-500"
          isCount
        />
      </div>

      {/* Main Content Area */}
      <div className={cn(clayCard, "p-4 md:p-6 overflow-hidden flex flex-col")}>
        {/* Search */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search reference, client, vendor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className={cn(clayInput, "w-full pl-12 text-sm font-medium text-slate-700 placeholder:text-slate-400")}
            />
          </div>
        </div>

        {/* Data Views */}
        {loading && payments.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No payments found</h3>
            <p className="text-slate-500 max-w-sm mt-1">Adjust your filters or search term to find what you're looking for.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto pb-4">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="pb-3 px-4 font-bold text-slate-500 uppercase tracking-wider">Date & Ref</th>
                    <th className="pb-3 px-4 font-bold text-slate-500 uppercase tracking-wider">Details</th>
                    <th className="pb-3 px-4 font-bold text-slate-500 uppercase tracking-wider">Entity</th>
                    <th className="pb-3 px-4 font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="pb-3 px-4 font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map(payment => (
                    <tr 
                      key={payment.id} 
                      className="group hover:bg-white/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{format(new Date(payment.paymentDate), 'dd MMM yyyy')}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{payment.reference || 'No Ref'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-700">{payment.paymentType}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{payment.paymentMethod}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800 max-w-[200px] truncate">
                          {payment.clientName || payment.vendorName || payment.employeeName || payment.labourName || 'Internal'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{payment.source}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className={cn(
                          "font-bold text-base flex items-center gap-1",
                          payment.direction === 'INFLOW' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {payment.direction === 'INFLOW' ? '+' : '-'}₹{payment.amount.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={payment.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tablet/Mobile Timeline View */}
            <div className="lg:hidden space-y-4">
              {payments.map(payment => (
                <div 
                  key={payment.id}
                  onClick={() => setSelectedPayment(payment)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between gap-4 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={cn(
                      "h-12 w-12 rounded-full shrink-0 flex items-center justify-center",
                      payment.direction === 'INFLOW' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {payment.direction === 'INFLOW' ? <ArrowDownRight className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-slate-800 truncate">
                        {payment.clientName || payment.vendorName || payment.employeeName || payment.labourName || payment.paymentType}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {format(new Date(payment.paymentDate), 'dd MMM yyyy')} • {payment.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn(
                      "font-black text-lg",
                      payment.direction === 'INFLOW' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {payment.direction === 'INFLOW' ? '+' : '-'}₹{payment.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="flex justify-end mt-1">
                      <StatusBadge status={payment.status} compact />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <span className="text-sm font-semibold text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={cn(clayButton, "p-2 disabled:opacity-50 disabled:pointer-events-none")}
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600" />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className={cn(clayButton, "p-2 disabled:opacity-50 disabled:pointer-events-none")}
                >
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter Drawer */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-800">Advanced Filters</h2>
                <button onClick={() => setIsFilterOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <XCircle className="h-6 w-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Time Period</label>
                  <select 
                    value={filters.dateFilter}
                    onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="financial_year">Financial Year</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Direction</label>
                  <div className="flex gap-2">
                    <FilterButton 
                      active={filters.direction === ''} 
                      onClick={() => handleFilterChange('direction', '')}
                    >All</FilterButton>
                    <FilterButton 
                      active={filters.direction === 'INFLOW'} 
                      onClick={() => handleFilterChange('direction', 'INFLOW')}
                    >Inflow</FilterButton>
                    <FilterButton 
                      active={filters.direction === 'OUTFLOW'} 
                      onClick={() => handleFilterChange('direction', 'OUTFLOW')}
                    >Outflow</FilterButton>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Payment Method</label>
                  <select 
                    value={filters.method}
                    onChange={(e) => handleFilterChange('method', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Methods</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Payment Type</label>
                  <select 
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Types</option>
                    <option value="Client Payment">Client Payment</option>
                    <option value="Expense">Expense</option>
                    <option value="Vendor Payment">Vendor Payment</option>
                    <option value="Labour Payment">Labour Payment</option>
                    <option value="Salary Payment">Salary Payment</option>
                  </select>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t">
                <button
                  onClick={() => {
                    setFilters({ direction: '', type: '', method: '', dateFilter: 'this_month' });
                    setPage(1);
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Details Drawer */}
      <PaymentDetailDrawer
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        payment={selectedPayment}
      />
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  amount?: number;
  count?: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  isCount?: boolean;
}

function SummaryCard({ title, amount, count, icon: Icon, color, bg, isCount }: SummaryCardProps) {
  return (
    <div className={cn(clayCard, "p-6 flex items-center justify-between relative overflow-hidden")}>
      <div className="relative z-10">
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
        <h3 className={cn("text-2xl font-black", color)}>
          {isCount ? count : `₹${(amount || 0).toLocaleString('en-IN')}`}
        </h3>
      </div>
      <div className={cn("h-14 w-14 rounded-full flex items-center justify-center text-white relative z-10 shadow-lg shadow-black/10", bg)}>
        <Icon className="h-7 w-7" />
      </div>
      <div className={cn("absolute -bottom-4 -right-4 h-24 w-24 rounded-full opacity-10 blur-xl", bg)} />
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status: string, compact?: boolean }) {
  let bg = "bg-slate-100";
  let text = "text-slate-600";
  let Icon = MoreVertical;

  if (status === 'COMPLETED') {
    bg = "bg-emerald-100";
    text = "text-emerald-700";
    Icon = CheckCircle2;
  } else if (status === 'PENDING') {
    bg = "bg-amber-100";
    text = "text-amber-700";
    Icon = Clock;
  } else if (status === 'CANCELLED') {
    bg = "bg-rose-100";
    text = "text-rose-700";
    Icon = XCircle;
  }

  if (compact) {
    return (
      <div className={cn("inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", bg, text)}>
        {status}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide", bg, text)}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </div>
  );
}

interface FilterButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function FilterButton({ children, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all border",
        active 
          ? "bg-indigo-500 text-white border-indigo-600 shadow-md" 
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}
