import { useState, useEffect } from 'react';
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
import { useConfirm } from "@/components/ui/ConfirmProvider";

export default function IncomePage() {
    const confirmDialog = useConfirm();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newIncome, setNewIncome] = useState({
    receivedFromType: 'CLIENT', // 'CLIENT' | 'LEAD' | 'VENDOR'
    clientId: '',
    leadId: '',
    vendorId: '',
    projectId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    accountId: '',
    type: 'MILESTONE_PAYMENT',
    invoiceNo: '',
    reference: '',
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
      if (settings.defaultGstMode && newIncome.gstMode === 'NONE') {
        setNewIncome(prev => ({ ...prev, gstMode: settings.defaultGstMode, gstPercentage: settings.defaultGstPercentage || 18 }));
      }
    }
  }, [settings, isAddOpen]);

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

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-select'],
    queryFn: async () => {
      const { data } = await api.get('/leads?limit=1000');
      return data.data?.data || [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-select'],
    queryFn: async () => {
      const { data } = await api.get('/vendors?limit=1000');
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
      const { data } = await api.post('/income', payload);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnIncome(queryClient);
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
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
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      toast.success('Income receipt record deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete income record');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (newIncome.receivedFromType === 'CLIENT' && !newIncome.clientId) {
      toast.error('Please select a Client');
      return;
    }
    if (newIncome.receivedFromType === 'LEAD' && !newIncome.leadId) {
      toast.error('Please select a Lead inquiry');
      return;
    }
    if (newIncome.receivedFromType === 'VENDOR' && !newIncome.vendorId) {
      toast.error('Please select a Vendor');
      return;
    }
    if (!newIncome.amount) {
      toast.error('Amount is required');
      return;
    }
    const baseAmount = Number(newIncome.amount);
    let finalGstAmount = 0;
    
    if (newIncome.gstMode === 'PERCENTAGE') {
      finalGstAmount = (baseAmount * Number(newIncome.gstPercentage)) / 100;
    } else if (newIncome.gstMode === 'AMOUNT') {
      finalGstAmount = Number(newIncome.gstAmount);
    }

    const { receivedFromType, ...incomePayload } = newIncome;

    createMutation.mutate({
      ...incomePayload,
      clientId: newIncome.receivedFromType === 'CLIENT' ? newIncome.clientId : null,
      leadId: newIncome.receivedFromType === 'LEAD' ? newIncome.leadId : null,
      vendorId: newIncome.receivedFromType === 'VENDOR' ? newIncome.vendorId : null,
      projectId: newIncome.receivedFromType === 'LEAD' ? null : newIncome.projectId,
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
            Billing & Payment Inflows
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Log client milestone checks, lead advances, vendor receipts, and GST collection.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record Inflow Payment</span>
        </button>
      </div>

      <div className="clay-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-100/30 text-xs font-bold uppercase text-slate-400">
                <th className="p-4">Invoice / Ref</th>
                <th className="p-4">Received From</th>
                <th className="p-4">Project Contract</th>
                <th className="p-4">Payment Date</th>
                <th className="p-4">Method</th>
                <th className="p-4">Amount (₹)</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100/30 text-sm">
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No income receipts logged yet.</td>
                </tr>
              ) : (
                incomes.map((inc: any) => {
                  const entityName = inc.client?.name || inc.lead?.name || inc.vendor?.name || 'Direct Receipt';
                  const entityTag = inc.client ? 'Client' : inc.lead ? 'Lead' : inc.vendor ? 'Vendor' : 'Other';
                  return (
                    <tr key={inc.id} className="hover:bg-violet-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#7C6EF0]">{inc.invoiceNo || inc.reference || 'INV-001'}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{entityName}</div>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-100 text-slate-600">{entityTag}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-600">
                        {inc.project?.name || (inc.leadId ? 'Lead Inquiry (No Site)' : 'Main Site')}
                      </td>
                      <td className="p-4 text-slate-500">{formatDate(inc.paymentDate)}</td>
                      <td className="p-4 font-mono text-xs uppercase bg-[#7C6EF0]/10 text-[#7C6EF0] px-2 py-0.5 rounded-md w-fit">{inc.paymentMethod}</td>
                      <td className="p-4 font-mono font-extrabold text-[#5CB77E]">
                        {formatCurrency(Number(inc.totalAmount) || Number(inc.amount))}
                        {Number(inc.gstAmount) > 0 && <span className="block text-[10px] text-slate-400 font-sans font-normal">incl. {formatCurrency(Number(inc.gstAmount))} GST</span>}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={async () => {
                            if (await confirmDialog({ title: 'Confirm Action', message: 'Are you sure you want to delete this income receipt?' })) {
                              deleteMutation.mutate(inc.id);
                            }
                          }}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Income Record"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-violet-100/30">
          {incomes.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No income receipts logged yet.</div>
          ) : (
            incomes.map((inc: any) => {
              const entityName = inc.client?.name || inc.lead?.name || inc.vendor?.name || 'Direct Receipt';
              const entityTag = inc.client ? 'Client' : inc.lead ? 'Lead' : inc.vendor ? 'Vendor' : 'Other';
              return (
                <div key={inc.id} className="p-4 flex flex-col gap-3 hover:bg-violet-50/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono font-bold text-[#7C6EF0]">{inc.invoiceNo || inc.reference || 'INV-001'}</div>
                      <div className="font-bold text-slate-800 mt-1">{entityName} <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-100 text-slate-600 ml-1">{entityTag}</span></div>
                    </div>
                    <div className="font-mono font-extrabold text-[#5CB77E] text-lg text-right">
                      {formatCurrency(Number(inc.totalAmount) || Number(inc.amount))}
                      {Number(inc.gstAmount) > 0 && <span className="block text-[10px] text-slate-400 font-sans font-normal mt-0.5">incl. {formatCurrency(Number(inc.gstAmount))} GST</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-600">{inc.project?.name || (inc.leadId ? 'Lead Inquiry (No Site)' : 'Main Site')}</span>
                      <span>{formatDate(inc.paymentDate)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-3 border-t border-violet-100/30">
                    <span className="font-mono text-[10px] uppercase bg-[#7C6EF0]/10 text-[#7C6EF0] px-2 py-1 rounded-md">
                      {inc.paymentMethod}
                    </span>
                    <button
                      onClick={async () => {
                        if (await confirmDialog({ title: 'Confirm Action', message: 'Are you sure you want to delete this income receipt?' })) {
                          deleteMutation.mutate(inc.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl rounded-none p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Record Inflow Payment</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Received From Entity Type Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Received From Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewIncome({ ...newIncome, receivedFromType: 'CLIENT' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      newIncome.receivedFromType === 'CLIENT'
                        ? 'bg-[#7C6EF0] text-white border-[#7C6EF0] shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewIncome({ ...newIncome, receivedFromType: 'LEAD' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      newIncome.receivedFromType === 'LEAD'
                        ? 'bg-[#7C6EF0] text-white border-[#7C6EF0] shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Lead Inquiry
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewIncome({ ...newIncome, receivedFromType: 'VENDOR' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      newIncome.receivedFromType === 'VENDOR'
                        ? 'bg-[#7C6EF0] text-white border-[#7C6EF0] shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Vendor
                  </button>
                </div>
              </div>

              {/* Dynamic Entity Select */}
              {newIncome.receivedFromType === 'CLIENT' && (
                <select
                  required
                  value={newIncome.clientId}
                  onChange={(e) => setNewIncome({ ...newIncome, clientId: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Received From (Client) *</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}

              {newIncome.receivedFromType === 'LEAD' && (
                <select
                  required
                  value={newIncome.leadId}
                  onChange={(e) => setNewIncome({ ...newIncome, leadId: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Received From (Lead) *</option>
                  {leads.map((l: any) => <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>)}
                </select>
              )}

              {newIncome.receivedFromType === 'VENDOR' && (
                <select
                  required
                  value={newIncome.vendorId}
                  onChange={(e) => setNewIncome({ ...newIncome, vendorId: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Received From (Vendor) *</option>
                  {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              )}

              {/* Project Site Select - HIDDEN FOR LEAD INQUIRIES */}
              {newIncome.receivedFromType !== 'LEAD' && (
                <select
                  value={newIncome.projectId}
                  onChange={(e) => setNewIncome({ ...newIncome, projectId: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Project Site</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  required
                  value={newIncome.paymentDate}
                  onChange={(e) => setNewIncome({ ...newIncome, paymentDate: e.target.value })}
                  className="clay-input w-full text-sm"
                  title="Payment Date"
                />
                <input
                  type="number"
                  required
                  placeholder="Base Amount (₹) *"
                  value={newIncome.amount}
                  onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                  className="clay-input w-full text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={newIncome.gstMode}
                  onChange={(e) => setNewIncome({ ...newIncome, gstMode: e.target.value })}
                  className="clay-input w-full text-sm"
                  disabled={settings?.allowOperatorOverride === false}
                >
                  {!settings?.gstMandatory && <option value="NONE">No GST</option>}
                  <option value="PERCENTAGE">GST %</option>
                  {settings?.allowManualGstAmount !== false && <option value="AMOUNT">Manual GST (₹)</option>}
                </select>

                {newIncome.gstMode === 'PERCENTAGE' && (
                  <select
                    value={newIncome.gstPercentage}
                    onChange={(e) => setNewIncome({ ...newIncome, gstPercentage: Number(e.target.value) })}
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

                {newIncome.gstMode === 'AMOUNT' && (
                  <input
                    type="number"
                    placeholder="GST Amount (₹)"
                    value={newIncome.gstAmount}
                    onChange={(e) => setNewIncome({ ...newIncome, gstAmount: e.target.value })}
                    className="clay-input w-full text-sm font-mono"
                  />
                )}
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex justify-between items-center text-emerald-800">
                <span className="text-sm font-semibold">Total Amount:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(
                    Number(newIncome.amount) + 
                    (newIncome.gstMode === 'PERCENTAGE' ? (Number(newIncome.amount) * newIncome.gstPercentage) / 100 : 
                     newIncome.gstMode === 'AMOUNT' ? Number(newIncome.gstAmount) : 0)
                  )}
                </span>
              </div>

              <input
                type="text"
                placeholder="Invoice Number / UTR Reference"
                value={newIncome.invoiceNo}
                onChange={(e) => setNewIncome({ ...newIncome, invoiceNo: e.target.value })}
                className="clay-input w-full text-sm font-mono"
              />

              <CategorySelect
                module="payment_method"
                value={newIncome.paymentMethod}
                onChange={(val) => setNewIncome({ ...newIncome, paymentMethod: val })}
                defaultOptions={['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH', 'CREDIT_CARD']}
                placeholder="Select Payment Method..."
              />

              {['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CREDIT_CARD', 'CASH'].includes(newIncome.paymentMethod) && (
                <select
                  required
                  value={newIncome.accountId}
                  onChange={(e) => setNewIncome({ ...newIncome, accountId: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Bank Account *</option>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNo}</option>
                  ))}
                </select>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Log Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
