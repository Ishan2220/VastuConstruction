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
      return data.data || [];
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
    <div className="p-4 md:p-8 lg:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading flex items-center gap-2">
            <UserCog className="w-8 h-8 text-indigo-600" /> Employee Salary Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track staff salaries, issue payments, and maintain payroll ledgers.
          </p>
        </div>

        <button
          onClick={() => setIsPayOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all"
        >
          <IndianRupee className="w-4 h-4" />
          <span>Record Salary Payment</span>
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button 
          onClick={() => setActiveTab('salaries')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'salaries' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Salary Payments
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Daily Attendance
        </button>
      </div>

      <div className="sticky top-16 z-20 bg-white/90 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employees..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-inner"
          />
        </div>
        
        {activeTab === 'attendance' && (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <CalendarCheck className="w-4 h-4 text-slate-500" />
            <input 
              type="date" 
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
            />
          </div>
        )}
      </div>

      {activeTab === 'salaries' && (
        <>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading payroll data...</div>
          ) : filteredSalaries.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center text-slate-400">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              No salary records found.
            </div>
          ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredSalaries.map((salary: any) => (
                  <tr key={salary.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {format(new Date(salary.paymentDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{salary.employee?.user?.name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                      {salary.paymentMonth}/{salary.paymentYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-extrabold text-slate-900 font-mono">
                      {formatCurrency(Number(salary.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium text-slate-500">
                      {salary.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        salary.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {salary.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {isAttendanceLoading ? (
            <div className="p-8 text-center text-slate-500">Loading attendance data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Mark Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredAttendance.map((emp: any) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{emp.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {emp.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                          emp.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          emp.status === 'ABSENT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          emp.status === 'HALF_DAY' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {emp.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleMarkAttendance(emp.employeeId, 'PRESENT')}
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
                          title="Present"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(emp.employeeId, 'HALF_DAY')}
                          className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all"
                          title="Half Day"
                        >
                          <Clock className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(emp.employeeId, 'ABSENT')}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
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
          )}
        </div>
      )}

      {isPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-900">Record Salary Payment</h3>
              <button onClick={() => setIsPayOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Employee</label>
                <select
                  required
                  value={newPayment.employeeId}
                  onChange={(e) => setNewPayment({ ...newPayment, employeeId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border bg-slate-50 text-sm font-semibold"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.user?.name} ({emp.department || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="₹ Amount"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border bg-slate-50 text-sm font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={newPayment.paymentDate}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">For Month</label>
                  <input
                    type="number"
                    required
                    min="1" max="12"
                    value={newPayment.paymentMonth}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMonth: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">For Year</label>
                  <input
                    type="number"
                    required
                    value={newPayment.paymentYear}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentYear: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Method</label>
                  <select
                    value={newPayment.paymentMethod}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border bg-slate-50 text-sm"
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
                    className="w-full mt-1 px-3 py-2 rounded-xl border bg-slate-50 text-sm font-semibold"
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
                  className="w-full mt-1 px-3 py-2 rounded-xl border bg-slate-50 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2">
                <button type="button" onClick={() => setIsPayOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={payMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
