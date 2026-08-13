import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Phone, Mail, Building2, MapPin, Edit3, Trash2, Eye, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { formatCurrency, formatDate } from '@/lib/utils';
import { MAHARASHTRA_CITIES } from '@/lib/cities';
import { CategorySelect } from '@/components/common/CategorySelect';

export default function ClientsPage() {
    const confirmDialog = useConfirm();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [newClient, setNewClient] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    openingBalance: '',
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients-directory'],
    queryFn: async () => {
      const { data } = await api.get('/clients');
      return data.data?.data || [];
    },
  });

  const { data: clientIncomes = [], isLoading: isLoadingIncomes } = useQuery({
    queryKey: ['client-incomes', viewingClient?.id],
    queryFn: async () => {
      if (!viewingClient) return [];
      const { data } = await api.get(`/income?clientId=${viewingClient.id}&limit=1000`);
      return data.data?.data || [];
    },
    enabled: !!viewingClient,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/clients', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-directory'] });
      queryClient.invalidateQueries({ queryKey: ['clients-select'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Client profile created successfully');
      setIsAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create client profile');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/clients/${editingClient.id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-directory'] });
      queryClient.invalidateQueries({ queryKey: ['clients-select'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Client profile updated successfully');
      setEditingClient(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update client profile');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/clients/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-directory'] });
      queryClient.invalidateQueries({ queryKey: ['clients-select'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Client profile deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete client profile');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.phone) {
      toast.error('Client Name and Phone are required');
      return;
    }
    const { gstin, openingBalance, ...rest } = newClient;
    createMutation.mutate({
      ...rest,
      gst: gstin,
      openingBalance: openingBalance ? parseFloat(openingBalance as string) : 0,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const { gstin, gst, openingBalance, ...rest } = editingClient;
    updateMutation.mutate({
      ...rest,
      gst: gst || gstin,
      openingBalance: openingBalance ? parseFloat(openingBalance as string) : 0,
    });
  };

  const filteredClients = clients.filter((c: any) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Client Directory & Corporate Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain high-profile client contracts, GSTIN compliance, company profiles, and billing ledgers.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Corporate Client</span>
        </button>
      </div>

      <div className="sticky top-16 z-20 bg-white/70 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-2xl border border-violet-100/30 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients by name, company entity, phone..."
            className="w-full pl-10 pr-4 py-2.5 clay-input text-sm focus:outline-none focus:ring-2 focus:ring-[#7C6EF0]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-slate-200 rounded-2xl" />)}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="clay-card p-12 text-center text-slate-400">No client profiles found.</div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredClients.map((client: any) => (
              <div key={client.id} className="clay-card p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#7C6EF0]/10 text-[#7C6EF0]">
                        {client.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{client.gst || client.gstin || 'No GSTIN'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingClient(client)}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="View Client Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingClient(client)}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors cursor-pointer"
                        title="Edit Client Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to delete client ${client.name}?` })) {
                            deleteMutation.mutate(client.id);
                          }
                        }}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Client Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 font-heading">{client.name}</h3>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> <span>{client.phone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> <span>{client.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-2 pt-4 border-t border-violet-100/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total Billed</span>
                    <span className="font-bold text-slate-700">₹{(client.totalBilled || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total Paid</span>
                    <span className="font-bold text-emerald-600">₹{(client.totalPaid || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-violet-100/30">
                    <span className="text-slate-800">Outstanding</span>
                    <span className={(client.outstanding || 0) > 0 ? 'text-rose-600' : 'text-slate-500'}>
                      ₹{(client.outstanding || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-violet-100/30">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {client.city || 'Mumbai'}
                  </span>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider">Client Account</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto clay-card">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-violet-100/30">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Client</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Financials</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30">
                {filteredClients.map((client: any) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{client.name}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="font-mono">{client.gst || client.gstin || 'No GSTIN'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-600 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5" /> {client.phone}</div>
                        {client.email && <div className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5" /> {client.email}</div>}
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1"><MapPin className="w-3.5 h-3.5" /> {client.city || 'Mumbai'}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between gap-4"><span className="text-slate-500">Billed:</span> <span className="font-bold">₹{(client.totalBilled || 0).toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-slate-500">Paid:</span> <span className="font-bold text-emerald-600">₹{(client.totalPaid || 0).toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                          <span className="text-slate-500">Due:</span> 
                          <span className={(client.outstanding || 0) > 0 ? 'text-rose-600 font-bold' : 'text-slate-500 font-bold'}>
                            ₹{(client.outstanding || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingClient(client)}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="View Client Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingClient(client)}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit Client Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to delete client ${client.name}?` })) {
                              deleteMutation.mutate(client.id);
                            }
                          }}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Client Profile"
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
              <h3 className="font-bold text-lg font-heading text-slate-800">Register Client Profile</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Primary Contact Name *"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className="w-full clay-input text-sm"
              />

              <input
                type="text"
                required
                placeholder="Phone Number *"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                className="w-full clay-input text-sm font-mono"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <input
                type="text"
                placeholder="Full Address"
                value={newClient.address || ''}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CategorySelect
                  module="cities"
                  value={newClient.city}
                  onChange={(val) => setNewClient({ ...newClient, city: val })}
                  defaultOptions={MAHARASHTRA_CITIES}
                  placeholder="Select City *"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={newClient.state || ''}
                  onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="clay-btn px-5 py-2">Register Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Update Client Profile</h3>
              <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={editingClient.name || ''}
                onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                className="w-full clay-input text-sm font-semibold"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="tel"
                  required
                  placeholder="Primary Phone *"
                  value={editingClient.phone || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  className="w-full clay-input text-sm font-mono"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={editingClient.email || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Full Address"
                value={editingClient.address || ''}
                onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CategorySelect
                  module="cities"
                  value={editingClient.city || ''}
                  onChange={(val) => setEditingClient({ ...editingClient, city: val })}
                  defaultOptions={MAHARASHTRA_CITIES}
                  placeholder="Select City *"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={editingClient.state || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, state: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingClient(null)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="clay-btn px-5 py-2">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Client Profile & Payment History</h3>
              <button onClick={() => setViewingClient(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800">{viewingClient.name}</h4>
                {viewingClient.companyName && <div className="text-xs text-slate-500 font-medium">Company: <span className="text-slate-700">{viewingClient.companyName}</span></div>}
                <div className="text-xs text-slate-500 font-medium flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> <span className="text-slate-700">{viewingClient.phone}</span></div>
                {viewingClient.email && <div className="text-xs text-slate-500 font-medium flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> <span className="text-slate-700">{viewingClient.email}</span></div>}
              </div>
              <div className="space-y-2">
                <div className="text-xs text-slate-500 font-medium">GSTIN/PAN: <span className="text-slate-700 font-mono">{viewingClient.gst || viewingClient.gstin || viewingClient.pan || 'N/A'}</span></div>
                <div className="text-xs text-slate-500 font-medium flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5" /> 
                  <span className="text-slate-700 leading-relaxed">
                    {viewingClient.address ? `${viewingClient.address}, ` : ''}{viewingClient.city ? `${viewingClient.city}, ` : ''}{viewingClient.state || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-md text-slate-800 font-heading border-b border-slate-100 pb-2">Payment History</h4>
              {isLoadingIncomes ? (
                <div className="py-8 text-center text-slate-400 animate-pulse">Loading payment history...</div>
              ) : clientIncomes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No payment history found for this client.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Amount</th>
                        <th className="p-3 font-semibold">Mode</th>
                        <th className="p-3 font-semibold">Type</th>
                        <th className="p-3 font-semibold">Ref / Project</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientIncomes.map((inc: any) => (
                        <tr key={inc.id} className="hover:bg-slate-50/50">
                          <td className="p-3">{formatDate(inc.paymentDate || inc.createdAt)}</td>
                          <td className="p-3 font-bold text-emerald-600">{formatCurrency(inc.totalAmount || inc.amount)}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md uppercase">
                              {inc.paymentMethod?.replace('_', ' ') || '-'}
                            </span>
                          </td>
                          <td className="p-3 text-xs">{inc.type?.replace('_', ' ') || '-'}</td>
                          <td className="p-3 text-xs">
                            {inc.reference && <div className="font-mono text-slate-500">{inc.reference}</div>}
                            {inc.project?.name && <div className="text-[#7C6EF0] font-medium truncate max-w-[150px]" title={inc.project.name}>{inc.project.name}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
