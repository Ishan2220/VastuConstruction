import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  Edit3,
  Trash2,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';

export default function VendorsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  useQuickAddListener('vendor', () => setIsAddOpen(true));
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [newVendor, setNewVendor] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    category: 'CEMENT',
    gstin: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    openingBalance: '',
  });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const { data } = await api.get('/vendors');
      return data.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/vendors', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Vendor agency added successfully');
      setIsAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add vendor');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/vendors/${editingVendor.id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Vendor profile updated successfully');
      setEditingVendor(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update vendor');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/vendors/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Vendor agency deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete vendor');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.contactPerson) {
      toast.error('Vendor Name and Contact Person are required');
      return;
    }
    const { gstin, openingBalance, ...rest } = newVendor;
    createMutation.mutate({
      ...rest,
      gstin,
      openingBalance: openingBalance ? parseFloat(openingBalance as string) : 0,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const { gstin, gst, openingBalance, ...rest } = editingVendor;
    updateMutation.mutate({
      ...rest,
      gst: gst || gstin,
      openingBalance: openingBalance ? parseFloat(openingBalance as string) : 0,
    });
  };

  const filteredVendors = vendors.filter((v: any) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.phone?.includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Authorized Vendors & Material Suppliers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain supplier directory, GSTIN compliance, category specialization, and payment ledgers.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Vendor</span>
        </button>
      </div>

      <div className="clay-card p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search suppliers by agency name, category, or phone..."
            className="w-full pl-10 pr-4 py-2 clay-input text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-slate-200 rounded-2xl" />)}
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="clay-card p-12 text-center text-slate-400">No vendor agencies found.</div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredVendors.map((vendor: any) => (
              <div key={vendor.id} onClick={() => navigate(`/vendors/${vendor.id}`)} className="clay-card p-6 space-y-4 flex flex-col justify-between hover:border-[#7C6EF0]/30 transition-all cursor-pointer group">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#7C6EF0]/10 text-[#7C6EF0] border border-[#7C6EF0]/20">
                        {vendor.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{vendor.gst || vendor.gstin || 'GST Unregistered'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingVendor(vendor); }}
                        className="p-1.5 text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors cursor-pointer"
                        title="Edit Vendor Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete vendor agency ${vendor.name}?`)) {
                            deleteMutation.mutate(vendor.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Vendor Agency"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 font-heading">{vendor.name}</h3>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div>Contact: <strong className="text-slate-700">{vendor.contactPerson}</strong></div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> <span>{vendor.phone || 'N/A'}</span>
                    </div>
                    {vendor.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> <span>{vendor.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-4 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Purchased</span>
                    <span className="font-bold text-slate-800">₹{(vendor.totalPurchased || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Paid</span>
                    <span className="font-bold text-emerald-600">₹{(vendor.totalPaid || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-violet-100/30">
                    <span className="text-slate-800">Outstanding</span>
                    <span className={(vendor.outstanding || 0) > 0 ? 'text-rose-600' : 'text-slate-500'}>
                      ₹{(vendor.outstanding || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-violet-100/30 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {vendor.city || 'Mumbai'}
                  </span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto clay-card">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-violet-100/30">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Vendor</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Financials</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30">
                {filteredVendors.map((vendor: any) => (
                  <tr key={vendor.id} onClick={() => navigate(`/vendors/${vendor.id}`)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{vendor.name}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="font-bold text-[#7C6EF0] bg-[#7C6EF0]/10 px-2 py-0.5 rounded border border-[#7C6EF0]/20 font-mono">
                          {vendor.category}
                        </span>
                        <span className="font-mono">{vendor.gst || vendor.gstin || 'GST Unregistered'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-600 flex flex-col gap-1">
                        <div><strong className="text-slate-700">{vendor.contactPerson}</strong></div>
                        <div className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5" /> {vendor.phone || 'N/A'}</div>
                        {vendor.email && <div className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5" /> {vendor.email}</div>}
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1"><MapPin className="w-3.5 h-3.5" /> {vendor.city || 'Mumbai'}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between gap-4"><span className="text-slate-500">Purchased:</span> <span className="font-bold">₹{(vendor.totalPurchased || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-slate-500">Paid:</span> <span className="font-bold text-emerald-600">₹{(vendor.totalPaid || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                          <span className="text-slate-500">Due:</span> 
                          <span className={(vendor.outstanding || 0) > 0 ? 'text-rose-600 font-bold' : 'text-slate-500 font-bold'}>
                            ₹{(vendor.outstanding || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingVendor(vendor); }}
                          className="p-1.5 text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors"
                          title="Edit Vendor Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete vendor agency ${vendor.name}?`)) {
                              deleteMutation.mutate(vendor.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Vendor Agency"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Onboard Vendor Agency</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Agency Name *"
                value={newVendor.name}
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <input
                type="text"
                required
                placeholder="Contact Person *"
                value={newVendor.contactPerson}
                onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <div className="grid grid-cols-2 gap-4">
                <CategorySelect
                  module="vendors"
                  value={newVendor.category}
                  onChange={(val) => setNewVendor({ ...newVendor, category: val })}
                  defaultOptions={['CEMENT', 'STEEL', 'AGGREGATE', 'BRICKS', 'ELECTRICAL', 'PLUMBING']}
                  placeholder="Select Category..."
                />
                  <input
                  type="text"
                  placeholder="City"
                  value={newVendor.city}
                  onChange={(e) => setNewVendor({ ...newVendor, city: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="State"
                  value={newVendor.state || ''}
                  onChange={(e) => setNewVendor({ ...newVendor, state: e.target.value })}
                  className="w-full clay-input text-sm"
                />
                <input
                  type="number"
                  placeholder="Opening Balance"
                  value={newVendor.openingBalance}
                  onChange={(e) => setNewVendor({ ...newVendor, openingBalance: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Phone Number *"
                value={newVendor.phone}
                onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                className="w-full clay-input text-sm font-mono"
              />
              <input
                type="text"
                placeholder="GSTIN Number (15 digits)"
                value={newVendor.gstin}
                onChange={(e) => setNewVendor({ ...newVendor, gstin: e.target.value.toUpperCase() })}
                className="w-full clay-input text-sm font-mono"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="clay-btn px-5 py-2">Onboard</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Update Vendor Agency</h3>
              <button onClick={() => setEditingVendor(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Agency Name *"
                value={editingVendor.name || ''}
                onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                className="w-full clay-input text-sm font-semibold"
              />
              <input
                type="text"
                required
                placeholder="Primary Contact Person *"
                value={editingVendor.contactPerson || ''}
                onChange={(e) => setEditingVendor({ ...editingVendor, contactPerson: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <div className="grid grid-cols-2 gap-4">
                <CategorySelect
                  module="vendors"
                  value={editingVendor.category || 'CEMENT'}
                  onChange={(val) => setEditingVendor({ ...editingVendor, category: val })}
                  defaultOptions={['CEMENT', 'STEEL', 'BRICKS', 'PLUMBING', 'ELECTRICAL', 'AGGREGATES']}
                  placeholder="Select Category..."
                />
                  <input
                  type="text"
                  placeholder="City"
                  value={editingVendor.city || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, city: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <input
                  type="text"
                  placeholder="State"
                  value={editingVendor.state || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, state: e.target.value })}
                  className="w-full clay-input text-sm"
                />
                <input
                  type="number"
                  placeholder="Opening Balance"
                  value={editingVendor.openingBalance || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, openingBalance: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Phone Number *"
                value={editingVendor.phone || ''}
                onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                className="w-full clay-input text-sm font-mono"
              />
              <input
                type="text"
                placeholder="GSTIN Number"
                value={editingVendor.gst || editingVendor.gstin || ''}
                onChange={(e) => setEditingVendor({ ...editingVendor, gst: e.target.value.toUpperCase() })}
                className="w-full clay-input text-sm font-mono uppercase"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingVendor(null)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="clay-btn px-5 py-2">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
