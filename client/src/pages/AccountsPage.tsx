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
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Corporate Bank Accounts & Reserves
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Current accounts, Escrow deposits, cash reserves, and IFSC reconciliation.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Link Bank Account</span>
        </button>
      </div>

      <div className="rounded-[1.25rem] bg-gradient-to-br from-[#7C6EF0] to-[#6558D3] border-none p-6 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-[0_8px_30px_rgb(124,110,240,0.3)]">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-white/80">Total Liquid Reserves across Accounts</div>
          <div className="text-3xl font-extrabold font-mono text-white">{formatCurrency(totalBalance)}</div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-xs font-semibold text-white backdrop-blur-md border border-white/20">
          <Landmark className="w-4 h-4" /> {accounts.length} Active Corporate Ledgers
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-48 bg-violet-100/50 rounded-3xl" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="clay-card p-12 text-center text-slate-400">No bank accounts linked yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((acc: any) => (
            <div key={acc.id} className="clay-card p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-[#7C6EF0]/10 text-[#7C6EF0] uppercase">
                      {acc.accountType} ACCOUNT
                    </span>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => setEditingAcc(acc)}
                        className="p-1 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
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
                        className="p-1 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Bank Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {user?.role === 'ADMIN' ? 'OWNER A/C' : '••••••••'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 font-heading">{acc.bankName}</h3>
                <div className="text-xs text-slate-600 font-mono">
                  A/C: {user?.role === 'ADMIN' ? acc.accountNo : `••••••••••${String(acc.accountNo || '').slice(-4)}`}
                </div>
              </div>

              <div className="pt-4 border-t border-violet-100/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] sm:text-xs text-slate-400 uppercase font-semibold">Available Ledger Balance</div>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-[#5CB77E]">{formatCurrency(Number(acc.balance || 0))}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Link Bank Account</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Bank Name (e.g. HDFC Bank Ltd) *"
                value={newAcc.bankName}
                onChange={(e) => setNewAcc({ ...newAcc, bankName: e.target.value })}
                className="clay-input w-full text-sm"
              />
              <input
                type="text"
                required
                placeholder="Account Number *"
                value={newAcc.accountNo}
                onChange={(e) => setNewAcc({ ...newAcc, accountNo: e.target.value })}
                className="clay-input w-full text-sm font-mono"
              />
              <div className="grid grid-cols-1 gap-4">
                <select
                  value={newAcc.accountType}
                  onChange={(e) => setNewAcc({ ...newAcc, accountType: e.target.value })}
                  className="clay-input w-full text-sm"
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
                className="clay-input w-full text-sm font-mono"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Link Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Update Bank Account</h3>
              <button onClick={() => setEditingAcc(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdateAcc} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Bank Name *"
                value={editingAcc.bankName || ''}
                onChange={(e) => setEditingAcc({ ...editingAcc, bankName: e.target.value })}
                className="clay-input w-full text-sm font-semibold"
              />
              <input
                type="text"
                required
                placeholder="Account Number *"
                value={editingAcc.accountNo || ''}
                onChange={(e) => setEditingAcc({ ...editingAcc, accountNo: e.target.value })}
                className="clay-input w-full text-sm font-mono"
              />
              <div className="grid grid-cols-1 gap-4">
                <select
                  value={editingAcc.accountType || 'CURRENT'}
                  onChange={(e) => setEditingAcc({ ...editingAcc, accountType: e.target.value })}
                  className="clay-input w-full text-sm font-semibold"
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
                className="clay-input w-full text-sm font-mono font-bold text-[#5CB77E]"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingAcc(null)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
