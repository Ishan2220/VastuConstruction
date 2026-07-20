import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Mail, Phone, Building2, Calendar, Banknote, Shield, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';

export default function EmployeeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee-details', id],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${id}`);
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-slate-500">
        Employee not found.
      </div>
    );
  }

  const nameStr = employee.user?.name || employee.name || 'Staff Member';
  const emailStr = employee.user?.email || employee.email || 'N/A';
  const phoneStr = employee.user?.phone || employee.phone || 'N/A';
  const roleStr = (employee.designation || employee.role || employee.user?.role || 'ENGINEER').replace(/_/g, ' ');
  const deptStr = employee.department || 'Site Operations';
  const statusStr = employee.user?.isActive === false || employee.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-full font-sans pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading flex items-center gap-3">
            {nameStr}
            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${statusStr === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
              {statusStr}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{roleStr} • {deptStr}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Profile Overview</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Full Name</div>
                  <div className="font-bold text-slate-700">{nameStr}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Email Address</div>
                  <div className="font-medium text-slate-700">{emailStr}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Contact Number</div>
                  <div className="font-medium text-slate-700">{phoneStr}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold">ERP Privileges</div>
                  <div className="font-medium text-slate-700">{employee.user?.role || 'None'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Tabs for Attendance & Payments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Attendance Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 border-b pb-3 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Recent Attendance
            </h3>
            
            {(!employee.attendance || employee.attendance.length === 0) ? (
              <div className="text-center p-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                No recent attendance records.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b">
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Check In</th>
                      <th className="p-3 font-semibold">Check Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employee.attendance.slice(0, 10).map((att: any) => (
                      <tr key={att.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-slate-700">{formatDate(att.date)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                            att.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                            att.status === 'ABSENT' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {att.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                        <td className="p-3 text-slate-600">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 border-b pb-3 mb-4 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" />
              Salary Payment History
            </h3>
            
            {(!employee.salaryPayments || employee.salaryPayments.length === 0) ? (
              <div className="text-center p-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                No salary payment records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b">
                      <th className="p-3 font-semibold">Month/Year</th>
                      <th className="p-3 font-semibold">Date Paid</th>
                      <th className="p-3 font-semibold text-right">Amount</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employee.salaryPayments.map((pay: any) => (
                      <tr key={pay.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-700">
                          {new Date(pay.paymentYear, pay.paymentMonth - 1).toLocaleString('default', { month: 'short' })} {pay.paymentYear}
                        </td>
                        <td className="p-3 text-slate-600">{formatDate(pay.paymentDate)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(Number(pay.amount))}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {pay.status}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
