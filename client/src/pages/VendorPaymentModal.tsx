import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Banknote, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  vendorCategory: string;
  defaultProjectId?: string;
}

export function VendorPaymentModal({ isOpen, onClose, vendorId, vendorName, vendorCategory, defaultProjectId }: VendorPaymentModalProps) {
  const queryClient = useQueryClient();
  const isLabour = vendorCategory === 'LABOUR_CONTRACTOR';
  
  const [paymentData, setPaymentData] = useState({
    projectId: defaultProjectId || '',
    accountId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    purpose: '',
    reference: '',
    notes: '',
    amount: '',
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
    if (settings && isOpen) {
      if (settings.defaultGstMode && paymentData.gstMode === 'NONE') {
        setPaymentData(prev => ({ ...prev, gstMode: settings.defaultGstMode, gstPercentage: settings.defaultGstPercentage || 18 }));
      }
    }
  }, [settings, isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentData({
        projectId: defaultProjectId || '',
        accountId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'BANK_TRANSFER',
        purpose: '',
        reference: '',
        notes: '',
        amount: '',
        gstMode: settings?.defaultGstMode || 'NONE',
        gstPercentage: settings?.defaultGstPercentage || 18,
        gstAmount: '',
      });
    }
  }, [isOpen, vendorId, defaultProjectId]);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-select'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data?.data || [];
    }
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data } = await api.get('/bank-accounts');
      return data.data || [];
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post(`/vendors/${vendorId}/payments`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-details', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Payment recorded successfully');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to record payment')
  });

  const totalAmount = Number(paymentData.amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) {
      toast.error('Payment base amount must be greater than zero');
      return;
    }

    const baseAmount = totalAmount;
    let finalGstAmount = 0;
    
    if (paymentData.gstMode === 'PERCENTAGE') {
      finalGstAmount = (baseAmount * Number(paymentData.gstPercentage)) / 100;
    } else if (paymentData.gstMode === 'AMOUNT') {
      finalGstAmount = Number(paymentData.gstAmount);
    }

    paymentMutation.mutate({ 
      ...paymentData, 
      amount: baseAmount,
      gstAmount: finalGstAmount,
      totalAmount: baseAmount + finalGstAmount 
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="clay-card w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl relative my-auto"
        >
          <div className="flex items-center justify-between p-6 border-b border-violet-100/40 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 font-heading">Record Payment</h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{vendorName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Project / Site</label>
                <select
                  disabled={!!defaultProjectId}
                  value={paymentData.projectId}
                  onChange={(e) => setPaymentData({ ...paymentData, projectId: e.target.value })}
                  className="w-full px-4 py-2.5 clay-input text-sm disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">No Project (General)</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Source Account *</label>
                <select
                  required
                  value={paymentData.accountId}
                  onChange={(e) => setPaymentData({ ...paymentData, accountId: e.target.value })}
                  className="w-full px-4 py-2.5 clay-input text-sm"
                >
                  <option value="">Select Account...</option>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Method *</label>
                <select
                  required
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2.5 clay-input text-sm"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Purpose *</label>
                <select
                  required
                  value={paymentData.purpose}
                  onChange={(e) => setPaymentData({ ...paymentData, purpose: e.target.value })}
                  className="w-full px-4 py-2.5 clay-input text-sm"
                >
                  <option value="">Select Purpose...</option>
                  <option value="Materials">Materials (General)</option>
                  <option value="Cement">Cement</option>
                  <option value="Steel">Steel</option>
                  <option value="Labour">Labour / Wages</option>
                  <option value="Machinery">Machinery Rent</option>
                  <option value="Other">Other (Specify in notes)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  className="w-full px-4 py-2.5 clay-input text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Reference (Cheque/Txn)</label>
                <input
                  type="text"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  className="w-full px-4 py-2.5 clay-input text-sm"
                  placeholder="e.g. TXN12345678"
                />
              </div>


            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Remarks / Notes</label>
              <textarea
                rows={2}
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className="w-full px-4 py-2.5 clay-input text-sm"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Base Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                className="w-full px-4 py-2.5 clay-input text-lg font-bold text-[#7C6EF0]"
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">GST Mode</label>
                <select
                  value={paymentData.gstMode}
                  onChange={(e) => setPaymentData({ ...paymentData, gstMode: e.target.value })}
                  className="w-full px-4 py-2.5 clay-input text-sm"
                  disabled={settings?.allowOperatorOverride === false}
                >
                  {!settings?.gstMandatory && <option value="NONE">No GST</option>}
                  <option value="PERCENTAGE">GST %</option>
                  {settings?.allowManualGstAmount !== false && <option value="AMOUNT">Manual GST (₹)</option>}
                </select>
              </div>

              {paymentData.gstMode === 'PERCENTAGE' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">GST %</label>
                  <select
                    value={paymentData.gstPercentage}
                    onChange={(e) => setPaymentData({ ...paymentData, gstPercentage: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 clay-input text-sm"
                    disabled={settings?.allowOperatorOverride === false}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              )}

              {paymentData.gstMode === 'AMOUNT' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">GST Amount</label>
                  <input
                    type="number"
                    placeholder="GST Amount (₹)"
                    value={paymentData.gstAmount}
                    onChange={(e) => setPaymentData({ ...paymentData, gstAmount: e.target.value })}
                    className="w-full px-4 py-2.5 clay-input text-sm font-mono"
                  />
                </div>
              )}
            </div>

            <div className="bg-[#7C6EF0]/10 p-3 rounded-xl border border-[#7C6EF0]/20 flex justify-between items-center text-[#7C6EF0]">
              <span className="text-sm font-bold uppercase tracking-wider">Total Payment Amount:</span>
              <span className="font-mono font-bold text-lg">
                {(
                  Number(paymentData.amount) + 
                  (paymentData.gstMode === 'PERCENTAGE' ? (Number(paymentData.amount) * paymentData.gstPercentage) / 100 : 
                   paymentData.gstMode === 'AMOUNT' ? Number(paymentData.gstAmount) : 0)
                ).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </span>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-violet-100/40">
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={paymentMutation.isPending || totalAmount <= 0} className="px-6 py-2.5 clay-btn text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-2">
                  <Banknote className="w-4 h-4" /> Record Payment
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
