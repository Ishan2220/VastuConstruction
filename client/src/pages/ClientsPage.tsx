import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Phone, Mail, Building2, MapPin, Edit3, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
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

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/clients', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-directory'] });
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
    <div className="p-4 md:p-8 lg:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Client Directory & Corporate Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain high-profile client contracts, GSTIN compliance, company profiles, and billing ledgers.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Corporate Client</span>
        </button>
      </div>

      <div className="sticky top-16 z-20 bg-white/90 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients by name, company entity, phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-inner"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-slate-200 rounded-2xl" />)}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-slate-400">No client profiles found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client: any) => (
            <div key={client.id} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700">
                      {client.companyName || 'Private Client'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{client.gst || client.gstin || 'No GSTIN'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingClient(client)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Client Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete client ${client.name}?`)) {
                          deleteMutation.mutate(client.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Client Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-heading">{client.name}</h3>
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

              <div className="space-y-2 mt-2 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Total Billed</span>
                  <span className="font-bold text-slate-700">₹{(client.totalBilled || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Total Paid</span>
                  <span className="font-bold text-emerald-600">₹{(client.totalPaid || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-slate-50">
                  <span className="text-slate-900">Outstanding</span>
                  <span className={(client.outstanding || 0) > 0 ? 'text-rose-600' : 'text-slate-500'}>
                    ₹{(client.outstanding || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-50">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {client.city || 'Mumbai'}
                </span>
                <span className="font-semibold text-slate-500 uppercase tracking-wider">Client Account</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Register Client Profile</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Primary Contact Name *"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <input
                type="text"
                placeholder="Company / Enterprise Name"
                value={newClient.companyName}
                onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Phone Number *"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <input
                type="text"
                placeholder="GSTIN Number (Optional)"
                value={newClient.gstin}
                onChange={(e) => setNewClient({ ...newClient, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono uppercase"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={newClient.city}
                  onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={newClient.state}
                  onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                />
              </div>
              <input
                type="number"
                placeholder="Opening Balance (Optional)"
                value={newClient.openingBalance}
                onChange={(e) => setNewClient({ ...newClient, openingBalance: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Register Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Update Client Profile</h3>
              <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={editingClient.name || ''}
                onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-semibold"
              />
              <input
                type="text"
                placeholder="Company / Firm Name"
                value={editingClient.companyName || ''}
                onChange={(e) => setEditingClient({ ...editingClient, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="tel"
                  required
                  placeholder="Primary Phone *"
                  value={editingClient.phone || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={editingClient.email || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="GSTIN Code (Optional)"
                value={editingClient.gst || editingClient.gstin || ''}
                onChange={(e) => setEditingClient({ ...editingClient, gst: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono uppercase"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={editingClient.city || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={editingClient.state || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                />
              </div>
              <input
                type="number"
                placeholder="Opening Balance (Optional)"
                value={editingClient.openingBalance || ''}
                onChange={(e) => setEditingClient({ ...editingClient, openingBalance: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setEditingClient(null)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
