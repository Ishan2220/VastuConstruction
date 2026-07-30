import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  HardHat,
  Plus,
  Search,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Clock,
  UserCheck,
  Building2,
  FileText,
  Edit3,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';
import { useConfirm } from "@/components/ui/ConfirmProvider";

export default function LabourPage() {
    const confirmDialog = useConfirm();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ATTENDANCE' | 'PAYMENTS'>('DIRECTORY');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLabour, setEditingLabour] = useState<any>(null);

  // New labour state
  const [newLabour, setNewLabour] = useState({
    name: '',
    phone: '',
    skill: 'MASON',
  });

  const { data: laboursList = [], isLoading } = useQuery({
    queryKey: ['labours-list'],
    queryFn: async () => {
      const { data } = await api.get('/labour');
      return data.data?.data || [];
    },
  });

  const createLabourMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/labour', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labours-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Site worker registered successfully');
      setIsCreateOpen(false);
      setNewLabour({ name: '', phone: '', skill: 'MASON' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to register worker');
    },
  });

  const updateLabourMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/labour/${editingLabour.id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labours-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Worker profile updated successfully');
      setEditingLabour(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update worker profile');
    },
  });

  const deleteLabourMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/labour/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labours-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Site worker record deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete worker record');
    },
  });

  const handleUpdateLabour = (e: React.FormEvent) => {
    e.preventDefault();
    updateLabourMutation.mutate({
      name: editingLabour.name,
      phone: editingLabour.phone,
      skill: editingLabour.skill,
    });
  };



  const handleCreateLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabour.name) {
      toast.error('Please provide worker name');
      return;
    }
    createLabourMutation.mutate({
      ...newLabour,
    });
  };



  const filteredLabours = laboursList.filter((l: any) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.skill?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone?.includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Site Force & Labour Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Maintain worker registry, track muster roll attendance, and manage daily wage payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Worker</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center clay-card !p-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by worker name, skill, or phone..."
            className="clay-input w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLabours.map((labour: any) => (
          <motion.div
            key={labour.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="clay-card p-6 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50/80 text-[#F2A65A] border border-amber-200/50 shadow-sm">
                    {labour.skill || 'HELPER'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Verified</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingLabour(labour)}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Worker Profile"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to delete worker ${labour.name}?` })) {
                        deleteLabourMutation.mutate(labour.id);
                      }
                    }}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Worker Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 font-heading">{labour.name}</h3>
              <div className="text-xs text-slate-600">{labour.phone || '+91 98000 00000'}</div>
            </div>

            <div className="pt-3 border-t border-violet-100/30 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Daily Wage</div>
                <div className="text-base font-extrabold text-slate-800 font-mono">₹{labour.dailyWage}/day</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>



      {/* Register Worker Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Register New Site Worker</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">
                Close ✕
              </button>
            </div>

            <form onSubmit={handleCreateLabour} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramdas Shinde"
                  value={newLabour.name}
                  onChange={(e) => setNewLabour({ ...newLabour, name: e.target.value })}
                  className="clay-input w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Trade / Skill *</label>
                  <CategorySelect
                    module="labour"
                    value={newLabour.skill}
                    onChange={(val) => setNewLabour({ ...newLabour, skill: val })}
                    defaultOptions={['MASON', 'CARPENTER', 'ELECTRICIAN', 'PLUMBER', 'WELDER', 'HELPER']}
                    placeholder="Select Trade/Skill..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 88990 11223"
                  value={newLabour.phone}
                  onChange={(e) => setNewLabour({ ...newLabour, phone: e.target.value })}
                  className="clay-input w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-violet-50 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLabourMutation.isPending}
                  className="clay-btn px-5 py-2 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {createLabourMutation.isPending ? 'Registering...' : 'Register Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Edit Modal */}
      {editingLabour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Update Worker Profile</h3>
              <button onClick={() => setEditingLabour(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdateLabour} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Worker Full Name *"
                value={editingLabour.name || ''}
                onChange={(e) => setEditingLabour({ ...editingLabour, name: e.target.value })}
                className="clay-input w-full text-sm font-semibold"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="tel"
                  required
                  placeholder="Primary Phone *"
                  value={editingLabour.phone || ''}
                  onChange={(e) => setEditingLabour({ ...editingLabour, phone: e.target.value })}
                  className="clay-input w-full text-sm font-mono"
                />
                <CategorySelect
                  module="labour"
                  value={editingLabour.skill || 'MASON'}
                  onChange={(val) => setEditingLabour({ ...editingLabour, skill: val })}
                  defaultOptions={['MASON', 'CARPENTER', 'ELECTRICIAN', 'PLUMBER', 'WELDER', 'HELPER']}
                  placeholder="Select Trade/Skill..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingLabour(null)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={updateLabourMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
