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
  Download,
  Building2,
  Eye,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuthStore } from '@/store/authStore';
import { MAHARASHTRA_CITIES } from '@/lib/cities';

export default function LeadsPage() {
    const confirmDialog = useConfirm();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  useQuickAddListener('lead', () => setIsCreateOpen(true));
  const [editingLead, setEditingLead] = useState<any>(null);
  const [viewingLead, setViewingLead] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('createdAt');
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
    captureDate: new Date().toISOString(),
    plotAddress: '',
    plotArea: '',
    plotDescription: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: '',
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads-list', filterStatus, dateRange, sortBy],
    queryFn: async () => {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (dateRange.start) params.captureDateStart = dateRange.start;
      if (dateRange.end) params.captureDateEnd = dateRange.end;
      if (sortBy) params.sortBy = sortBy;
      
      const { data } = await api.get('/leads', { params });
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
      setNewLead({
        name: '',
        phone: '',
        email: '',
        source: 'REFERRAL',
        budget: '',
        plotSize: '',
        requiredService: 'Full Residential G+10 Construction',
        requirement: '',
        remarks: '',
        captureDate: new Date().toISOString(),
        plotAddress: '',
        plotArea: '',
        plotDescription: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        address: '',
      });
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
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update lead status');
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

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/leads/${id}/convert`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Lead converted to Client successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to convert lead');
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

  const isDuplicate = leads.some((l: any) => 
    (newLead.name && l.name.toLowerCase() === newLead.name.toLowerCase()) || 
    (newLead.phone && l.phone === newLead.phone)
  );

  const filteredLeads = leads.filter((l: any) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone?.includes(searchTerm) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.plotAddress?.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="Search leads by client name, phone, or plot address..."
            className="w-full pl-10 pr-4 py-2.5 clay-input text-sm focus:outline-none"
          />
        </div>
        
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="clay-input py-2.5 text-sm w-full md:w-auto">
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="SITE_VISIT">Site Visit</option>
          <option value="PROPOSAL_SENT">Proposal</option>
          <option value="NEGOTIATION">Negotiation</option>
          <option value="WON">Won</option>
          <option value="LOST">Lost</option>
        </select>

        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))} className="clay-input py-2 text-xs w-full md:w-auto" title="Start Capture Date" />
          <span className="text-slate-400">-</span>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))} className="clay-input py-2 text-xs w-full md:w-auto" title="End Capture Date" />
        </div>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="clay-input py-2.5 text-sm w-full md:w-auto">
          <option value="createdAt">Sort: Created Date</option>
          <option value="captureDate">Sort: Capture Date</option>
          <option value="budget">Sort: Budget</option>
          <option value="plotArea">Sort: Plot Area</option>
        </select>


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
            {filteredLeads.map((lead: any) => {
              const totalPaid = lead.incomes?.reduce((acc: number, inc: any) => acc + (Number(inc.totalAmount) || Number(inc.amount) || 0), 0) || 0;
              const pendingAmount = Number(lead.pendingAmount ?? Math.max(0, Number(lead.budget || 0) - totalPaid));
              return (
                <div key={lead.id} className="clay-card p-4 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-3 border-b border-violet-100/30 gap-3">
                      <div className="flex items-center gap-2 flex-wrap pb-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-clay-violet text-[#7C6EF0] whitespace-nowrap">{lead.source}</span>
                        <button
                          onClick={() => setViewingLead(lead)}
                          className="p-1 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                          title="View Lead Details & Payments"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingLead(lead)}
                          className="p-1 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Lead Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to delete lead ${lead.name}?` })) {
                              deleteMutation.mutate(lead.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Lead Inquiry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {lead.status !== 'WON' && (
                          <button
                            onClick={async () => {
                              if (await confirmDialog({ title: 'Convert Lead', message: `Convert ${lead.name} to a Client?` })) {
                                convertMutation.mutate(lead.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer ml-auto"
                            title="Convert to Client"
                          >
                            <Building2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                        <select
                          value={lead.status}
                          disabled={lead.status === 'WON' && (user?.(role !== 'ADMIN' && role !== 'SUPER_ADMIN') && user?.role !== 'SUPER_ADMIN')}
                          onChange={(e) => updateStatusMutation.mutate({ id: lead.id, status: e.target.value })}
                          className="text-xs font-bold uppercase px-2 py-1 clay-input text-slate-700 focus:outline-none w-28 sm:w-auto truncate disabled:opacity-50"
                        >
                          <option value="NEW">New</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="SITE_VISIT">Site Visit</option>
                          <option value="FOLLOW_UP">Follow Up</option>
                          <option value="PROPOSAL_SENT">Proposal Sent</option>
                          <option value="NEGOTIATION">Negotiation</option>
                          <option value="WON">Won</option>
                          <option value="LOST">Lost</option>
                        </select>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 font-heading truncate cursor-pointer hover:text-[#7C6EF0]" onClick={() => setViewingLead(lead)}>{lead.name}</h3>
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
                    <p className="text-xs text-slate-600">
                      Paid: <span className="font-bold text-emerald-600">{formatCurrency(totalPaid)}</span> - Due: <span className="font-bold text-rose-500">{formatCurrency(pendingAmount)}</span>
                    </p>
                    {lead.client?.projects?.length > 0 && (
                      <div className="text-xs font-semibold text-[#7C6EF0]">Existing Projects: {lead.client.projects.length}</div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-violet-100/30 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Budget:</span>
                    <span className="font-heading font-extrabold text-slate-900">{formatCurrency(Number(lead.budget || 0))}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto clay-card">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-violet-100/30">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Lead Details</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Project / Plot Details</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Budget & Req</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Payment Info</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30">
                {filteredLeads.map((lead: any) => {
                  const totalPaid = lead.incomes?.reduce((acc: number, inc: any) => acc + (Number(inc.totalAmount) || Number(inc.amount) || 0), 0) || 0;
                  const pendingAmount = Number(lead.pendingAmount ?? Math.max(0, Number(lead.budget || 0) - totalPaid));
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 cursor-pointer hover:text-[#7C6EF0]" onClick={() => setViewingLead(lead)}>{lead.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-clay-violet text-[#7C6EF0]">{lead.source}</span>
                          {lead.client?.projects?.length > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" title="Existing Projects">{lead.client.projects.length} Proj</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-slate-600 space-y-1">
                          <div className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5 text-slate-400" /> {lead.phone}</div>
                          {lead.email && <div className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5 text-slate-400" /> {lead.email}</div>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-slate-600 space-y-1">
                          {lead.captureDate && <div className="flex items-center gap-2 text-xs"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(lead.captureDate).toLocaleDateString()}</div>}
                          {(lead.plotArea || lead.plotAddress) && <div className="flex items-start gap-2 text-xs"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" /> <span className="line-clamp-2">{lead.plotArea ? `${lead.plotArea} sq ft, ` : ''}{lead.plotAddress}</span></div>}
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="font-bold text-slate-900">{formatCurrency(Number(lead.budget || 0))}</div>
                        <div className="text-xs text-slate-500 truncate mt-1" title={lead.requirement || lead.requiredService}>{lead.requirement || lead.requiredService || 'Construction'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs space-y-1">
                          <div>Status: <span className="font-semibold text-slate-700">{lead.paymentStatus || 'N/A'}</span></div>
                          <div className="text-emerald-600 font-bold">Paid: {formatCurrency(totalPaid)}</div>
                          <div className="text-rose-500 font-bold">Due: {formatCurrency(pendingAmount)}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={lead.status}
                          disabled={lead.status === 'WON' && (user?.(role !== 'ADMIN' && role !== 'SUPER_ADMIN') && user?.role !== 'SUPER_ADMIN')}
                          onChange={(e) => updateStatusMutation.mutate({ id: lead.id, status: e.target.value })}
                          className="text-xs font-bold uppercase px-2 py-1 clay-input text-slate-700 focus:outline-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="NEW">New</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="SITE_VISIT">Site Visit</option>
                          <option value="FOLLOW_UP">Follow Up</option>
                          <option value="PROPOSAL_SENT">Proposal Sent</option>
                          <option value="NEGOTIATION">Negotiation</option>
                          <option value="WON">Won</option>
                          <option value="LOST">Lost</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setViewingLead(lead)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer" title="View Lead Details & Payments"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => setEditingLead(lead)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer" title="Edit Lead Details"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={async () => { if (await confirmDialog({ title: 'Confirm Action', message: `Delete lead ${lead.name}?` })) deleteMutation.mutate(lead.id); }} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete Lead Inquiry"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              {isDuplicate && (
                <div className="bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-200 text-xs font-semibold flex items-start gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span>A lead with this name or phone number already exists in your records. Please verify before creating.</span>
                </div>
              )}
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
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Detailed Requirement (Select or add custom)</label>
                <CategorySelect
                  module="lead_requirement"
                  value={newLead.requirement}
                  onChange={(val) => setNewLead({ ...newLead, requirement: val })}
                  defaultOptions={['Full Residential G+10 Construction', 'Commercial Complex', 'Interior Designing', 'Renovation', 'Custom Category']}
                  placeholder="Select or add custom requirement..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Capture Date</label>
                  <input
                    type="date"
                    value={newLead.captureDate ? newLead.captureDate.split('T')[0] : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewLead({ ...newLead, captureDate: val ? new Date(val).toISOString() : '' });
                    }}
                    className="w-full clay-input text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Plot Area (sq ft)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1500"
                    value={newLead.plotArea}
                    onChange={(e) => setNewLead({ ...newLead, plotArea: e.target.value })}
                    className="w-full clay-input text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Plot Address / Location"
                  value={newLead.plotAddress}
                  onChange={(e) => setNewLead({ ...newLead, plotAddress: e.target.value })}
                  className="w-full clay-input text-sm"
                />
                <input
                  type="text"
                  placeholder="Client Address (Home/Office)"
                  value={newLead.address || ''}
                  onChange={(e) => setNewLead({ ...newLead, address: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select
                  required
                  value={newLead.city}
                  onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                  className="w-full clay-input text-sm"
                >
                  <option value="">Select City *</option>
                  {MAHARASHTRA_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="State"
                  value={newLead.state || ''}
                  onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>
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
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Detailed Requirement (Select or add custom)</label>
                <CategorySelect
                  module="lead_requirement"
                  value={editingLead.requirement || ''}
                  onChange={(val) => setEditingLead({ ...editingLead, requirement: val })}
                  defaultOptions={['Full Residential G+10 Construction', 'Commercial Complex', 'Interior Designing', 'Renovation', 'Custom Category']}
                  placeholder="Select or add custom requirement..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Capture Date</label>
                  <input
                    type="date"
                    value={editingLead.captureDate ? editingLead.captureDate.split('T')[0] : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingLead({ ...editingLead, captureDate: val ? new Date(val).toISOString() : '' });
                    }}
                    className="w-full clay-input text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Plot Area (sq ft)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1500"
                    value={editingLead.plotArea || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, plotArea: e.target.value })}
                    className="w-full clay-input text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Plot Address / Location"
                  value={editingLead.plotAddress || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, plotAddress: e.target.value })}
                  className="w-full clay-input text-sm"
                />
                <input
                  type="text"
                  placeholder="Client Address (Home/Office)"
                  value={editingLead.address || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, address: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select
                  required
                  value={editingLead.city || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                  className="w-full clay-input text-sm"
                >
                  <option value="">Select City *</option>
                  {MAHARASHTRA_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="State"
                  value={editingLead.state || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, state: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingLead(null)} className="px-4 py-2 rounded-xl border border-violet-100/40 hover:bg-violet-50 text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-5 py-2 clay-btn text-white text-sm font-semibold">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Details & Inflow Payment Breakdown Modal */}
      {viewingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <div>
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-violet-100 text-[#7C6EF0]">
                  {viewingLead.source || 'LEAD'}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 font-heading mt-1">{viewingLead.name}</h2>
              </div>
              <button
                onClick={() => setViewingLead(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-2 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-violet-50/70 p-4 rounded-xl border border-violet-100/50">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Budget</span>
                <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                  {formatCurrency(Number(viewingLead.budget || 0))}
                </div>
              </div>
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100/50">
                <span className="text-xs font-semibold text-emerald-700 uppercase">Total Payment Done</span>
                <div className="text-xl font-bold text-emerald-600 font-mono mt-1">
                  {formatCurrency(
                    viewingLead.incomes?.reduce((acc: number, inc: any) => acc + (Number(inc.totalAmount) || Number(inc.amount) || 0), 0) || 0
                  )}
                </div>
              </div>
              <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-100/50">
                <span className="text-xs font-semibold text-rose-700 uppercase">Pending Payment</span>
                <div className="text-xl font-bold text-rose-600 font-mono mt-1">
                  {formatCurrency(
                    Number(viewingLead.pendingAmount ?? Math.max(0, Number(viewingLead.budget || 0) - (viewingLead.incomes?.reduce((acc: number, inc: any) => acc + (Number(inc.totalAmount) || Number(inc.amount) || 0), 0) || 0)))
                  )}
                </div>
              </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-violet-100/30 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Contact Information</span>
                <div className="font-bold text-slate-800 mt-1">{viewingLead.name}</div>
                <div className="text-slate-600 text-xs mt-1">📞 {viewingLead.phone}</div>
                {viewingLead.email && <div className="text-slate-600 text-xs mt-0.5">✉️ {viewingLead.email}</div>}
                <div className="text-slate-600 text-xs mt-0.5">📍 {viewingLead.city || 'N/A'}, {viewingLead.state || 'Maharashtra'}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Project Requirement & Plot</span>
                <div className="text-slate-800 text-xs font-semibold mt-1">{viewingLead.requiredService || viewingLead.requirement || 'Construction'}</div>
                <div className="text-slate-600 text-xs mt-1">Plot Address: {viewingLead.plotAddress || 'N/A'}</div>
                {viewingLead.plotArea && <div className="text-slate-600 text-xs">Plot Area: {viewingLead.plotArea} sq ft</div>}
                <div className="text-slate-500 text-xs mt-1">Status: <span className="font-bold uppercase text-[#7C6EF0]">{viewingLead.status}</span></div>
              </div>
            </div>

            {/* Inflow Payments Recorded */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm uppercase font-heading flex items-center justify-between">
                <span>Inflow Payment History</span>
                <span className="text-xs text-slate-500 lowercase font-normal">({viewingLead.incomes?.length || 0} payments)</span>
              </h4>

              {(!viewingLead.incomes || viewingLead.incomes.length === 0) ? (
                <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-xl text-xs">
                  No inflow payments recorded for this lead inquiry yet.
                </div>
              ) : (
                <div className="divide-y divide-violet-100/30 border border-violet-100/30 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100/80 p-3 grid grid-cols-4 font-bold text-slate-600 uppercase">
                    <div>Date</div>
                    <div>Ref / Invoice</div>
                    <div>Method</div>
                    <div className="text-right">Amount</div>
                  </div>
                  {viewingLead.incomes.map((inc: any) => (
                    <div key={inc.id} className="p-3 grid grid-cols-4 items-center bg-white hover:bg-violet-50/30">
                      <div className="text-slate-600">{formatDate(inc.paymentDate)}</div>
                      <div className="font-mono text-slate-700">{inc.invoiceNo || inc.reference || 'INFLOW'}</div>
                      <div className="font-mono text-[#7C6EF0] font-semibold">{inc.paymentMethod}</div>
                      <div className="text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(Number(inc.totalAmount) || Number(inc.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-violet-100/30">
              <button
                onClick={() => setViewingLead(null)}
                className="clay-btn px-6 py-2 text-white font-bold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
