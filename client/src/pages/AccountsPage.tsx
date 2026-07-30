import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus, ArrowUpRight, ArrowDownRight, IndianRupee, Edit3, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { AccountDetailsModal } from './AccountDetailsModal';

export default function AccountsPage() {
    const confirmDialog = useConfirm();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
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
        <div className="clay-card overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-violet-100/30 text-xs font-bold uppercase text-slate-400">
                  <th className="p-4">Type</th>
                  <th className="p-4">Bank Name</th>
                  <th className="p-4">Account No</th>
                  <th className="p-4">Balance (₹)</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30 text-sm">
                {accounts.map((acc: any) => (
                  <tr 
                    key={acc.id} 
                    className="hover:bg-violet-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAccountId(acc.id)}
                  >
                    <td className="p-4">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-[#7C6EF0]/10 text-[#7C6EF0] uppercase">
                        {acc.accountType}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{acc.bankName}</td>
                    <td className="p-4 font-mono text-slate-600">
                      {user?.role === 'ADMIN' ? acc.accountNo : `••••••••••${String(acc.accountNo || '').slice(-4)}`}
                    </td>
                    <td className="p-4 font-mono font-extrabold text-[#5CB77E]">{formatCurrency(Number(acc.balance || 0))}</td>
                    <td className="p-4 text-center space-x-2">
                      {user?.role === 'ADMIN' ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingAcc(acc); }}
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer inline-block"
                            title="Edit Bank Account"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to unlink and remove ${acc.bankName} (${acc.accountNo})?` })) {
                                deleteMutation.mutate(acc.id);
                              }
                            }}
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-block"
                            title="Delete Bank Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-violet-100/30">
            {accounts.map((acc: any) => (
              <div 
                key={acc.id} 
                className="p-4 space-y-4 hover:bg-violet-50/50 transition-colors cursor-pointer"
                onClick={() => setSelectedAccountId(acc.id)}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#7C6EF0]/10 text-[#7C6EF0] uppercase">
                        {acc.accountType}
                      </span>
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingAcc(acc); }}
                          className="p-1 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Bank Account"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to unlink and remove ${acc.bankName} (${acc.accountNo})?` })) {
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
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {user?.role === 'ADMIN' ? 'OWNER A/C' : '••••••••'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 font-heading">{acc.bankName}</h3>
                  <div className="text-xs text-slate-600 font-mono">
                    A/C: {user?.role === 'ADMIN' ? acc.accountNo : `••••••••••${String(acc.accountNo || '').slice(-4)}`}
                  </div>
                </div>

                <div className="pt-3 border-t border-violet-100/30 flex justify-between items-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Available Ledger Balance</div>
                  <div className="text-lg font-extrabold font-mono text-[#5CB77E]">{formatCurrency(Number(acc.balance || 0))}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl rounded-none p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl rounded-none p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
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
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-semibold">Ledger Balance (Calculated)</span>
                <input
                  type="text"
                  disabled
                  value={formatCurrency(Number(editingAcc.balance || 0))}
                  className="clay-input w-full text-sm font-mono font-bold text-[#5CB77E] bg-slate-50 cursor-not-allowed"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingAcc(null)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAccountId && (
        <AccountDetailsModal
          isOpen={!!selectedAccountId}
          onClose={() => setSelectedAccountId(null)}
          accountId={selectedAccountId}
        />
      )}
    </div>
  );
}
