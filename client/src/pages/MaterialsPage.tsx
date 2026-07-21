import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  Trash2,
  Pencil,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';

export default function MaterialsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'ORDERS' | 'DIRECTORY'>('STOCK');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  useQuickAddListener('material', () => setIsOrderOpen(true));

  // Order modal state
  const [newOrder, setNewOrder] = useState({
    vendorId: '',
    projectId: '',
    notes: '',
    items: [{ materialId: '', quantityOrdered: '', rate: '' }],
  });

  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [editStock, setEditStock] = useState<any | null>(null);

  const [isAddDirOpen, setIsAddDirOpen] = useState(false);
  const [newDir, setNewDir] = useState({
    name: '',
    code: '',
    category: 'CEMENT',
    unit: 'BAGS',
    unitPrice: '',
    minStockAlert: 50,
  });

  const [isEditDirOpen, setIsEditDirOpen] = useState(false);
  const [editDir, setEditDir] = useState<any | null>(null);

  const { data: stockData = [], isLoading: isStockLoading } = useQuery({
    queryKey: ['material-stock'],
    queryFn: async () => {
      const { data } = await api.get('/materials/stock');
      return data.data?.data || [];
    },
  });

  const { data: materialsList = [] } = useQuery({
    queryKey: ['materials-list'],
    queryFn: async () => {
      const { data } = await api.get('/materials');
      return data.data?.data || [];
    },
  });

  const { data: ordersList = [] } = useQuery({
    queryKey: ['material-orders'],
    queryFn: async () => {
      const { data } = await api.get('/material-orders');
      return data.data?.data || [];
    },
  });

  const { data: vendorsList = [] } = useQuery({
    queryKey: ['vendors-select'],
    queryFn: async () => {
      const { data } = await api.get('/vendors');
      return data.data?.data || [];
    },
  });

  const { data: projectsList = [] } = useQuery({
    queryKey: ['projects-select'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data?.data || [];
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderPayload: any) => {
      const { data } = await api.post('/material-orders', orderPayload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Material purchase order dispatched');
      setIsOrderOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to dispatch order');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/material-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Purchase order deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete order');
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { data } = await api.put(`/materials/stock/${id}`, { quantity });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Stock quantity updated');
      setIsEditStockOpen(false);
      setEditStock(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    },
  });

  const deleteStockMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/materials/stock/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Stock record removed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete stock record');
    },
  });

  const addDirMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/materials', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('New material added to directory');
      setIsAddDirOpen(false);
      setNewDir({ name: '', code: '', category: 'CEMENT', unit: 'BAGS', unitPrice: '', minStockAlert: 50 });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add material');
    },
  });

  const updateDirMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/materials/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Material directory info updated');
      setIsEditDirOpen(false);
      setEditDir(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update material');
    },
  });

  const deleteDirMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Material removed from directory');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove material');
    },
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.vendorId || !newOrder.projectId || !newOrder.items[0].materialId) {
      toast.error('Please fill required vendor, project, and material details');
      return;
    }
    const formattedItems = newOrder.items.map((it) => ({
      materialId: it.materialId,
      quantityOrdered: Number(it.quantityOrdered) || 1,
      rate: Number(it.rate) || 0,
    }));
    createOrderMutation.mutate({
      vendorId: newOrder.vendorId,
      projectId: newOrder.projectId,
      notes: newOrder.notes,
      items: formattedItems,
    });
  };

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Material Inventory & Procurement
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track site rebar, cement bags, bricks, low stock thresholds, and purchase orders.
          </p>
        </div>

        <button
          onClick={() => setIsOrderOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Purchase Order</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-violet-100/30 pb-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'STOCK', label: 'Site Inventory Levels ({count})'.replace('{count}', String(stockData.length)) },
          { id: 'ORDERS', label: 'Purchase Orders ({count})'.replace('{count}', String(ordersList.length)) },
          { id: 'DIRECTORY', label: 'Material Catalog ({count})'.replace('{count}', String(materialsList.length)) },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[#7C6EF0] text-white shadow-md'
                : 'text-slate-600 hover:bg-violet-50/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content based on tab */}
      {activeTab === 'STOCK' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stockData.map((s: any) => {
              const isLow = Number(s.quantity) <= Number(s.material?.minStockAlert || 50);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`clay-card p-6 flex flex-col justify-between ${
                    isLow ? '!border-[#E5636C]/40 !bg-rose-50/50 shadow-[inset_0_0_20px_rgba(229,99,108,0.1)]' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/60 shadow-sm border border-violet-100/30 text-slate-700">
                        {s.material?.code || 'MAT-001'}
                      </span>
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-100/80 text-[#E5636C] border border-[#E5636C]/20 shadow-sm">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50/80 text-[#5CB77E] border border-[#5CB77E]/20 shadow-sm">
                          <CheckCircle2 className="w-3 h-3" /> Optimal
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-800 font-heading">{s.material?.name}</h3>
                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> Site: <strong className="text-slate-700">{s.project?.name || 'Main Site'}</strong>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-violet-100/30 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-[#7C6EF0] font-mono">{s.quantity}</span>
                      <span className="text-xs font-bold text-slate-500 ml-1.5 uppercase">{s.material?.unit || 'UNITS'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditStock({ id: s.id, quantity: s.quantity, materialName: s.material?.name });
                          setIsEditStockOpen(true);
                        }}
                        className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#F2A65A] transition-all shadow-sm border border-amber-100/50"
                        title="Edit Stock Quantity"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove stock record for ${s.material?.name}?`)) {
                            deleteStockMutation.mutate(s.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#E5636C] transition-all shadow-sm border border-rose-100/50"
                        title="Remove Stock Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'ORDERS' && (
        <div className="clay-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-violet-100/30 text-xs font-bold uppercase text-slate-400">
                  <th className="p-4">PO Number</th>
                  <th className="p-4">Project Site</th>
                  <th className="p-4">Vendor Agency</th>
                  <th className="p-4">Order Date</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30 text-sm">
                {ordersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">No purchase orders dispatched yet.</td>
                  </tr>
                ) : (
                  ordersList.map((o: any) => (
                    <tr key={o.id} className="hover:bg-violet-50/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#7C6EF0]">{o.orderNumber}</td>
                      <td className="p-4 font-semibold text-slate-800">{o.project?.name || 'Site Project'}</td>
                      <td className="p-4 text-slate-600">{o.vendor?.name || 'Authorized Distributor'}</td>
                      <td className="p-4 text-slate-500">{new Date(o.orderDate).toLocaleDateString('en-IN')}</td>
                      <td className="p-4 font-mono font-extrabold text-slate-800">{formatCurrency(Number(o.totalAmount))}</td>
                      <td className="p-4">
                        <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-md border shadow-sm ${
                          o.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-[#5CB77E] border-emerald-200/50'
                            : o.status === 'PARTIAL'
                            ? 'bg-amber-50 text-[#F2A65A] border-amber-200/50'
                            : 'bg-blue-50 text-[#4EA8DE] border-blue-200/50'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete PO ${o.orderNumber}?`)) {
                              deleteOrderMutation.mutate(o.id);
                            }
                          }}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#E5636C] transition-all shadow-sm border border-rose-100/50"
                          title="Delete Purchase Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'DIRECTORY' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsAddDirOpen(true)}
              className="clay-btn px-4 py-2 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Material to Directory
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {materialsList.map((m: any) => (
              <div key={m.id} className="clay-card p-6 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/60 border border-violet-100/30 text-slate-600 shadow-sm">{m.code}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#7C6EF0]/10 border border-[#7C6EF0]/20 text-[#7C6EF0] shadow-sm">{m.category}</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base font-heading mt-3">{m.name}</h3>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-violet-100/30 text-xs text-slate-500">
                  <div>
                    Unit: <strong className="uppercase text-slate-700">{m.unit}</strong> | Rate: <strong className="font-mono text-slate-800">₹{m.unitPrice || 0}</strong>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditDir({ ...m });
                        setIsEditDirOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#F2A65A] transition-all shadow-sm border border-amber-100/50"
                      title="Edit Material"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${m.name} from directory?`)) {
                          deleteDirMutation.mutate(m.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#E5636C] transition-all shadow-sm border border-rose-100/50"
                      title="Delete Material"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Purchase Order Modal */}
      {isOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Raise Material Purchase Order</h3>
              <button onClick={() => setIsOrderOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">
                Close ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Project Site *</label>
                <select
                  required
                  value={newOrder.projectId}
                  onChange={(e) => setNewOrder({ ...newOrder, projectId: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Project Site</option>
                  {projectsList.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Vendor Supplier *</label>
                <select
                  required
                  value={newOrder.vendorId}
                  onChange={(e) => setNewOrder({ ...newOrder, vendorId: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Select Vendor Agency</option>
                  {vendorsList.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-white/40 border border-violet-100/40 shadow-[inset_0_0_10px_rgba(124,110,240,0.02)] space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase">Order Item Detail</div>
                <div className="space-y-2">
                  <select
                    required
                    value={newOrder.items[0].materialId}
                    onChange={(e) => setNewOrder({
                      ...newOrder,
                      items: [{ ...newOrder.items[0], materialId: e.target.value }],
                    })}
                    className="clay-input w-full text-sm"
                  >
                    <option value="">Select Material</option>
                    {materialsList.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.code}) - ₹{m.unitPrice}/{m.unit}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      required
                      placeholder="Quantity"
                      value={newOrder.items[0].quantityOrdered}
                      onChange={(e) => setNewOrder({
                        ...newOrder,
                        items: [{ ...newOrder.items[0], quantityOrdered: e.target.value }],
                      })}
                      className="clay-input w-full text-sm font-mono"
                    />
                    <input
                      type="number"
                      required
                      placeholder="Unit Rate (₹)"
                      value={newOrder.items[0].rate}
                      onChange={(e) => setNewOrder({
                        ...newOrder,
                        items: [{ ...newOrder.items[0], rate: e.target.value }],
                      })}
                      className="clay-input w-full text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button
                  type="button"
                  onClick={() => setIsOrderOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-violet-50 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="clay-btn px-5 py-2 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {createOrderMutation.isPending ? 'Dispatching...' : 'Dispatch Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {isEditStockOpen && editStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-sm p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Update Stock: {editStock.materialName}</h3>
              <button onClick={() => setIsEditStockOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateStockMutation.mutate({ id: editStock.id, quantity: Number(editStock.quantity) });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700">Stock Quantity</label>
                <input
                  type="number"
                  required
                  value={editStock.quantity}
                  onChange={(e) => setEditStock({ ...editStock, quantity: e.target.value })}
                  className="clay-input w-full text-sm mt-1"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsEditStockOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={updateStockMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-bold">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Directory Modal */}
      {isAddDirOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-md p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Add Material to Directory</h3>
              <button onClick={() => setIsAddDirOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addDirMutation.mutate({
                  name: newDir.name,
                  code: newDir.code || `MAT-${Math.floor(Math.random() * 900 + 100)}`,
                  category: newDir.category,
                  unit: newDir.unit,
                  unitPrice: Number(newDir.unitPrice) || 0,
                  minStockAlert: Number(newDir.minStockAlert) || 50,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700">Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Cement 53 Grade"
                  value={newDir.name}
                  onChange={(e) => setNewDir({ ...newDir, name: e.target.value })}
                  className="clay-input w-full text-sm mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Item Code</label>
                  <input
                     type="text"
                    placeholder="e.g. CEM-53"
                    value={newDir.code}
                    onChange={(e) => setNewDir({ ...newDir, code: e.target.value })}
                    className="clay-input w-full text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <CategorySelect
                    module="materials"
                    value={newDir.category}
                    onChange={(val) => setNewDir({ ...newDir, category: val })}
                    defaultOptions={['CEMENT', 'STEEL', 'BRICKS', 'AGGREGATE', 'ELECTRICAL', 'PLUMBING', 'OTHER']}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. BAGS, TONNE, SQFT"
                    value={newDir.unit}
                    onChange={(e) => setNewDir({ ...newDir, unit: e.target.value })}
                    className="clay-input w-full text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Unit Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 420"
                    value={newDir.unitPrice}
                    onChange={(e) => setNewDir({ ...newDir, unitPrice: e.target.value })}
                    className="clay-input w-full text-sm mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsAddDirOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={addDirMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-bold">Save Material</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Directory Modal */}
      {isEditDirOpen && editDir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-md p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Edit Material Directory Item</h3>
              <button onClick={() => setIsEditDirOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateDirMutation.mutate({
                  id: editDir.id,
                  payload: {
                    name: editDir.name,
                    code: editDir.code,
                    category: editDir.category,
                    unit: editDir.unit,
                    unitPrice: Number(editDir.unitPrice) || 0,
                  },
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700">Material Name</label>
                <input
                  type="text"
                  required
                  value={editDir.name}
                  onChange={(e) => setEditDir({ ...editDir, name: e.target.value })}
                  className="clay-input w-full text-sm mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <CategorySelect
                    module="materials"
                    value={editDir.category || ''}
                    onChange={(val) => setEditDir({ ...editDir, category: val })}
                    defaultOptions={['CEMENT', 'STEEL', 'BRICKS', 'AGGREGATE', 'ELECTRICAL', 'PLUMBING', 'OTHER']}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Item Code</label>
                  <input
                    type="text"
                    value={editDir.code || ''}
                    onChange={(e) => setEditDir({ ...editDir, code: e.target.value })}
                    className="clay-input w-full text-sm mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Unit</label>
                  <input
                    type="text"
                    value={editDir.unit}
                    onChange={(e) => setEditDir({ ...editDir, unit: e.target.value })}
                    className="clay-input w-full text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Unit Price (₹)</label>
                  <input
                    type="number"
                    value={editDir.unitPrice}
                    onChange={(e) => setEditDir({ ...editDir, unitPrice: e.target.value })}
                    className="clay-input w-full text-sm mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsEditDirOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={updateDirMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
