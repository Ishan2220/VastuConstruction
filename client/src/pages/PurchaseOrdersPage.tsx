import { useState, useEffect } from 'react';
import { Package, Search, Plus, FileText, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: { name: string };
  project?: { name: string };
  issueDate: string;
  status: string;
  totalAmount: number;
}

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create PO Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [newPO, setNewPO] = useState({
    poNumber: `PO-${Date.now().toString().slice(-6)}`,
    vendorId: '',
    projectId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    items: [{ materialId: '', quantityOrdered: '', rate: '' }],
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
    if (settings && isCreateModalOpen) {
      if (settings.defaultGstMode && newPO.gstMode === 'NONE') {
        setNewPO(prev => ({ ...prev, gstMode: settings.defaultGstMode, gstPercentage: settings.defaultGstPercentage || 18 }));
      }
    }
  }, [settings, isCreateModalOpen]);

  // Fetch lists for form
  const fetchFormOptions = async () => {
    try {
      const [vRes, pRes, mRes] = await Promise.all([
        api.get('/vendors'),
        api.get('/projects'),
        api.get('/materials')
      ]);
      setVendors(vRes.data?.data?.vendors || []);
      setProjects(pRes.data?.data?.projects || []);
      setMaterials(mRes.data?.data?.materials || []);
    } catch (err) {
      console.error('Failed to fetch options', err);
    }
  };

  const handleCreateClick = () => {
    fetchFormOptions();
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        ...newPO,
        items: newPO.items.map(i => ({
          materialId: i.materialId,
          quantityOrdered: Number(i.quantityOrdered),
          rate: Number(i.rate)
        }))
      };
      await api.post('/purchase-orders', payload);
      setIsCreateModalOpen(false);
      fetchPOs();
      // Reset form
      setNewPO({
        poNumber: `PO-${Date.now().toString().slice(-6)}`,
        vendorId: '',
        projectId: '',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        items: [{ materialId: '', quantityOrdered: '', rate: '' }],
        gstMode: settings?.defaultGstMode || 'NONE',
        gstPercentage: settings?.defaultGstPercentage || 18,
        gstAmount: '',
      });
    } catch (error) {
      console.error(error);
      alert('Failed to create Purchase Order');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/purchase-orders');
      if (res.data?.success) {
        setPos(res.data.data.purchaseOrders);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-white text-slate-600 border border-violet-100/30';
      case 'SUBMITTED': return 'bg-clay-blue/10 text-[#4EA8DE] border border-[#4EA8DE]/30';
      case 'APPROVED': return 'bg-clay-amber/10 text-[#F2A65A] border border-[#F2A65A]/30';
      case 'ORDERED': return 'bg-clay-violet/10 text-[#7C6EF0] border border-[#7C6EF0]/30';
      case 'PARTIAL': return 'bg-purple-100 text-purple-600 border border-purple-300';
      case 'RECEIVED': return 'bg-clay-green/10 text-[#5CB77E] border border-[#5CB77E]/30';
      case 'CANCELLED': return 'bg-clay-rose/10 text-[#E5636C] border border-[#E5636C]/30';
      default: return 'bg-white text-slate-500 border border-violet-100/30';
    }
  };

  const filteredPOs = pos.filter((po) => 
    po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    po.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-3 font-heading">
            <Package className="w-6 h-6 text-[#F2A65A]" />
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage procurement and material orders</p>
        </div>
        <button onClick={handleCreateClick} className="clay-btn flex items-center gap-2 px-4 py-2 text-sm font-bold shadow-md">
          <Plus className="w-4 h-4" />
          Create PO
        </button>
      </div>

      <div className="clay-card overflow-hidden">
        <div className="p-4 border-b border-violet-100/40 flex items-center gap-4 bg-white/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search PO number or vendor..."
              className="clay-input pl-10 bg-white"
            />
          </div>
          <button className="px-4 py-2 bg-white/50 hover:bg-white text-slate-600 rounded-xl text-sm font-bold transition-colors border border-violet-100/40 flex items-center gap-2 shadow-sm">
            Filter <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full hidden md:table min-w-max">
              <thead>
                <tr className="border-b border-violet-100/40 bg-white/50">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Payable To (Vendor)</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/40">
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500 font-medium">Loading purchase orders...</td></tr>
                ) : filteredPOs.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500 font-medium">No purchase orders found.</td></tr>
                ) : (
                  filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-white/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#7C6EF0]" />
                          <span className="text-sm font-bold text-slate-800 font-heading">{po.poNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {po.vendor?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {po.project?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                        {format(new Date(po.issueDate), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#7C6EF0] text-right font-mono">
                        ₹{Number(po.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button className="text-[#F2A65A] hover:text-[#d98b42] font-bold px-3 py-1.5 rounded-lg bg-clay-amber/10 hover:bg-clay-amber/20 transition-colors">View</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Card View */}
          <div className="flex flex-col gap-3 p-4 bg-slate-50/50 md:hidden">
            {isLoading ? (
              <div className="text-center text-slate-500 font-medium py-4">Loading purchase orders...</div>
            ) : filteredPOs.length === 0 ? (
              <div className="text-center text-slate-500 font-medium py-4">No purchase orders found.</div>
            ) : (
              filteredPOs.map((po) => (
                <div key={po.id} className="clay-card-sm p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#7C6EF0]" />
                      <span className="text-sm font-bold text-slate-800 font-heading">{po.poNumber}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(po.status)}`}>
                      {po.status}
                    </span>
                  </div>
                  <div>
                    <div className="text-slate-800 font-bold">{po.vendor?.name}</div>
                    <div className="text-slate-500 text-xs font-medium">{po.project?.name || 'No Project Assigned'}</div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-violet-100/40 pt-3 mt-1">
                    <span>{format(new Date(po.issueDate), 'dd MMM yyyy')}</span>
                    <span className="font-bold text-[#7C6EF0] font-mono text-sm">₹{Number(po.totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      </div>

      {/* Create PO Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Create Purchase Order</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">PO Number *</label>
                  <input
                    required
                    value={newPO.poNumber}
                    onChange={(e) => setNewPO({...newPO, poNumber: e.target.value})}
                    className="clay-input w-full text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={newPO.issueDate}
                    onChange={(e) => setNewPO({...newPO, issueDate: e.target.value})}
                    className="clay-input w-full text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Project Site *</label>
                <select
                  required
                  value={newPO.projectId}
                  onChange={(e) => setNewPO({...newPO, projectId: e.target.value})}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Vendor *</label>
                <select
                  required
                  value={newPO.vendorId}
                  onChange={(e) => setNewPO({...newPO, vendorId: e.target.value})}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-white/40 border border-violet-100/40 shadow-sm space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase">Order Item</div>
                <div className="space-y-3">
                  <select
                    required
                    value={newPO.items[0].materialId}
                    onChange={(e) => setNewPO({
                      ...newPO,
                      items: [{ ...newPO.items[0], materialId: e.target.value }]
                    })}
                    className="clay-input w-full text-sm"
                  >
                    <option value="">Select Material</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      required
                      placeholder="Quantity"
                      value={newPO.items[0].quantityOrdered}
                      onChange={(e) => setNewPO({
                        ...newPO,
                        items: [{ ...newPO.items[0], quantityOrdered: e.target.value }]
                      })}
                      className="clay-input w-full text-sm font-mono"
                    />
                    <input
                      type="number"
                      required
                      placeholder="Rate (₹)"
                      value={newPO.items[0].rate}
                      onChange={(e) => setNewPO({
                        ...newPO,
                        items: [{ ...newPO.items[0], rate: e.target.value }]
                      })}
                      className="clay-input w-full text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">GST Mode</label>
                  <select
                    value={newPO.gstMode}
                    onChange={(e) => setNewPO({ ...newPO, gstMode: e.target.value })}
                    className="clay-input w-full text-sm"
                    disabled={settings?.allowOperatorOverride === false}
                  >
                    {!settings?.gstMandatory && <option value="NONE">No GST</option>}
                    <option value="PERCENTAGE">GST %</option>
                    {settings?.allowManualGstAmount !== false && <option value="AMOUNT">Manual GST (₹)</option>}
                  </select>
                </div>

                {newPO.gstMode === 'PERCENTAGE' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">GST %</label>
                    <select
                      value={newPO.gstPercentage}
                      onChange={(e) => setNewPO({ ...newPO, gstPercentage: Number(e.target.value) })}
                      className="clay-input w-full text-sm"
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

                {newPO.gstMode === 'AMOUNT' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">GST Amount</label>
                    <input
                      type="number"
                      placeholder="GST Amount (₹)"
                      value={newPO.gstAmount}
                      onChange={(e) => setNewPO({ ...newPO, gstAmount: e.target.value })}
                      className="clay-input w-full text-sm font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="bg-[#7C6EF0]/10 p-3 rounded-xl border border-[#7C6EF0]/20 flex justify-between items-center text-[#7C6EF0]">
                <span className="text-sm font-bold uppercase tracking-wider">Total PO Amount:</span>
                <span className="font-mono font-bold text-lg">
                  {(
                    (Number(newPO.items[0].quantityOrdered) * Number(newPO.items[0].rate)) + 
                    (newPO.gstMode === 'PERCENTAGE' ? ((Number(newPO.items[0].quantityOrdered) * Number(newPO.items[0].rate)) * newPO.gstPercentage) / 100 : 
                     newPO.gstMode === 'AMOUNT' ? Number(newPO.gstAmount) : 0)
                  ).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </span>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={newPO.notes}
                  onChange={(e) => setNewPO({...newPO, notes: e.target.value})}
                  className="clay-input w-full text-sm resize-none"
                  placeholder="Terms, conditions, or remarks..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-violet-50 font-bold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="clay-btn px-6 py-2 text-white font-bold text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
