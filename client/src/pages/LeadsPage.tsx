import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp, clayCardHover } from '@/animations';
import {
  UserPlus,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  CheckCircle2,
  Filter,
  Calendar,
  Edit3,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  useQuickAddListener('lead', () => setIsCreateOpen(true));
  const [editingLead, setEditingLead] = useState<any>(null);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'REFERRAL',
    budget: '',
    plotSize: '',
    requiredService: 'Full Residential G+10 Construction',
    requirement: '',
    remarks: '',
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads-list'],
    queryFn: async () => {
      const { data } = await api.get('/leads');
      return data.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/leads', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Lead inquiry added successfully');
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add lead');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/leads/${id}/status`, { status });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Lead pipeline status updated');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/leads/${editingLead.id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Lead inquiry updated successfully');
      setEditingLead(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update lead');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/leads/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Lead record deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete lead');
    },
  });

  const handleUpdateLead = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...editingLead,
      budget: Number(editingLead.budget) || 0,
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) {
      toast.error('Name and Phone are required');
      return;
    }
    createMutation.mutate({
      ...newLead,
      budget: Number(newLead.budget) || 0,
    });
  };

  const filteredLeads = leads.filter((l: any) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone?.includes(searchTerm) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            CRM Leads & Construction Tenders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track incoming client inquiries, project bids, follow-ups, and conversion pipeline.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 clay-btn text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead Inquiry</span>
        </button>
      </div>

      <div className="sticky top-16 z-20 clay-card p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads by client name, phone, or email..."
            className="w-full pl-10 pr-4 py-2.5 clay-input text-sm focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="clay-card p-12 text-center space-y-3">
          <UserPlus className="w-10 h-10 text-[#7C6EF0] mx-auto" />
          <h3 className="font-bold text-slate-800 text-lg">No lead inquiries found</h3>
          <p className="text-sm text-slate-500">Log new construction or interior project inquiries above.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredLeads.map((lead: any) => (
              <div key={lead.id} className="clay-card p-4 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-3 border-b border-violet-100/30 gap-3">
                    <div className="flex items-center gap-2 flex-wrap pb-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-clay-violet text-[#7C6EF0] whitespace-nowrap">{lead.source}</span>
                      <button
                        onClick={() => setEditingLead(lead)}
                        className="p-1 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Lead Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete lead ${lead.name}?`)) {
                            deleteMutation.mutate(lead.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Lead Inquiry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: lead.id, status: e.target.value })}
                      className="text-xs font-bold uppercase px-2 py-1 clay-input text-slate-700 focus:outline-none w-28 sm:w-auto truncate"
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="SITE_VISIT_SCHEDULED">Site Visit</option>
                      <option value="PROPOSAL_SENT">Proposal Sent</option>
                      <option value="CONVERTED">Converted</option>
                      <option value="LOST">Lost</option>
                    </select>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 font-heading truncate">{lead.name}</h3>
                  <div className="text-xs text-slate-500 space-y-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate">{lead.phone}</span>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 pt-1 border-t border-violet-100/30">
                    Requirement: <strong>{lead.requirement || lead.requiredService || 'Construction'}</strong>
                  </p>
                </div>

                <div className="pt-3 border-t border-violet-100/30 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Budget:</span>
                  <span className="font-heading font-extrabold text-slate-900">{formatCurrency(Number(lead.budget || 0))}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto clay-card">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-violet-100/30">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Lead Details</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Budget & Req</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30">
                {filteredLeads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{lead.name}</div>
                      <div className="mt-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-clay-violet text-[#7C6EF0]">{lead.source}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-600 space-y-1">
                        <div className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5 text-slate-400" /> {lead.phone}</div>
                        {lead.email && <div className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5 text-slate-400" /> {lead.email}</div>}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-slate-900">{formatCurrency(Number(lead.budget || 0))}</div>
                      <div className="text-xs text-slate-500 truncate mt-1" title={lead.requirement || lead.requiredService}>{lead.requirement || lead.requiredService || 'Construction'}</div>
                    </td>
                    <td className="p-4">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: lead.id, status: e.target.value })}
                        className="text-xs font-bold uppercase px-2 py-1 clay-input text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="SITE_VISIT_SCHEDULED">Site Visit</option>
                        <option value="PROPOSAL_SENT">Proposal Sent</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingLead(lead)} className="p-1.5 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm(`Delete lead ${lead.name}?`)) deleteMutation.mutate(lead.id); }} className="p-1.5 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">New Lead Inquiry</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Client / Prospect Name *"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <input
                type="text"
                required
                placeholder="Phone Number (+91...) *"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                className="w-full clay-input text-sm font-heading"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <input
                type="number"
                placeholder="Estimated Budget (₹)"
                value={newLead.budget}
                onChange={(e) => setNewLead({ ...newLead, budget: e.target.value })}
                className="w-full clay-input text-sm font-heading"
              />
              <input
                type="text"
                placeholder="Required Scope / Plot Size"
                value={newLead.plotSize}
                onChange={(e) => setNewLead({ ...newLead, plotSize: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <textarea
                placeholder="Detailed Requirement / Description"
                value={newLead.requirement}
                onChange={(e) => setNewLead({ ...newLead, requirement: e.target.value })}
                className="w-full clay-input text-sm min-h-[80px]"
              />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Lead Source</label>
                <CategorySelect
                  module="lead_source"
                  value={newLead.source}
                  onChange={(val) => setNewLead({ ...newLead, source: val })}
                  defaultOptions={['REFERRAL', 'WEBSITE', 'WALK_IN', 'SOCIAL_MEDIA']}
                  placeholder="Select Lead Source..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 rounded-xl border border-violet-100/40 hover:bg-violet-50 text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-5 py-2 clay-btn text-white text-sm font-semibold">Add Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Update Lead Inquiry</h3>
              <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdateLead} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Client / Lead Name *"
                value={editingLead.name || ''}
                onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                className="w-full clay-input text-sm font-semibold"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="tel"
                  required
                  placeholder="Contact Number *"
                  value={editingLead.phone || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                  className="w-full clay-input text-sm font-heading"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={editingLead.email || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CategorySelect
                  module="lead_source"
                  value={editingLead.source || 'REFERRAL'}
                  onChange={(val) => setEditingLead({ ...editingLead, source: val })}
                  defaultOptions={['REFERRAL', 'WEBSITE', 'WALK_IN', 'SOCIAL_MEDIA']}
                  placeholder="Select Lead Source..."
                />
                <input
                  type="number"
                  placeholder="Expected Budget (₹)"
                  value={editingLead.budget || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, budget: e.target.value })}
                  className="w-full clay-input text-sm font-heading"
                />
              </div>
              <input
                type="text"
                placeholder="Required Scope / Plot Size"
                value={editingLead.requiredService || editingLead.plotSize || ''}
                onChange={(e) => setEditingLead({ ...editingLead, requiredService: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <textarea
                placeholder="Detailed Requirement / Description"
                value={editingLead.requirement || ''}
                onChange={(e) => setEditingLead({ ...editingLead, requirement: e.target.value })}
                className="w-full clay-input text-sm min-h-[80px]"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingLead(null)} className="px-4 py-2 rounded-xl border border-violet-100/40 hover:bg-violet-50 text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-5 py-2 clay-btn text-white text-sm font-semibold">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
