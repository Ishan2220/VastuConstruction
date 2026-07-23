import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog, Search, IndianRupee, Wallet, CalendarCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { format, startOfDay } from 'date-fns';

export default function SalaryPaymentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'salaries' | 'attendance'>('salaries');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPayment, setNewPayment] = useState({
    employeeId: '',
    amount: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMonth: new Date().getMonth() + 1,
    paymentYear: new Date().getFullYear(),
    paymentMethod: 'BANK_TRANSFER',
    status: 'PAID',
    reference: '',
    notes: ''
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await api.get('/employees');
      return data.data?.data || data.data || [];
    }
  });

  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ['salary-list'],
    queryFn: async () => {
      const { data } = await api.get('/employees/salaries/all');
      return data.data || [];
    }
  });

  const payMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/employees/salaries/pay', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-list'] });
      toast.success('Salary payment recorded successfully');
      setIsPayOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record salary');
    }
  });

  const { data: attendanceData = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['attendance-list', attendanceDate],
    queryFn: async () => {
      const { data } = await api.get(`/attendance?date=${attendanceDate}`);
      return data.data || [];
    }
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (payload: { employeeId: string, date: string, status: string }) => {
      const { data } = await api.post('/attendance/mark', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-list'] });
      toast.success('Attendance updated');
    },
    onError: () => toast.error('Failed to update attendance')
  });

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.employeeId || !newPayment.amount) {
      toast.error('Employee and amount are required');
      return;
    }
    payMutation.mutate({
      ...newPayment,
      amount: Number(newPayment.amount),
      paymentMonth: Number(newPayment.paymentMonth),
      paymentYear: Number(newPayment.paymentYear),
      paymentDate: new Date(newPayment.paymentDate)
    });
  };

  const handleMarkAttendance = (employeeId: string, status: string) => {
    markAttendanceMutation.mutate({ employeeId, date: attendanceDate, status });
  };

  const filteredSalaries = salaries.filter((s: any) =>
    s.employee?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttendance = attendanceData.filter((a: any) => 
    a.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading flex items-center gap-2">
            <UserCog className="w-8 h-8 text-[#7C6EF0]" /> Employee Salary Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track staff salaries, issue payments, and maintain payroll ledgers.
          </p>
        </div>

        <button
          onClick={() => setIsPayOpen(true)}
          className="clay-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
        >
          <IndianRupee className="w-4 h-4" />
          <span>Record Salary Payment</span>
        </button>
      </div>

      <div className="flex gap-2 border-b border-violet-100/30 pb-2">
        <button 
          onClick={() => setActiveTab('salaries')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'salaries' ? 'bg-[#7C6EF0] text-white shadow-md' : 'text-slate-600 hover:bg-violet-50/50'}`}
        >
          Salary Payments
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-[#7C6EF0] text-white shadow-md' : 'text-slate-600 hover:bg-violet-50/50'}`}
        >
          Daily Attendance
        </button>
      </div>

      <div className="sticky top-16 z-20 bg-white/40 backdrop-blur-xl p-3 md:p-4 rounded-3xl border border-violet-100/30 shadow-sm flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employees..."
            className="clay-input w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        
        {activeTab === 'attendance' && (
          <div className="flex items-center gap-2 bg-white/50 px-4 py-2.5 rounded-2xl border border-violet-100/40 shadow-sm backdrop-blur-md">
            <CalendarCheck className="w-4 h-4 text-[#7C6EF0]" />
            <input 
              type="date" 
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>
        )}
      </div>

      {activeTab === 'salaries' && (
        <>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading payroll data...</div>
          ) : filteredSalaries.length === 0 ? (
            <div className="clay-card p-12 text-center text-slate-400">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              No salary records found.
            </div>
          ) : (
        <div className="clay-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full hidden md:table min-w-max">
              <thead>
                <tr className="border-b border-violet-100/30">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30 bg-transparent">
                {filteredSalaries.map((salary: any) => (
                  <tr key={salary.id} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {format(new Date(salary.paymentDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800">{salary.employee?.user?.name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                      {salary.paymentMonth}/{salary.paymentYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-extrabold text-slate-900 font-mono">
                      {formatCurrency(Number(salary.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium text-slate-500">
                      <span className="bg-white/50 px-2 py-1 rounded-md shadow-sm border border-violet-100/50">{salary.paymentMethod}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        salary.status === 'PAID' ? 'bg-emerald-50 text-[#5CB77E] border border-emerald-200/50' : 'bg-amber-50 text-[#F2A65A] border border-amber-200/50'
                      }`}>
                        {salary.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 p-4 md:hidden">
            {filteredSalaries.map((salary: any) => (
              <div key={salary.id} className="clay-card-sm p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-800">{salary.employee?.user?.name || 'Unknown'}</div>
                    <div className="text-xs text-slate-500 font-mono">{salary.paymentMonth}/{salary.paymentYear}</div>
                  </div>
                  <div className="font-mono font-extrabold text-slate-900 text-lg">
                    {formatCurrency(Number(salary.amount))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-violet-100/30 pt-2">
                  <span className="text-slate-500">{format(new Date(salary.paymentDate), 'dd MMM yyyy')}</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/50 px-2 py-0.5 rounded-md shadow-sm border border-violet-100/50 text-slate-500">{salary.paymentMethod}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      salary.status === 'PAID' ? 'bg-emerald-50 text-[#5CB77E] border border-emerald-200/50' : 'bg-amber-50 text-[#F2A65A] border border-amber-200/50'
                    }`}>
                      {salary.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </>
      )}

      {activeTab === 'attendance' && (
        <div className="clay-card overflow-hidden">
          {isAttendanceLoading ? (
            <div className="p-8 text-center text-slate-500">Loading attendance data...</div>
          ) : (
          <>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full hidden md:table min-w-max">
                <thead>
                  <tr className="border-b border-violet-100/30">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Current Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Mark Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-100/30 bg-transparent">
                  {filteredAttendance.map((emp: any) => (
                    <tr key={emp.employeeId} className="hover:bg-violet-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{emp.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {emp.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                          emp.status === 'PRESENT' ? 'bg-emerald-50 text-[#5CB77E] border-emerald-200/50' :
                          emp.status === 'ABSENT' ? 'bg-rose-50 text-[#E5636C] border-rose-200/50' :
                          emp.status === 'HALF_DAY' ? 'bg-amber-50 text-[#F2A65A] border-amber-200/50' :
                          'bg-white text-slate-500 border-violet-100/50'
                        }`}>
                          {emp.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleMarkAttendance(emp.employeeId, 'PRESENT')}
                          className="p-2 rounded-xl text-[#5CB77E] hover:bg-emerald-50 border border-transparent hover:border-emerald-200/50 transition-all shadow-sm"
                          title="Present"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(emp.employeeId, 'HALF_DAY')}
                          className="p-2 rounded-xl text-[#F2A65A] hover:bg-amber-50 border border-transparent hover:border-amber-200/50 transition-all shadow-sm"
                          title="Half Day"
                        >
                          <Clock className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(emp.employeeId, 'ABSENT')}
                          className="p-2 rounded-xl text-[#E5636C] hover:bg-rose-50 border border-transparent hover:border-rose-200/50 transition-all shadow-sm"
                          title="Absent"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAttendance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No employees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 p-4 md:hidden">
              {filteredAttendance.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No employees found.</div>
              ) : (
                filteredAttendance.map((emp: any) => (
                  <div key={emp.employeeId} className="clay-card-sm p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-800">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.role}</div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                        emp.status === 'PRESENT' ? 'bg-emerald-50 text-[#5CB77E] border-emerald-200/50' :
                        emp.status === 'ABSENT' ? 'bg-rose-50 text-[#E5636C] border-rose-200/50' :
                        emp.status === 'HALF_DAY' ? 'bg-amber-50 text-[#F2A65A] border-amber-200/50' :
                        'bg-white text-slate-500 border-violet-100/50'
                      }`}>
                        {emp.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-violet-100/30">
                      <button
                        onClick={() => handleMarkAttendance(emp.employeeId, 'PRESENT')}
                        className="p-2 rounded-xl text-[#5CB77E] hover:bg-emerald-50 border border-transparent hover:border-emerald-200/50 transition-all shadow-sm"
                        title="Present"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(emp.employeeId, 'HALF_DAY')}
                        className="p-2 rounded-xl text-[#F2A65A] hover:bg-amber-50 border border-transparent hover:border-amber-200/50 transition-all shadow-sm"
                        title="Half Day"
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(emp.employeeId, 'ABSENT')}
                        className="p-2 rounded-xl text-[#E5636C] hover:bg-rose-50 border border-transparent hover:border-rose-200/50 transition-all shadow-sm"
                        title="Absent"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
          )}
        </div>
      )}

      {isPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Record Salary Payment</h3>
              <button onClick={() => setIsPayOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Employee</label>
                <select
                  required
                  value={newPayment.employeeId}
                  onChange={(e) => setNewPayment({ ...newPayment, employeeId: e.target.value })}
                  className="clay-input w-full mt-1 text-sm font-semibold"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.user?.name} ({emp.department || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="₹ Amount"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="clay-input w-full mt-1 text-sm font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={newPayment.paymentDate}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                    className="clay-input w-full mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">For Month</label>
                  <input
                    type="number"
                    required
                    min="1" max="12"
                    value={newPayment.paymentMonth}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMonth: Number(e.target.value) })}
                    className="clay-input w-full mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">For Year</label>
                  <input
                    type="number"
                    required
                    value={newPayment.paymentYear}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentYear: Number(e.target.value) })}
                    className="clay-input w-full mt-1 text-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Method</label>
                  <select
                    value={newPayment.paymentMethod}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                    className="clay-input w-full mt-1 text-sm"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                  <select
                    value={newPayment.status}
                    onChange={(e) => setNewPayment({ ...newPayment, status: e.target.value })}
                    className="clay-input w-full mt-1 text-sm font-semibold"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Txn ID or Reference"
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                  className="clay-input w-full mt-1 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsPayOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-violet-50 transition-colors">Cancel</button>
                <button type="submit" disabled={payMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-semibold">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
