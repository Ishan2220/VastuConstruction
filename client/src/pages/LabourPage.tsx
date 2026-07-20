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
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Site Force & Labour Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain worker registry, track muster roll attendance, and manage daily wage payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAttendOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-all"
          >
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Mark Attendance</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Worker</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'DIRECTORY', label: 'Worker Registry ({count})'.replace('{count}', String(laboursList.length)) },
          { id: 'ATTENDANCE', label: 'Daily Muster Roll' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {activeTab === 'DIRECTORY' && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by worker name, skill, or phone..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
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
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {labour.skill || 'HELPER'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{labour.idProofNo || 'Verified'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingLabour(labour)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
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
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Worker Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-heading">{labour.name}</h3>
                <div className="text-xs text-slate-500">{labour.phone || '+91 98000 00000'}</div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Daily Wage</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono">₹{labour.dailyWage}/day</div>
                </div>
                <button
                  onClick={() => {
                    setAttendData({ ...attendData, labourId: labour.id });
                    setIsAttendOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Daily Attendance Log</h3>
              <p className="text-xs text-slate-500">Muster roll records for selected date</p>
            </div>
            <input
              type="date"
              value={attendData.date}
              onChange={(e) => setAttendData({ ...attendData, date: e.target.value })}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <th className="p-4">Worker Name</th>
                  <th className="p-4">Skill / Trade</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Overtime (Hrs)</th>
                  <th className="p-4">Daily Wage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No attendance marked for {attendData.date}. Click Mark Attendance to record muster roll.
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{a.labour?.name || 'Worker'}</td>
                      <td className="p-4 font-semibold text-slate-600">{a.labour?.skill || 'HELPER'}</td>
                      <td className="p-4">
                        {a.present ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> {a.halfDay ? 'Half Day' : 'Present'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
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
        </div>
      )}

      {/* Register Worker Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Register New Site Worker</h3>
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLabourMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Mark Muster Attendance</h3>
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose Worker</option>
                  {laboursList.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.skill} - ₹{l.dailyWage})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={attendData.date}
                    onChange={(e) => setAttendData({ ...attendData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Overtime Hours</label>
                  <input
                    type="number"
                    value={attendData.overtime}
                    onChange={(e) => setAttendData({ ...attendData, overtime: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Present Full Day</span>
                <input
                  type="checkbox"
                  checked={attendData.present}
                  onChange={(e) => setAttendData({ ...attendData, present: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAttendOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordAttendanceMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Update Worker Profile</h3>
              <button onClick={() => setEditingLabour(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdateLabour} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Worker Full Name *"
                value={editingLabour.name || ''}
                onChange={(e) => setEditingLabour({ ...editingLabour, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-semibold"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="tel"
                  required
                  placeholder="Primary Phone *"
                  value={editingLabour.phone || ''}
                  onChange={(e) => setEditingLabour({ ...editingLabour, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
                />
                <CategorySelect
                  module="labour"
                  value={editingLabour.skill || 'MASON'}
                  onChange={(val) => setEditingLabour({ ...editingLabour, skill: val })}
                  defaultOptions={['MASON', 'CARPENTER', 'ELECTRICIAN', 'PLUMBER', 'WELDER', 'HELPER']}
                  placeholder="Select Trade/Skill..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  required
                  placeholder="Daily Wage (₹) *"
                  value={editingLabour.dailyWage || ''}
                  onChange={(e) => setEditingLabour({ ...editingLabour, dailyWage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono font-bold text-emerald-600"
                />
                <select
                  value={editingLabour.idProofType || 'AADHAAR'}
                  onChange={(e) => setEditingLabour({ ...editingLabour, idProofType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
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
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono uppercase"
              />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setEditingLabour(null)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={updateLabourMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
