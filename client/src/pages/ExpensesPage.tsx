import { useState } from 'react';
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

export default function ExpensesPage() {
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
  });

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
    queryKey: ['bank-accounts-select'],
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
      const { data } = await api.post('/expenses', payload);
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
    if (!newExpense.projectId || !newExpense.amount) {
      toast.error('Project Site and Amount are required');
      return;
    }
    createMutation.mutate({
      ...newExpense,
      amount: Number(newExpense.amount),
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Site Expenses & Vendor Outflows
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track material purchase bills, labour muster payouts, equipment rental, and GST input tax.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Log Site Expense</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                <th className="p-4">Category</th>
                <th className="p-4">Project Site</th>
                <th className="p-4">Vendor / Payee</th>
                <th className="p-4">Date</th>
                <th className="p-4">Description</th>
                <th className="p-4">Amount (₹)</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">No site expenses logged yet.</td>
                </tr>
              ) : (
                expenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        {exp.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-900">{exp.project?.name || 'Main Site'}</td>
                    <td className="p-4 font-semibold text-slate-700">{exp.vendor?.name || 'Direct Disburse'}</td>
                    <td className="p-4 text-slate-500">{formatDate(exp.paymentDate)}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{exp.description || 'Routine site expenditure'}</td>
                    <td className="p-4 font-mono font-extrabold text-rose-600">{formatCurrency(Number(exp.amount))}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this expense record?')) {
                            deleteMutation.mutate(exp.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Log Site Outflow</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <select
                required
                value={newExpense.projectId}
                onChange={(e) => setNewExpense({ ...newExpense, projectId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              >
                <option value="">Select Project Site *</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <select
                value={newExpense.vendorId}
                onChange={(e) => setNewExpense({ ...newExpense, vendorId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              >
                <option value="">Select Vendor (if applicable)</option>
                {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>

              <CategorySelect
                module="expenses"
                value={newExpense.type}
                onChange={(val) => setNewExpense({ ...newExpense, type: val })}
                defaultOptions={['MATERIAL', 'LABOUR', 'EQUIPMENT', 'SUBCONTRACTOR', 'TRANSPORT', 'UTILITY', 'OFFICE', 'OTHER']}
                placeholder="Select Expense Type/Category..."
              />

              <CategorySelect
                module="payment_method"
                value={newExpense.paymentMethod}
                onChange={(val) => setNewExpense({ ...newExpense, paymentMethod: val })}
                defaultOptions={['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH', 'CREDIT_CARD']}
                placeholder="Select Payment Method..."
              />

              {['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CREDIT_CARD'].includes(newExpense.paymentMethod) && (
                <select
                  required
                  value={newExpense.accountId}
                  onChange={(e) => setNewExpense({ ...newExpense, accountId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
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
                  placeholder="Amount (₹) *"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
                />
              </div>

              <textarea
                placeholder="Description / Bill Details..."
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Record Outflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
