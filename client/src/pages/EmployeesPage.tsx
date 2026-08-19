import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Mail, Phone, Shield, Building2, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useConfirm } from "@/components/ui/ConfirmProvider";

export default function EmployeesPage() {
    const confirmDialog = useConfirm();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [selectedEmpAttendance, setSelectedEmpAttendance] = useState<any>(null);
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const queryClient = useQueryClient();

  const { data: employeesData = [], isLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await api.get('/employees');
      return data.data?.data || data.data || [];
    },
  });

  const { data: attendanceData = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['employee-attendance', selectedEmpAttendance?.id, attendanceMonth],
    queryFn: async () => {
      if (!selectedEmpAttendance) return [];
      const { data } = await api.get(`/employees/${selectedEmpAttendance.id}/attendance?month=${attendanceMonth}`);
      return data.data || [];
    },
    enabled: !!selectedEmpAttendance
  });

  const [newEmp, setNewEmp] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'SITE_SUPERVISOR',
    department: 'Site Operations',
    salary: '',
    dailyRate: ''
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/employees', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Executive employee onboarded with ERP role access.');
      setIsAddOpen(false);
      setNewEmp({ name: '', email: '', phone: '', role: 'SITE_SUPERVISOR', department: 'Site Operations', salary: '', dailyRate: '' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to onboard staff member');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/employees/${editingEmp.id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Employee details updated successfully.');
      setEditingEmp(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update employee details');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/employees/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Staff member removed from ERP records.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to remove staff member');
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name) {
      toast.error('Name is required');
      return;
    }
    const empEmail = newEmp.email.trim() || `staff_${Date.now()}@vastu.local`;
    createMutation.mutate({
      ...newEmp,
      email: empEmail,
      designation: newEmp.role,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name: editingEmp.name || editingEmp.user?.name,
      email: editingEmp.email || editingEmp.user?.email,
      phone: editingEmp.phone ?? editingEmp.user?.phone,
      designation: editingEmp.designation || editingEmp.role,
      department: editingEmp.department,
      salary: editingEmp.salary ? Number(editingEmp.salary) : undefined,
      dailyRate: editingEmp.dailyRate ? Number(editingEmp.dailyRate) : undefined,
      status: editingEmp.status || (editingEmp.user?.isActive === false ? 'INACTIVE' : 'ACTIVE'),
    });
  };

  const filteredEmp = employeesData.filter((e: any) => {
    const nameStr = e.user?.name || e.name || '';
    const deptStr = e.department || '';
    const roleStr = e.designation || e.role || e.user?.role || '';
    return (
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deptStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roleStr.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Executive Staff & Department Roles
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage engineers, project managers, finance officers, RBAC privileges, and department allocation.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard Employee</span>
        </button>
      </div>

      <div className="clay-card p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name, department, or role designation..."
            className="clay-input w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      {filteredEmp.length === 0 ? (
        <div className="clay-card p-12 text-center text-slate-400 font-medium">
          No executive employees or site staff registered yet. Click "+ Onboard New Staff" above to add staff profiles and configure ERP role access.
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredEmp.map((emp: any) => {
              const nameStr = emp.user?.name || emp.name || 'Staff Member profile';
              const emailStr = emp.user?.email || emp.email || 'No email provided';
              const phoneStr = emp.user?.phone || emp.phone || 'No contact provided';
              const roleStr = (emp.designation || emp.role || emp.user?.role || 'ENGINEER').replace(/_/g, ' ');
              const deptStr = emp.department || 'Site Operations';
              const statusStr = emp.user?.isActive === false || emp.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
              
              // Get initials
              const initials = nameStr.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'E';

              return (
                <div key={emp.id} onClick={() => setSelectedEmpAttendance(emp)} className="p-6 clay-card-sm space-y-4 flex flex-col justify-between hover:border-[#7C6EF0]/30 transition-all cursor-pointer group">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-clay-violet text-[#7C6EF0]">
                        {roleStr}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        statusStr === 'ACTIVE' ? 'bg-clay-green text-[#5CB77E]' : 'bg-white/50 text-slate-400'
                      }`}>
                        {statusStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-[#7C6EF0] to-[#A78BFA] shadow-md shadow-[#7C6EF0]/30">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 font-heading">{nameStr}</h3>
                        <div className="flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-xs text-slate-500">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{deptStr}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <span className="truncate">{emailStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <span className="truncate">{phoneStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-violet-100/30 flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#7C6EF0]" /> ERP Access
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-clay-green text-[#5CB77E] mr-2">
                        PAYMENTS UP TO DATE
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingEmp(emp); }}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors cursor-pointer"
                        title="Edit Employee Role & Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (await confirmDialog({ title: 'Confirm Action', message: `Remove staff member ${nameStr} from ERP access records?` })) {
                            deleteMutation.mutate(emp.id);
                          }
                        }}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#E5636C] hover:bg-[#E5636C]/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Employee Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Employee</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Role & Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30">
                {filteredEmp.map((emp: any) => {
                  const nameStr = emp.user?.name || emp.name || 'Staff Member profile';
                  const emailStr = emp.user?.email || emp.email || 'No email provided';
                  const phoneStr = emp.user?.phone || emp.phone || 'No contact provided';
                  const roleStr = (emp.designation || emp.role || emp.user?.role || 'ENGINEER').replace(/_/g, ' ');
                  const deptStr = emp.department || 'Site Operations';
                  const statusStr = emp.user?.isActive === false || emp.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
                  const initials = nameStr.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'E';

                  return (
                    <tr key={emp.id} onClick={() => setSelectedEmpAttendance(emp)} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-[#7C6EF0] to-[#A78BFA] shadow-md text-sm">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{nameStr}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {deptStr}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-slate-600 flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5" /> {emailStr}</div>
                          <div className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5" /> {phoneStr}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2 items-start">
                          <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-clay-violet text-[#7C6EF0]">{roleStr}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusStr === 'ACTIVE' ? 'bg-clay-green text-[#5CB77E]' : 'bg-slate-100 text-slate-400'}`}>{statusStr}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingEmp(emp); }}
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors"
                            title="Edit Employee"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (await confirmDialog({ title: 'Confirm Action', message: `Remove staff member ${nameStr}?` })) {
                                deleteMutation.mutate(emp.id);
                              }
                            }}
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#E5636C] hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Onboard Staff Member</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={newEmp.name}
                onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="Work Email Address (Optional)"
                value={newEmp.email}
                onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={newEmp.phone}
                onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm font-mono"
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm"
                >
                  <option value="CHIEF_ENGINEER">Chief Engineer</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="SITE_SUPERVISOR">Site Supervisor</option>
                  <option value="FINANCE_MANAGER">Finance Manager</option>
                  <option value="PROCUREMENT_LEAD">Procurement Lead</option>
                </select>
                <select
                  value={newEmp.department}
                  onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm"
                >
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Site Operations">Site Operations</option>
                  <option value="Accounts & Audit">Accounts & Audit</option>
                  <option value="Vendor & Supply Chain">Supply Chain</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Monthly Salary (₹)"
                  value={newEmp.salary}
                  onChange={(e) => setNewEmp({ ...newEmp, salary: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold"
                />
                <input
                  type="number"
                  placeholder="Override Daily Rate (₹)"
                  value={newEmp.dailyRate}
                  onChange={(e) => setNewEmp({ ...newEmp, dailyRate: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold"
                  title="If set, this bypasses the Monthly Salary calculation for daily pay."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-white/40">Cancel</button>
                <button type="submit" className="clay-btn px-5 py-2 text-white text-sm font-semibold">Onboard</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Update Employee Profile</h3>
              <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Staff Member Name *"
                value={editingEmp.name || editingEmp.user?.name || ''}
                onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm font-semibold"
              />
              <input
                type="email"
                required
                placeholder="Official Email *"
                value={editingEmp.email || editingEmp.user?.email || ''}
                onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={editingEmp.phone || ''}
                onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                className="clay-input w-full px-3 py-2 text-sm font-mono"
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={editingEmp.designation || editingEmp.role || 'SITE_SUPERVISOR'}
                  onChange={(e) => setEditingEmp({ ...editingEmp, designation: e.target.value, role: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold"
                >
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="SITE_ENGINEER">Site Engineer</option>
                  <option value="SITE_SUPERVISOR">Site Supervisor</option>
                  <option value="ARCHITECT">Architect</option>
                  <option value="ACCOUNTANT">Accountant</option>
                </select>
                <select
                  value={editingEmp.department || 'Site Operations'}
                  onChange={(e) => setEditingEmp({ ...editingEmp, department: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm"
                >
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Site Operations">Site Operations</option>
                  <option value="Accounts & Audit">Accounts & Audit</option>
                  <option value="Vendor & Supply Chain">Supply Chain</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Monthly Salary (₹)"
                  value={editingEmp.salary || ''}
                  onChange={(e) => setEditingEmp({ ...editingEmp, salary: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold"
                />
                <input
                  type="number"
                  placeholder="Override Daily Rate (₹)"
                  value={editingEmp.dailyRate || ''}
                  onChange={(e) => setEditingEmp({ ...editingEmp, dailyRate: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold"
                  title="If set, this bypasses the Monthly Salary calculation for daily pay."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingEmp(null)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-white/40">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {selectedEmpAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">
                Attendance: {selectedEmpAttendance.name || selectedEmpAttendance.user?.name}
              </h3>
              <button onClick={() => setSelectedEmpAttendance(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            
            <div className="flex justify-between items-center bg-white/40 p-4 rounded-xl border border-violet-100/30">
              <span className="text-sm font-semibold text-slate-700">Select Month</span>
              <input 
                type="month"
                value={attendanceMonth}
                onChange={(e) => setAttendanceMonth(e.target.value)}
                className="clay-input px-3 py-1.5 text-sm"
              />
            </div>

            <div className="space-y-2">
              {isLoadingAttendance ? (
                <div className="text-center py-6 text-slate-400 text-sm">Loading attendance data...</div>
              ) : attendanceData.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">No attendance records found for this month.</div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">{day}</div>
                  ))}
                  {Array.from({ length: new Date(new Date(attendanceMonth).getFullYear(), new Date(attendanceMonth).getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const date = i + 1;
                    const dateStr = `${attendanceMonth}-${String(date).padStart(2, '0')}`;
                    const record = attendanceData.find((a: any) => a.date.startsWith(dateStr));
                    
                    let bgClass = 'bg-white/50 border-violet-100/30 text-slate-600';
                    if (record) {
                      switch (record.status) {
                        case 'PRESENT': bgClass = 'bg-clay-green text-[#5CB77E]'; break;
                        case 'ABSENT': bgClass = 'bg-clay-rose text-[#E5636C]'; break;
                        case 'HALF_DAY': bgClass = 'bg-clay-amber text-[#F2A65A]'; break;
                        case 'LEAVE': bgClass = 'bg-clay-blue text-[#4EA8DE]'; break;
                      }
                    }

                    return (
                      <div key={date} className={`aspect-square rounded-lg border-none flex items-center justify-center text-xs font-bold ${bgClass} shadow-sm`}>
                        {date}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-violet-100/30 flex justify-end">
              <button 
                onClick={() => navigate(`/employees/${selectedEmpAttendance.id}`)}
                className="text-[#7C6EF0] text-sm font-semibold hover:underline"
              >
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
