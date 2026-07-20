import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Building2, MapPin, HardHat, TrendingUp, Plus, Edit3, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';

export default function SitesPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  useQuickAddListener('project', () => setIsAddOpen(true));
  const [editingSite, setEditingSite] = useState<any>(null);

  const [newSite, setNewSite] = useState({
    name: '',
    code: '',
    clientId: '',
    status: 'IN_PROGRESS',
    budget: '',
    contractValue: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    description: '',
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects-sites'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
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

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/projects', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-sites'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Site project registered successfully');
      setIsAddOpen(false);
      setNewSite({
        name: '',
        code: '',
        clientId: '',
        status: 'IN_PROGRESS',
        budget: '',
        contractValue: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        description: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to register site project');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/projects/${editingSite.id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-sites'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Site project updated successfully');
      setEditingSite(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update site project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/projects/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-sites'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Site project deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete site project');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.name || !newSite.code || !newSite.clientId) {
      toast.error('Site Name, Code, and Client are required');
      return;
    }
    createMutation.mutate({
      ...newSite,
      budget: Number(newSite.budget) || 0,
      contractValue: Number(newSite.contractValue) || 0,
      startDate: new Date(),
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name: editingSite.name,
      status: editingSite.status,
      progress: Number(editingSite.progress) || 0,
      contractValue: Number(editingSite.contractValue) || 0,
      city: editingSite.city,
      state: editingSite.state,
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Construction Sites Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Geographic monitoring, site progress reports, physical milestone tracking, and full admin management.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Site Project</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-64 bg-slate-200 rounded-2xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-slate-400">No active construction sites registered.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj: any) => (
            <motion.div
              key={proj.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700">
                      {proj.code}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> {proj.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingSite(proj)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Site Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${proj.name}?`)) {
                          deleteMutation.mutate(proj.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Site"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link to={`/projects/${proj.id}`} className="block hover:underline">
                  <h3 className="text-xl font-bold text-slate-900 font-heading">{proj.name}</h3>
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{proj.address ? `${proj.address}, ` : ''}<strong>{proj.city || 'Site Location'}</strong>{proj.state ? ` (${proj.state})` : ''}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 pt-1 border-t border-slate-100">
                  {proj.description || 'No site description or architectural details provided for this project yet.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Physical Slab Completion</span>
                    <span className="text-indigo-600 font-mono">{proj.progress || 0}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${proj.progress || 0}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-500">Contract Valuation</div>
                  <div className="text-sm font-extrabold font-mono text-slate-900">
                    {formatCurrency(Number(proj.contractValue || 0))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Add New Construction Site</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Project / Site Name *"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50"
                />
                <input
                  type="text"
                  required
                  placeholder="Site Code (e.g. SITE-004) *"
                  value={newSite.code}
                  onChange={(e) => setNewSite({ ...newSite, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 font-mono uppercase"
                />
              </div>
              <select
                required
                value={newSite.clientId}
                onChange={(e) => setNewSite({ ...newSite, clientId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50"
              >
                <option value="">Assign Corporate Client *</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.companyName || 'Private'})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Estimated Budget (₹)"
                  value={newSite.budget}
                  onChange={(e) => setNewSite({ ...newSite, budget: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 font-mono"
                />
                <input
                  type="number"
                  placeholder="Total Contract Value (₹)"
                  value={newSite.contractValue}
                  onChange={(e) => setNewSite({ ...newSite, contractValue: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={newSite.city}
                  onChange={(e) => setNewSite({ ...newSite, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={newSite.state}
                  onChange={(e) => setNewSite({ ...newSite, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50"
                />
              </div>
              <textarea
                placeholder="Scope of work & site specifications..."
                value={newSite.description}
                onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 h-20"
              />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Register Site</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Update Site Project: {editingSite.name}</h3>
              <button onClick={() => setEditingSite(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Site Name</label>
                <input
                  type="text"
                  value={editingSite.name}
                  onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={editingSite.status}
                  onChange={(e) => setEditingSite({ ...editingSite, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 font-semibold"
                >
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="PLANNING">PLANNING</option>
                  <option value="ON_HOLD">ON HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Slab Progress (%)</label>
                <input
                  type="number"
                  value={editingSite.progress || 0}
                  onChange={(e) => setEditingSite({ ...editingSite, progress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contract Valuation (₹)</label>
                <input
                  type="number"
                  value={editingSite.contractValue || 0}
                  onChange={(e) => setEditingSite({ ...editingSite, contractValue: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={editingSite.city || ''}
                    onChange={(e) => setEditingSite({ ...editingSite, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">State</label>
                  <input
                    type="text"
                    value={editingSite.state || ''}
                    onChange={(e) => setEditingSite({ ...editingSite, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setEditingSite(null)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
