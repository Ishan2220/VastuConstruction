import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus, ArrowUpRight, ArrowDownRight, IndianRupee, Edit3, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

export default function AccountsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any>(null);
  const [newAcc, setNewAcc] = useState({
    bankName: '',
    accountNo: '',
    ifscCode: '',
    branch: '',
    balance: '',
    accountType: 'CURRENT',
  });

  const { data: accountsRaw, isLoading } = useQuery({
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
      const { data } = await api.post('/bank-accounts', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Bank account linked successfully');
      setIsAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add bank account');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/bank-accounts/${editingAcc.id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Bank account details updated successfully');
      setEditingAcc(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update bank account');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/bank-accounts/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Bank account removed successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete bank account');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcc.bankName || !newAcc.accountNo) {
      toast.error('Bank Name and Account Number are required');
      return;
    }
    createMutation.mutate({ ...newAcc, balance: Number(newAcc.balance) || 0 });
  };

  const handleUpdateAcc = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...editingAcc,
      balance: Number(editingAcc.balance) || 0,
    });
  };

  const totalBalance = accounts.reduce((acc: number, curr: any) => acc + Number(curr.balance || 0), 0);

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Corporate Bank Accounts & Reserves
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Current accounts, Escrow deposits, cash reserves, and IFSC reconciliation.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Link Bank Account</span>
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Liquid Reserves across Accounts</div>
          <div className="text-3xl font-extrabold font-mono text-white">{formatCurrency(totalBalance)}</div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-indigo-300">
          <Landmark className="w-4 h-4" /> {accounts.length} Active Corporate Ledgers
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-48 bg-slate-200 rounded-2xl" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-slate-400">No bank accounts linked yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((acc: any) => (
            <div key={acc.id} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 uppercase">
                      {acc.accountType} ACCOUNT
                    </span>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => setEditingAcc(acc)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Bank Account"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to unlink and remove ${acc.bankName} (${acc.accountNo})?`)) {
                            deleteMutation.mutate(acc.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Bank Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {user?.role === 'ADMIN' ? 'OWNER A/C' : '••••••••'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-heading">{acc.bankName}</h3>
                <div className="text-xs text-slate-500 font-mono">
                  A/C: {user?.role === 'ADMIN' ? acc.accountNo : `••••••••••${String(acc.accountNo || '').slice(-4)}`}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-400 uppercase font-semibold">Available Ledger Balance</div>
                <div className="text-xl font-extrabold font-mono text-emerald-600">{formatCurrency(Number(acc.balance || 0))}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Link Bank Account</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Bank Name (e.g. HDFC Bank Ltd) *"
                value={newAcc.bankName}
                onChange={(e) => setNewAcc({ ...newAcc, bankName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Account Number *"
                value={newAcc.accountNo}
                onChange={(e) => setNewAcc({ ...newAcc, accountNo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
              />
              <div className="grid grid-cols-1 gap-4">
                <select
                  value={newAcc.accountType}
                  onChange={(e) => setNewAcc({ ...newAcc, accountType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                >
                  <option value="CURRENT">Current Account</option>
                  <option value="SAVINGS">Savings Account</option>
                  <option value="ESCROW">Escrow Account</option>
                  <option value="OVERDRAFT">Overdraft / OD</option>
                </select>
              </div>
              <input
                type="number"
                placeholder="Initial Ledger Balance (₹)"
                value={newAcc.balance}
                onChange={(e) => setNewAcc({ ...newAcc, balance: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
              />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Link Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Update Bank Account</h3>
              <button onClick={() => setEditingAcc(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdateAcc} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Bank Name *"
                value={editingAcc.bankName || ''}
                onChange={(e) => setEditingAcc({ ...editingAcc, bankName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-semibold"
              />
              <input
                type="text"
                required
                placeholder="Account Number *"
                value={editingAcc.accountNo || ''}
                onChange={(e) => setEditingAcc({ ...editingAcc, accountNo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
              />
              <div className="grid grid-cols-1 gap-4">
                <select
                  value={editingAcc.accountType || 'CURRENT'}
                  onChange={(e) => setEditingAcc({ ...editingAcc, accountType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-semibold"
                >
                  <option value="CURRENT">Current Account</option>
                  <option value="SAVINGS">Savings Account</option>
                  <option value="ESCROW">Escrow / Project</option>
                  <option value="OD_CC">OD / CC Limit</option>
                </select>
              </div>
              <input
                type="number"
                placeholder="Ledger Balance (₹)"
                value={editingAcc.balance || ''}
                onChange={(e) => setEditingAcc({ ...editingAcc, balance: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono font-bold text-emerald-600"
              />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setEditingAcc(null)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
