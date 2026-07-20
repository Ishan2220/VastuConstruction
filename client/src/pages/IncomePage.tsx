import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IndianRupee,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Landmark,
  Building2,
  FileText,
  Trash2,
} from 'lucide-react';
import { CacheManager } from '@/lib/CacheManager';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';

export default function IncomePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newIncome, setNewIncome] = useState({
    clientId: '',
    projectId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    accountId: '',
    type: 'MILESTONE_PAYMENT',
    invoiceNo: '',
    reference: '',
  });

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ['incomes-list'],
    queryFn: async () => {
      const { data } = await api.get('/income');
      return data.data?.data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await api.get('/clients');
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
      const { data } = await api.post('/income', payload);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnIncome(queryClient);
      toast.success('Inflow payment logged successfully');
      setIsAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log income');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/income/${id}`);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnIncome(queryClient);
      toast.success('Income receipt record deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete income record');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncome.clientId || !newIncome.amount) {
      toast.error('Client and Amount are required');
      return;
    }
    createMutation.mutate({
      ...newIncome,
      amount: Number(newIncome.amount),
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Client Billing & Payment Inflows
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Log project milestone checks, RTGS/NEFT transfers, advances, and GST collection.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record Inflow Payment</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                <th className="p-4">Invoice / Ref</th>
                <th className="p-4">Client</th>
                <th className="p-4">Project Contract</th>
                <th className="p-4">Payment Date</th>
                <th className="p-4">Method</th>
                <th className="p-4">Amount (₹)</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">No income receipts logged yet.</td>
                </tr>
              ) : (
                incomes.map((inc: any) => (
                  <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600">{inc.invoiceNo || inc.reference || 'INV-001'}</td>
                    <td className="p-4 font-bold text-slate-900">{inc.client?.name || 'Corporate Client'}</td>
                    <td className="p-4 font-semibold text-slate-700">{inc.project?.name || 'Main Site'}</td>
                    <td className="p-4 text-slate-500">{formatDate(inc.paymentDate)}</td>
                    <td className="p-4 font-mono text-xs uppercase bg-slate-100 px-2 py-0.5 rounded w-fit">{inc.paymentMethod}</td>
                    <td className="p-4 font-mono font-extrabold text-emerald-600">{formatCurrency(Number(inc.amount))}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this income receipt?')) {
                            deleteMutation.mutate(inc.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Income Record"
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
              <h3 className="font-bold text-lg font-heading">Record Client Inflow</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <select
                required
                value={newIncome.clientId}
                onChange={(e) => setNewIncome({ ...newIncome, clientId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              >
                <option value="">Select Client *</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select
                value={newIncome.projectId}
                onChange={(e) => setNewIncome({ ...newIncome, projectId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              >
                <option value="">Select Project Site</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div>
                <input
                  type="number"
                  required
                  placeholder="Amount (₹) *"
                  value={newIncome.amount}
                  onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
                />
              </div>

              <input
                type="text"
                placeholder="Invoice Number / UTR Reference"
                value={newIncome.invoiceNo}
                onChange={(e) => setNewIncome({ ...newIncome, invoiceNo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
              />

              <CategorySelect
                module="payment_method"
                value={newIncome.paymentMethod}
                onChange={(val) => setNewIncome({ ...newIncome, paymentMethod: val })}
                defaultOptions={['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH', 'CREDIT_CARD']}
                placeholder="Select Payment Method..."
              />

              {['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CREDIT_CARD'].includes(newIncome.paymentMethod) && (
                <select
                  required
                  value={newIncome.accountId}
                  onChange={(e) => setNewIncome({ ...newIncome, accountId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                >
                  <option value="">Select Bank Account *</option>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNo}</option>
                  ))}
                </select>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Log Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
