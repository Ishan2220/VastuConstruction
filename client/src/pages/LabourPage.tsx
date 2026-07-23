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

export default function LabourPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ATTENDANCE' | 'PAYMENTS'>('DIRECTORY');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAttendOpen, setIsAttendOpen] = useState(false);
  useQuickAddListener('labour', () => setIsAttendOpen(true));
  const [editingLabour, setEditingLabour] = useState<any>(null);

  // New labour state
  const [newLabour, setNewLabour] = useState({
    name: '',
    phone: '',
    skill: 'MASON',
    dailyWage: '',
    idProofType: 'AADHAAR',
    idProofNo: '',
  });

  // Attendance state
  const [attendData, setAttendData] = useState({
    labourId: '',
    date: new Date().toISOString().split('T')[0],
    present: true,
    halfDay: false,
    overtime: 0,
    notes: '',
  });

  const { data: laboursList = [], isLoading } = useQuery({
    queryKey: ['labours-list'],
    queryFn: async () => {
      const { data } = await api.get('/labour');
      return data.data?.data || [];
    },
  });

  const { data: attendanceList = [] } = useQuery({
    queryKey: ['attendance-list', attendData.date],
    queryFn: async () => {
      const { data } = await api.get(`/labour/attendance?date=${attendData.date}`);
      return data.data || [];
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
      setNewLabour({ name: '', phone: '', skill: 'MASON', dailyWage: '', idProofType: 'AADHAAR', idProofNo: '' });
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
      dailyWage: Number(editingLabour.dailyWage),
      idProofType: editingLabour.idProofType,
      idProofNo: editingLabour.idProofNo,
    });
  };

  const recordAttendanceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/labour/attendance', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Attendance recorded');
      setIsAttendOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record attendance');
    },
  });

  const handleCreateLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabour.name || !newLabour.dailyWage) {
      toast.error('Please provide worker name and daily wage rate');
      return;
    }
    createLabourMutation.mutate({
      ...newLabour,
      dailyWage: Number(newLabour.dailyWage) || 600,
    });
  };

  const handleRecordAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendData.labourId) {
      toast.error('Please select a site worker');
      return;
    }
    recordAttendanceMutation.mutate({
      ...attendData,
      overtime: Number(attendData.overtime) || 0,
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
            onClick={() => setIsAttendOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 border border-violet-100/30 text-[#7C6EF0] hover:bg-violet-50 text-sm font-bold shadow-sm transition-all"
          >
            <UserCheck className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Worker</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-violet-100/30 pb-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'DIRECTORY', label: 'Worker Registry ({count})'.replace('{count}', String(laboursList.length)) },
          { id: 'ATTENDANCE', label: 'Daily Muster Roll' },
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

      {/* Search Bar */}
      {activeTab === 'DIRECTORY' && (
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
      )}

      {/* Directory Grid */}
      {activeTab === 'DIRECTORY' && (
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
                    <span className="text-xs text-slate-400 font-mono">{labour.idProofNo || 'Verified'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingLabour(labour)}
                      className="p-1.5 text-slate-400 hover:text-[#7C6EF0] hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Worker Profile"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete worker ${labour.name}?`)) {
                          deleteLabourMutation.mutate(labour.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                <button
                  onClick={() => {
                    setAttendData({ ...attendData, labourId: labour.id });
                    setIsAttendOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/60 border border-violet-100/30 hover:bg-violet-50 text-[#7C6EF0] text-xs font-bold transition-all shadow-sm"
                >
                  Mark Present
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'ATTENDANCE' && (
        <div className="clay-card overflow-hidden p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 font-heading">Daily Attendance Log</h3>
              <p className="text-xs text-slate-500">Muster roll records for selected date</p>
            </div>
            <input
              type="date"
              value={attendData.date}
              onChange={(e) => setAttendData({ ...attendData, date: e.target.value })}
              className="clay-input px-3 py-1.5 text-sm font-semibold"
            />
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse hidden md:table min-w-max">
              <thead>
                <tr className="border-b border-violet-100/30 text-xs font-bold uppercase text-slate-400">
                  <th className="p-4">Worker Name</th>
                  <th className="p-4">Skill / Trade</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Overtime (Hrs)</th>
                  <th className="p-4">Daily Wage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30 text-sm">
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No attendance marked for {attendData.date}. Click Mark Attendance to record muster roll.
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((a: any) => (
                    <tr key={a.id} className="hover:bg-violet-50/30 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{a.labour?.name || 'Worker'}</td>
                      <td className="p-4 font-semibold text-slate-600">{a.labour?.skill || 'HELPER'}</td>
                      <td className="p-4">
                        {a.present ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-[#5CB77E] border border-emerald-200/50 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> {a.halfDay ? 'Half Day' : 'Present'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-[#E5636C] border border-rose-200/50 shadow-sm">
                            <XCircle className="w-3 h-3" /> Absent
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono">{a.overtime || 0} hrs</td>
                      <td className="p-4 font-mono font-bold">₹{a.labour?.dailyWage || 600}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {attendanceList.length === 0 ? (
              <div className="text-center text-slate-400 p-6">
                No attendance marked for {attendData.date}.
              </div>
            ) : (
              attendanceList.map((a: any) => (
                <div key={a.id} className="clay-card-sm p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800">{a.labour?.name || 'Worker'}</div>
                      <div className="text-xs text-slate-500">{a.labour?.skill || 'HELPER'}</div>
                    </div>
                    {a.present ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-[#5CB77E] border border-emerald-200/50">
                        <CheckCircle2 className="w-3 h-3" /> {a.halfDay ? 'Half Day' : 'Present'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-[#E5636C] border border-rose-200/50">
                        <XCircle className="w-3 h-3" /> Absent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-violet-100/30">
                    <span>OT: <strong className="font-mono text-slate-700">{a.overtime || 0} hrs</strong></span>
                    <span className="font-mono font-bold text-slate-800">₹{a.labour?.dailyWage || 600}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Daily Wage (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 950"
                    value={newLabour.dailyWage}
                    onChange={(e) => setNewLabour({ ...newLabour, dailyWage: e.target.value })}
                    className="clay-input w-full text-sm font-mono"
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

      {/* Record Attendance Modal */}
      {isAttendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Mark Muster Attendance</h3>
              <button onClick={() => setIsAttendOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">
                Close ✕
              </button>
            </div>

            <form onSubmit={handleRecordAttendance} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Select Site Worker *</label>
                <select
                  required
                  value={attendData.labourId}
                  onChange={(e) => setAttendData({ ...attendData, labourId: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="">Choose Worker</option>
                  {laboursList.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.skill} - ₹{l.dailyWage})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={attendData.date}
                    onChange={(e) => setAttendData({ ...attendData, date: e.target.value })}
                    className="clay-input w-full text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Overtime Hours</label>
                  <input
                    type="number"
                    value={attendData.overtime}
                    onChange={(e) => setAttendData({ ...attendData, overtime: Number(e.target.value) })}
                    className="clay-input w-full text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-violet-100/30 shadow-[inset_0_0_10px_rgba(124,110,240,0.02)]">
                <span className="text-xs font-semibold text-slate-700">Present Full Day</span>
                <input
                  type="checkbox"
                  checked={attendData.present}
                  onChange={(e) => setAttendData({ ...attendData, present: e.target.checked })}
                  className="w-4 h-4 rounded text-[#7C6EF0] focus:ring-[#7C6EF0]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button
                  type="button"
                  onClick={() => setIsAttendOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-violet-50 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordAttendanceMutation.isPending}
                  className="clay-btn px-5 py-2 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {recordAttendanceMutation.isPending ? 'Saving...' : 'Record Attendance'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="number"
                  required
                  placeholder="Daily Wage (₹) *"
                  value={editingLabour.dailyWage || ''}
                  onChange={(e) => setEditingLabour({ ...editingLabour, dailyWage: e.target.value })}
                  className="clay-input w-full text-sm font-mono font-bold text-[#5CB77E]"
                />
                <select
                  value={editingLabour.idProofType || 'AADHAAR'}
                  onChange={(e) => setEditingLabour({ ...editingLabour, idProofType: e.target.value })}
                  className="clay-input w-full text-sm"
                >
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="VOTER_ID">Voter ID</option>
                  <option value="PAN">PAN Card</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="ID Proof Number *"
                value={editingLabour.idProofNo || ''}
                onChange={(e) => setEditingLabour({ ...editingLabour, idProofNo: e.target.value.toUpperCase() })}
                className="clay-input w-full text-sm font-mono uppercase"
              />
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
