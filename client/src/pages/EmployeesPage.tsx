import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Mail, Phone, Shield, Building2, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function EmployeesPage() {
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
      setNewEmp({ name: '', email: '', phone: '', role: 'SITE_SUPERVISOR', department: 'Site Operations' });
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
    if (!newEmp.name || !newEmp.email) {
      toast.error('Name and Email are required');
      return;
    }
    createMutation.mutate({
      ...newEmp,
      designation: newEmp.role,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name: editingEmp.name || editingEmp.user?.name,
      email: editingEmp.email || editingEmp.user?.email,
      phone: editingEmp.phone,
      designation: editingEmp.designation || editingEmp.role,
      department: editingEmp.department,
      status: editingEmp.status,
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
    <div className="p-4 md:p-8 lg:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Executive Staff & Department Roles
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage engineers, project managers, finance officers, RBAC privileges, and department allocation.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard Employee</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name, department, or role designation..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {filteredEmp.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-medium">
          No executive employees or site staff registered yet. Click "+ Onboard New Staff" above to add staff profiles and configure ERP role access.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmp.map((emp: any) => {
            const nameStr = emp.user?.name || emp.name || 'Staff Member profile';
            const emailStr = emp.user?.email || emp.email || 'No email provided';
            const phoneStr = emp.user?.phone || emp.phone || 'No contact provided';
            const roleStr = (emp.designation || emp.role || emp.user?.role || 'ENGINEER').replace(/_/g, ' ');
            const deptStr = emp.department || 'Site Operations';
            const statusStr = emp.user?.isActive === false || emp.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
            return (
              <div key={emp.id} onClick={() => setSelectedEmpAttendance(emp)} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded bg-indigo-50 text-indigo-700">
                      {roleStr}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      statusStr === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {statusStr}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 font-heading">{nameStr}</h3>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <span className="truncate">{deptStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <span className="truncate">{emailStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> <span className="truncate">{phoneStr}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" /> ERP Access
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 mr-2">
                      PAYMENTS UP TO DATE
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingEmp(emp); }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Employee Role & Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove staff member ${nameStr} from ERP access records?`)) {
                          deleteMutation.mutate(emp.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Onboard Staff Member</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={newEmp.name}
                onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <input
                type="email"
                required
                placeholder="Work Email Address *"
                value={newEmp.email}
                onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={newEmp.phone}
                onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
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
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                >
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Site Operations">Site Operations</option>
                  <option value="Accounts & Audit">Accounts & Audit</option>
                  <option value="Vendor & Supply Chain">Supply Chain</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Onboard</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Update Employee Profile</h3>
              <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Staff Member Name *"
                value={editingEmp.name || editingEmp.user?.name || ''}
                onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-semibold"
              />
              <input
                type="email"
                required
                placeholder="Official Email *"
                value={editingEmp.email || editingEmp.user?.email || ''}
                onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={editingEmp.phone || ''}
                onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono"
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={editingEmp.designation || editingEmp.role || 'SITE_SUPERVISOR'}
                  onChange={(e) => setEditingEmp({ ...editingEmp, designation: e.target.value, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm font-semibold"
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
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                >
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Site Operations">Site Operations</option>
                  <option value="Accounts & Audit">Accounts & Audit</option>
                  <option value="Vendor & Supply Chain">Supply Chain</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setEditingEmp(null)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {selectedEmpAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">
                Attendance: {selectedEmpAttendance.name || selectedEmpAttendance.user?.name}
              </h3>
              <button onClick={() => setSelectedEmpAttendance(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Select Month</span>
              <input 
                type="month"
                value={attendanceMonth}
                onChange={(e) => setAttendanceMonth(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500"
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
                    
                    let bgClass = 'bg-slate-50 border-slate-100 text-slate-600';
                    if (record) {
                      switch (record.status) {
                        case 'PRESENT': bgClass = 'bg-emerald-100 border-emerald-200 text-emerald-700'; break;
                        case 'ABSENT': bgClass = 'bg-rose-100 border-rose-200 text-rose-700'; break;
                        case 'HALF_DAY': bgClass = 'bg-amber-100 border-amber-200 text-amber-700'; break;
                        case 'LEAVE': bgClass = 'bg-blue-100 border-blue-200 text-blue-700'; break;
                      }
                    }

                    return (
                      <div key={date} className={`aspect-square rounded-lg border flex items-center justify-center text-xs font-bold ${bgClass}`}>
                        {date}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t flex justify-end">
              <button 
                onClick={() => navigate(`/employees/${selectedEmpAttendance.id}`)}
                className="text-indigo-600 text-sm font-semibold hover:underline"
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
