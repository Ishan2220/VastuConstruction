import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  ArrowDownRight, 
  ArrowUpRight, 
  History,
  AlertTriangle,
  Plus,
  Minus
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ErrorState } from '@/components/ui/ErrorState';

import { useParams } from 'react-router';

export default function SiteMaterialsView({ projectId: propProjectId }: { projectId?: string }) {
  const { id } = useParams();
  const projectId = propProjectId || id || '';
  const queryClient = useQueryClient();
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  
  // Modals state
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isConsumeOpen, setIsConsumeOpen] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<any>(null);
  
  const [receiveData, setReceiveData] = useState({ quantity: '', rate: '', amount: '', reference: '', notes: '' });
  const [consumeData, setConsumeData] = useState({ quantity: '', notes: '' });

  // Data fetching
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['site-materials-summary', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/materials`);
      return data.data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ['site-material-history', projectId, selectedMaterialId],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/materials/${selectedMaterialId}/history`);
      return data.data;
    },
    enabled: !!selectedMaterialId,
  });

  const { data: materialsDirectory = [] } = useQuery({
    queryKey: ['materials-list'],
    queryFn: async () => {
      const { data } = await api.get('/materials');
      return data.data?.data || [];
    }
  });

  // Mutations
  const receiveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post(`/projects/${projectId}/materials/receive`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-materials-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['site-dashboard', projectId] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Material received and expense recorded');
      setIsReceiveOpen(false);
      setReceiveData({ quantity: '', rate: '', amount: '', reference: '', notes: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to record receipt')
  });

  const consumeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post(`/projects/${projectId}/materials/consume`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-materials-summary', projectId] });
      if (selectedMaterialId) {
        queryClient.invalidateQueries({ queryKey: ['site-material-history', projectId, selectedMaterialId] });
      }
      toast.success('Material consumption recorded');
      setIsConsumeOpen(false);
      setConsumeData({ quantity: '', notes: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to record consumption')
  });

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C6EF0]" /></div>;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const materials = summary?.materials || [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Material Entry
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track material inward and outward for this site.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setActiveMaterial(null);
              setIsReceiveOpen(true);
            }}
            className="clay-btn inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold transition-all"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Receive Material</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="clay-card p-5 rounded-2xl border border-violet-100/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Total Material Cost</p>
              <h3 className="text-2xl font-extrabold text-[#7C6EF0] font-heading">{formatCurrency(summary?.totalCost || 0)}</h3>
            </div>
            <div className="p-2 bg-clay-violet/30 rounded-xl text-[#7C6EF0]">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 font-heading">Material Inventory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((mat: any) => (
              <motion.div 
                key={mat.id}
                whileHover={{ y: -2 }}
                className={`clay-card p-5 rounded-2xl cursor-pointer transition-all border ${selectedMaterialId === mat.id ? 'border-[#7C6EF0] ring-2 ring-[#7C6EF0]/20' : 'border-slate-200'}`}
                onClick={() => setSelectedMaterialId(mat.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900">{mat.name}</h4>
                    <p className="text-xs text-slate-500">{mat.vendorName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMaterial(mat); setIsConsumeOpen(true); }}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                      title="Consume"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMaterial(mat); setIsReceiveOpen(true); }}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                      title="Receive"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-2 rounded-lg text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Received</div>
                    <div className="font-bold text-emerald-600">{mat.received}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Consumed</div>
                    <div className="font-bold text-rose-600">{mat.consumed}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Stock</div>
                    <div className={`font-bold ${mat.remaining <= 10 ? 'text-amber-600' : 'text-blue-600'}`}>{mat.remaining}</div>
                  </div>
                </div>
              </motion.div>
            ))}
            {materials.length === 0 && (
              <div className="col-span-full py-12 text-center clay-card rounded-2xl border border-dashed border-slate-300">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-600 font-semibold mb-1">No Materials Logged</h3>
                <p className="text-sm text-slate-500">Receive materials to this site to start tracking inventory.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 font-heading mb-4">Consumption History</h3>
          <div className="clay-card rounded-2xl border border-violet-100/30 overflow-hidden h-[600px] flex flex-col">
            {!selectedMaterialId ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center p-6">
                Select a material from the inventory to view its consumption history.
              </div>
            ) : (
              <div className="overflow-y-auto p-4 space-y-4">
                <div className="font-semibold text-slate-800 pb-2 border-b border-slate-100">
                  {materials.find((m: any) => m.id === selectedMaterialId)?.name || 'Material'} History
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-4">No history recorded yet.</p>
                ) : (
                  history.map((log: any) => (
                    <div key={log.id} className="flex gap-3 relative">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          log.action === 'CONSUMED' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {log.action === 'CONSUMED' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="w-px h-full bg-slate-200 mt-2"></div>
                      </div>
                      <div className="pb-6">
                        <p className="text-xs font-semibold text-slate-500">{formatDate(log.date)}</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                          {log.action === 'CONSUMED' ? 'Consumed' : 'Received'} {log.quantity} units
                        </p>
                        {log.notes && <p className="text-xs text-slate-600 mt-1">{log.notes}</p>}
                        {log.createdBy?.name && <p className="text-[10px] text-slate-400 mt-1">By {log.createdBy.name}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Consume Modal */}
      {isConsumeOpen && activeMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-h-[90vh] overflow-y-auto max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 font-heading mb-4">Consume {activeMaterial.name}</h3>
            <p className="text-xs text-slate-500 mb-4">Current Stock: <strong className="text-slate-800">{activeMaterial.remaining} {activeMaterial.unit}</strong></p>
            <form onSubmit={(e) => { e.preventDefault(); consumeMutation.mutate({ materialId: activeMaterial.id, ...consumeData }); }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Quantity to Consume *</label>
                <input
                  type="number"
                  required min="0.1" step="0.01" max={activeMaterial.remaining}
                  value={consumeData.quantity}
                  onChange={e => setConsumeData({...consumeData, quantity: e.target.value})}
                  className="w-full px-3 py-2 clay-input text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Notes / Area of Usage</label>
                <textarea
                  rows={2}
                  value={consumeData.notes}
                  onChange={e => setConsumeData({...consumeData, notes: e.target.value})}
                  className="w-full px-3 py-2 clay-input text-sm"
                  placeholder="e.g. Slab casting for Block A"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsConsumeOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={consumeMutation.isPending} className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-all shadow-rose-500/20 disabled:opacity-50">
                  Confirm Consumption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {isReceiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 font-heading mb-4">Receive Material to Site</h3>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const payload = { ...receiveData, materialId: activeMaterial ? activeMaterial.id : (e.target as any).materialSelect.value };
              receiveMutation.mutate(payload); 
            }} className="space-y-4">
              
              {!activeMaterial && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Select Material *</label>
                  <select name="materialSelect" required className="w-full px-3 py-2 clay-input text-sm">
                    <option value="">Select from directory...</option>
                    {materialsDirectory.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Quantity *</label>
                  <input type="number" required min="0.1" step="0.01" value={receiveData.quantity} onChange={e => setReceiveData({...receiveData, quantity: e.target.value})} className="w-full px-3 py-2 clay-input text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Rate / Unit (₹) *</label>
                  <input type="number" required min="0" step="0.01" value={receiveData.rate} onChange={e => setReceiveData({...receiveData, rate: e.target.value, amount: String(Number(receiveData.quantity) * Number(e.target.value))})} className="w-full px-3 py-2 clay-input text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Total Amount (₹) *</label>
                <input type="number" required min="0" step="0.01" value={receiveData.amount} onChange={e => setReceiveData({...receiveData, amount: e.target.value})} className="w-full px-3 py-2 clay-input text-sm bg-slate-50 font-bold" />
              </div>



              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Remarks</label>
                <textarea rows={2} value={receiveData.notes} onChange={e => setReceiveData({...receiveData, notes: e.target.value})} className="w-full px-3 py-2 clay-input text-sm" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsReceiveOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={receiveMutation.isPending} className="px-5 py-2 clay-btn text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
