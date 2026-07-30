import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog, Search, Calculator, CheckCircle2, Lock, Unlock, IndianRupee, History, Settings } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { useConfirm } from '../components/ui/ConfirmProvider';

export default function PayrollPage() {
  const user = useAuthStore(state => state.user);
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'payrolls' | 'history' | 'settings'>('payrolls');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [adjPayload, setAdjPayload] = useState({ type: 'BONUS', amount: '', reason: '' });
  const [payPayload, setPayPayload] = useState({ accountId: '', paymentMethod: 'BANK_TRANSFER', reference: '' });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await api.get('/employees');
      return data.data?.data || data.data || [];
    }
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/bank-accounts');
      return res.data.data || [];
    }
  });

  const { data: payrolls = [], isLoading: isPayrollsLoading } = useQuery({
    queryKey: ['payrolls', targetMonth, targetYear],
    queryFn: async () => {
      const { data } = await api.get(`/payroll?month=${targetMonth}&year=${targetYear}`);
      return data.data || [];
    }
  });

  const { data: auditLogs = [], isLoading: isAuditLoading } = useQuery({
    queryKey: ['payroll-audit-logs', selectedPayroll?.employeeId, targetMonth, targetYear],
    queryFn: async () => {
      if (!selectedPayroll) return [];
      const { data } = await api.get(`/payroll/logs?employeeId=${selectedPayroll.employeeId}&month=${targetMonth}&year=${targetYear}`);
      return data.data || [];
    },
    enabled: !!selectedPayroll && isAuditLogOpen
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/payroll/generate', {
        employeeId: selectedEmployee,
        month: targetMonth,
        year: targetYear
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Payroll generated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to generate payroll');
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => await api.post(`/payroll/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Payroll approved');
    }
  });

  const freezeMutation = useMutation({
    mutationFn: async (id: string) => await api.post(`/payroll/${id}/freeze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Payroll frozen (locked)');
    }
  });

  const adjustMutation = useMutation({
    mutationFn: async () => await api.post(`/payroll/${selectedPayrollId}/adjust`, adjPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Adjustment added successfully');
      setIsAdjustmentOpen(false);
      setAdjPayload({ type: 'BONUS', amount: '', reason: '' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add adjustment');
    }
  });

  const payMutation = useMutation({
    mutationFn: async () => await api.post(`/payroll/${selectedPayrollId}/pay`, payPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Payroll paid & reconciled successfully');
      setIsPayOpen(false);
      setPayPayload({ accountId: '', paymentMethod: 'BANK_TRANSFER', reference: '' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to pay payroll');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/payroll/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Payroll record deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete payroll');
    }
  });

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Confirm Action', message: 'Are you sure you want to delete this payroll? It cannot be undone.' })) {
      deleteMutation.mutate(id);
    }
  };

  const handleGenerate = () => {
    if (!selectedEmployee) {
      toast.error('Select an employee first');
      return;
    }
    generateMutation.mutate();
  };

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading flex items-center gap-2">
            <Calculator className="w-8 h-8 text-[#7C6EF0]" /> Payroll Engine
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Generate, approve, and freeze monthly enterprise payrolls.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-violet-100/30 pb-2">
        <button 
          onClick={() => setActiveTab('payrolls')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'payrolls' ? 'bg-[#7C6EF0] text-white shadow-md' : 'text-slate-600 hover:bg-violet-50/50'}`}
        >
          Active Payrolls
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-[#7C6EF0] text-white shadow-md' : 'text-slate-600 hover:bg-violet-50/50'}`}
        >
          Configuration
        </button>
      </div>

      {activeTab === 'payrolls' && (
        <div className="space-y-6">
          <div className="clay-card p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-auto">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Month</label>
              <select value={targetMonth} onChange={(e) => setTargetMonth(Number(e.target.value))} className="clay-input p-2.5 w-full">
                {Array.from({length: 12}).map((_, i) => (
                  <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Year</label>
              <input type="number" value={targetYear} onChange={(e) => setTargetYear(Number(e.target.value))} className="clay-input p-2.5 w-full md:w-24" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee</label>
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="clay-input p-2.5 w-full">
                <option value="">Select Employee</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.user?.name} ({emp.designation})</option>
                ))}
              </select>
            </div>
            <button onClick={handleGenerate} disabled={generateMutation.isPending} className="clay-btn bg-[#7C6EF0] text-white px-6 py-2.5 rounded-xl font-bold w-full md:w-auto">
              {generateMutation.isPending ? 'Generating...' : 'Generate Payroll'}
            </button>
          </div>

          <div className="clay-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="border-b border-violet-100/30">
                    <th className="px-4 py-4 text-left font-bold text-slate-400 uppercase text-xs">Employee</th>
                    <th className="px-3 py-4 text-right font-bold text-slate-400 uppercase text-xs">Monthly</th>
                    <th className="px-3 py-4 text-right font-bold text-slate-400 uppercase text-xs">Daily</th>
                    <th className="px-3 py-4 text-center font-bold text-slate-400 uppercase text-xs">Present</th>
                    <th className="px-3 py-4 text-center font-bold text-slate-400 uppercase text-xs">Half</th>
                    <th className="px-3 py-4 text-center font-bold text-slate-400 uppercase text-xs">Absent</th>
                    <th className="px-3 py-4 text-center font-bold text-slate-400 uppercase text-xs">Work Hrs</th>
                    <th className="px-3 py-4 text-center font-bold text-slate-400 uppercase text-xs">OT Hrs</th>
                    <th className="px-3 py-4 text-right font-bold text-slate-400 uppercase text-xs">OT Earned</th>
                    <th className="px-3 py-4 text-right font-bold text-slate-400 uppercase text-xs">Gross</th>
                    <th className="px-3 py-4 text-right font-bold text-slate-400 uppercase text-xs">Net</th>
                    <th className="px-3 py-4 text-center font-bold text-slate-400 uppercase text-xs">Status</th>
                    <th className="px-3 py-4 text-right font-bold text-slate-400 uppercase text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50/50">
                  {payrolls.map((p: any) => (
                    <tr key={p.id} className="hover:bg-violet-50/30">
                      <td className="px-4 py-3 font-semibold text-slate-700">{p.employee?.user?.name}</td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">{formatCurrency(p.monthlySalary)}</td>
                      <td className="px-3 py-3 text-right text-slate-500 text-xs">{formatCurrency(p.dailySalary)}</td>
                      <td className="px-3 py-3 text-center text-emerald-600 font-bold">{p.presentDays}</td>
                      <td className="px-3 py-3 text-center text-amber-600 font-bold">{p.halfDays || 0}</td>
                      <td className="px-3 py-3 text-center text-red-500 font-bold">{p.absentDays || 0}</td>
                      <td className="px-3 py-3 text-center text-slate-600">{Number(p.totalWorkingHours || 0).toFixed(1)}</td>
                      <td className="px-3 py-3 text-center text-orange-500 font-bold">{Number(p.totalOvertimeHours || 0).toFixed(1)}</td>
                      <td className="px-3 py-3 text-right text-orange-500">{formatCurrency(p.overtimeEarnings || 0)}</td>
                      <td className="px-3 py-3 text-right text-slate-700 font-semibold">{formatCurrency(p.grossSalary)}</td>
                      <td className="px-3 py-3 text-right font-bold text-[#7C6EF0]">{formatCurrency(p.netSalary)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          p.status === 'CALCULATED' ? 'bg-amber-100 text-amber-700' :
                          p.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                          p.status === 'LOCKED' ? 'bg-slate-200 text-slate-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right space-x-1">
                        {p.status === 'CALCULATED' && (
                           <>
                             <button onClick={() => approveMutation.mutate(p.id)} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">Approve</button>
                             <button onClick={() => { setSelectedPayrollId(p.id); setIsAdjustmentOpen(true); }} className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold">Adjust</button>
                           </>
                        )}
                        {p.status === 'APPROVED' && (
                           <>
                             <button onClick={() => { setSelectedPayrollId(p.id); setIsPayOpen(true); }} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">Pay</button>
                             <button onClick={() => freezeMutation.mutate(p.id)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">Freeze</button>
                           </>
                        )}
                        <button onClick={() => { setSelectedPayroll(p); setIsAuditLogOpen(true); }} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">Audit</button>
                        {user?.role === 'ADMIN' && p.status !== 'PAID' && (
                          <button onClick={() => handleDelete(p.id)} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payrolls.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-6 py-12 text-center text-slate-400">
                        No payrolls generated for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="clay-card p-6">
           <p className="text-slate-500 text-center">Payroll Settings coming soon...</p>
        </div>
      )}

      {/* Adjustment Modal */}
      {isAdjustmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Add Adjustment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                <select value={adjPayload.type} onChange={e => setAdjPayload({...adjPayload, type: e.target.value})} className="clay-input w-full p-2.5">
                  <option value="BONUS">Bonus</option>
                  <option value="DEDUCTION">Deduction</option>
                  <option value="INCENTIVE">Incentive</option>
                  <option value="ARREARS">Arrears</option>
                  <option value="CORRECTION">Correction</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Amount</label>
                <input type="number" value={adjPayload.amount} onChange={e => setAdjPayload({...adjPayload, amount: e.target.value})} className="clay-input w-full p-2.5" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Reason</label>
                <input type="text" value={adjPayload.reason} onChange={e => setAdjPayload({...adjPayload, reason: e.target.value})} className="clay-input w-full p-2.5" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsAdjustmentOpen(false)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={() => adjustMutation.mutate()} disabled={adjustMutation.isPending} className="clay-btn bg-[#7C6EF0] text-white px-6 py-2 rounded-xl font-bold">
                  {adjustMutation.isPending ? 'Saving...' : 'Add Adjustment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {isAuditLogOpen && selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">Daily Salary Audit Trail - {selectedPayroll.employee?.user?.name}</h3>
              <button onClick={() => setIsAuditLogOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="overflow-auto flex-1 border border-slate-100 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase">Std Hrs</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase">Wrk Hrs</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase">OT Hrs</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase">Daily Base</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase">OT Amount</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase">Final Day Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isAuditLoading ? (
                    <tr><td colSpan={7} className="p-4 text-center text-slate-500">Loading audit logs...</td></tr>
                  ) : auditLogs.length === 0 ? (
                    <tr><td colSpan={7} className="p-4 text-center text-slate-500">No work logs found for this period.</td></tr>
                  ) : (
                    auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{format(new Date(log.date), 'dd MMM yyyy')}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{log.standardHours}</td>
                        <td className="px-4 py-3 text-center text-slate-700 font-bold">{log.workingHours}</td>
                        <td className="px-4 py-3 text-center text-orange-500 font-bold">{log.overtimeHours}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(log.dailySalary)}</td>
                        <td className="px-4 py-3 text-right text-orange-500">{formatCurrency(log.overtimeAmount)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(log.finalDaySalary)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setIsAuditLogOpen(false)} className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Pay Modal */}
      {isPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Pay & Reconcile Salary</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">From Bank Account</label>
                <select value={payPayload.accountId} onChange={e => setPayPayload({...payPayload, accountId: e.target.value})} className="clay-input w-full p-2.5">
                  <option value="">Select Account</option>
                  {bankAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber} ({formatCurrency(acc.balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Payment Method</label>
                <select value={payPayload.paymentMethod} onChange={e => setPayPayload({...payPayload, paymentMethod: e.target.value})} className="clay-input w-full p-2.5">
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Reference ID</label>
                <input type="text" value={payPayload.reference} onChange={e => setPayPayload({...payPayload, reference: e.target.value})} className="clay-input w-full p-2.5" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsPayOpen(false)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={() => payMutation.mutate()} disabled={payMutation.isPending || !payPayload.accountId} className="clay-btn bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold">
                  {payMutation.isPending ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
