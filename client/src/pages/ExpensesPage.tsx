import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  Truck,
  IndianRupee,
  Trash2,
} from 'lucide-react';
import { CacheManager } from '@/lib/CacheManager';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';
import { useAuthStore } from '@/store/authStore';
import { useConfirm } from "@/components/ui/ConfirmProvider";

export default function ExpensesPage() {
    const confirmDialog = useConfirm();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  useQuickAddListener('expense', () => setIsAddOpen(true));
  const [newExpense, setNewExpense] = useState({
    projectId: '',
    vendorId: '',
    type: 'MATERIAL',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    accountId: '',
    description: '',
    gstMode: 'NONE',
    gstPercentage: 18,
    gstAmount: '',
  });

  const { data: settings } = useQuery({
    queryKey: ['financial-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data?.data?.settings || {};
    },
  });

  // Update defaults when settings load
  useEffect(() => {
    if (settings && isAddOpen) {
      if (settings.defaultGstMode && newExpense.gstMode === 'NONE') {
        setNewExpense(prev => ({ ...prev, gstMode: settings.defaultGstMode, gstPercentage: settings.defaultGstPercentage || 18 }));
      }
    }
  }, [settings, isAddOpen]);
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses-list'],
    queryFn: async () => {
      const { data } = await api.get('/expenses');
      return data.data?.data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-select'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data?.data || [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-select'],
    queryFn: async () => {
      const { data } = await api.get('/vendors');
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
  const accounts = Array.isArray(accountsRaw) ? accountsRaw : [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isPersonal = payload.type === 'PERSONAL';
      const submitPayload = { ...payload, isPersonal };
      const { data } = await api.post('/expenses', submitPayload);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnExpense(queryClient);
      toast.success('Site expense logged successfully');
      setIsAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log expense');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/expenses/${id}`);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnExpense(queryClient);
      toast.success('Expense record deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete expense record');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if ((newExpense.type !== 'PERSONAL' && !newExpense.projectId) || !newExpense.amount) {
      toast.error('Project Site and Amount are required');
      return;
    }
    const baseAmount = Number(newExpense.amount);
    let finalGstAmount = 0;
    
    if (newExpense.gstMode === 'PERCENTAGE') {
      finalGstAmount = (baseAmount * Number(newExpense.gstPercentage)) / 100;
    } else if (newExpense.gstMode === 'AMOUNT') {
      finalGstAmount = Number(newExpense.gstAmount);
    }

    createMutation.mutate({
      ...newExpense,
      amount: baseAmount,
      gstAmount: finalGstAmount,
      totalAmount: baseAmount + finalGstAmount,
    });
  };

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Site Expenses & Vendor Outflows
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track material purchase bills, labour muster payouts, equipment rental, and GST input tax.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Log Site Expense</span>
        </button>
      </div>

      <div className="clay-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-100/30 text-xs font-bold uppercase text-slate-400">
                <th className="p-4">Type</th>
                <th className="p-4">Project Contract</th>
                <th className="p-4">Payable To (Vendor)</th>
                <th className="p-4">Payment Date</th>
                <th className="p-4">Description</th>
                <th className="p-4">Amount (₹)</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100/30 text-sm">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No site expenses logged yet.</td>
                </tr>
              ) : (
                expenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-violet-50/50 transition-colors">
                    <td className="p-4">
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-rose-50 text-[#E5636C] border border-rose-200/50">
                        {exp.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{exp.project?.name || 'Main Site'}</td>
                    <td className="p-4 font-semibold text-slate-600">{exp.vendor?.name || 'Direct Disburse'}</td>
                    <td className="p-4 text-slate-500">{formatDate(exp.paymentDate)}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{exp.description || 'Routine site expenditure'}</td>
                    <td className="p-4 font-mono font-extrabold text-[#E5636C]">
                      {formatCurrency(Number(exp.totalAmount) || Number(exp.amount))}
                      {Number(exp.gstAmount) > 0 && <span className="block text-[10px] text-slate-400 font-sans font-normal">incl. {formatCurrency(Number(exp.gstAmount))} GST</span>}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={async () => {
                          if (await confirmDialog({ title: 'Confirm Action', message: 'Are you sure you want to delete this expense record?' })) {
                            deleteMutation.mutate(exp.id);
                          }
                        }}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Expense Record"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-violet-100/30">
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No site expenses logged yet.</div>
          ) : (
            expenses.map((exp: any) => (
              <div key={exp.id} className="p-4 flex flex-col gap-3 hover:bg-violet-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-rose-50 text-[#E5636C] border border-rose-200/50">
                      {exp.type.replace('_', ' ')}
                    </span>
                    <div className="font-bold text-slate-800 mt-2">{exp.vendor?.name || 'Direct Disburse'}</div>
                  </div>
                  <div className="font-mono font-extrabold text-[#E5636C] text-lg text-right">
                    {formatCurrency(Number(exp.totalAmount) || Number(exp.amount))}
                    {Number(exp.gstAmount) > 0 && <span className="block text-[10px] text-slate-400 font-sans font-normal mt-0.5">incl. {formatCurrency(Number(exp.gstAmount))} GST</span>}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">{exp.project?.name || 'Main Site'}</span>
                    <span>{formatDate(exp.paymentDate)}</span>
                  </div>
                  <div className="text-slate-600 truncate mt-1">
                    {exp.description || 'Routine site expenditure'}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 pt-3 border-t border-violet-100/30">
                  <span className="font-mono text-[10px] uppercase bg-violet-50 text-slate-600 px-2 py-1 rounded">
                    {exp.paymentMethod || 'CASH'}
                  </span>
                  <button
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Confirm Action', message: 'Are you sure you want to delete this expense record?' })) {
                        deleteMutation.mutate(exp.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl rounded-none p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Log Site Outflow</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <select
                required={newExpense.type !== 'PERSONAL'}
                value={newExpense.projectId}
                onChange={(e) => setNewExpense({ ...newExpense, projectId: e.target.value })}
                className="clay-input w-full text-sm"
              >
                <option value="">{newExpense.type === 'PERSONAL' ? 'No Project (Personal)' : 'Select Project Site *'}</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <select
                value={newExpense.vendorId}
                onChange={(e) => setNewExpense({ ...newExpense, vendorId: e.target.value })}
                className="clay-input w-full text-sm"
              >
                <option value="">Select Payable To (Vendor) (if applicable)</option>
                {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>

              <CategorySelect
                module="expenses"
                value={newExpense.type}
                onChange={(val) => setNewExpense({ ...newExpense, type: val, projectId: val === 'PERSONAL' ? '' : newExpense.projectId })}
                defaultOptions={
                  user?.role === 'ADMIN' 
                    ? ['MATERIAL', 'LABOUR', 'EQUIPMENT', 'SUBCONTRACTOR', 'TRANSPORT', 'UTILITY', 'OFFICE', 'PERSONAL', 'OTHER'] 
                    : ['MATERIAL', 'LABOUR', 'EQUIPMENT', 'SUBCONTRACTOR', 'TRANSPORT', 'UTILITY', 'OFFICE', 'OTHER']
                }
                placeholder="Select Expense Type/Category..."
              />

              <CategorySelect
                module="payment_method"
                value={newExpense.paymentMethod}
                onChange={(val) => setNewExpense({ ...newExpense, paymentMethod: val })}
                defaultOptions={['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH', 'CREDIT_CARD']}
                placeholder="Select Payment Method..."
              />

              {['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CREDIT_CARD', 'CASH'].includes(newExpense.paymentMethod) && (
                <select
                  required
                  value={newExpense.accountId}
                  onChange={(e) => setNewExpense({ ...newExpense, accountId: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Bank Account *</option>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNo}</option>
                  ))}
                </select>
              )}

              <div>
                <input
                  type="number"
                  required
                  placeholder="Base Amount (₹) *"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="clay-input w-full text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={newExpense.gstMode}
                  onChange={(e) => setNewExpense({ ...newExpense, gstMode: e.target.value })}
                  className="clay-input w-full text-sm"
                  disabled={settings?.allowOperatorOverride === false}
                >
                  {!settings?.gstMandatory && <option value="NONE">No GST</option>}
                  <option value="PERCENTAGE">GST %</option>
                  {settings?.allowManualGstAmount !== false && <option value="AMOUNT">Manual GST (₹)</option>}
                </select>

                {newExpense.gstMode === 'PERCENTAGE' && (
                  <select
                    value={newExpense.gstPercentage}
                    onChange={(e) => setNewExpense({ ...newExpense, gstPercentage: Number(e.target.value) })}
                    className="clay-input w-full text-sm"
                    disabled={settings?.allowOperatorOverride === false}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                )}

                {newExpense.gstMode === 'AMOUNT' && (
                  <input
                    type="number"
                    placeholder="GST Amount (₹)"
                    value={newExpense.gstAmount}
                    onChange={(e) => setNewExpense({ ...newExpense, gstAmount: e.target.value })}
                    className="clay-input w-full text-sm font-mono"
                  />
                )}
              </div>

              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex justify-between items-center text-rose-800">
                <span className="text-sm font-semibold">Total Amount:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(
                    Number(newExpense.amount) + 
                    (newExpense.gstMode === 'PERCENTAGE' ? (Number(newExpense.amount) * newExpense.gstPercentage) / 100 : 
                     newExpense.gstMode === 'AMOUNT' ? Number(newExpense.gstAmount) : 0)
                  )}
                </span>
              </div>

              <textarea
                placeholder="Description / Bill Details..."
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className="clay-input w-full text-sm"
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Record Outflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
