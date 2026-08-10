import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Mail, Phone, Building2, Calendar, Banknote, Shield, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';

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
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7C6EF0] border-t-transparent" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
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
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans pb-24">
      <PageHeader
        title={nameStr}
        description={`${roleStr} • ${deptStr}`}
        showBack={false}
        breadcrumbs={[
          { label: 'Employees', href: '/employees' },
          { label: nameStr }
        ]}
      >
        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase border ${statusStr === 'ACTIVE' ? 'bg-clay-green/10 text-[#5CB77E] border-[#5CB77E]/30' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
          {statusStr}
        </span>
      </PageHeader>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="clay-card p-6 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-violet-100/40 pb-3 font-heading">Profile Overview</h3>
            <div className="space-y-4 text-sm mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-clay-violet/10 text-[#7C6EF0]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Full Name</div>
                  <div className="font-bold text-slate-800">{nameStr}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-clay-violet/10 text-[#7C6EF0]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Email Address</div>
                  <div className="font-bold text-slate-800">{emailStr}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-clay-violet/10 text-[#7C6EF0]">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Contact Number</div>
                  <div className="font-bold text-slate-800">{phoneStr}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-clay-violet/10 text-[#7C6EF0]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">ERP Privileges</div>
                  <div className="font-bold text-slate-800">{employee.user?.role || 'None'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Tabs for Attendance & Payments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Attendance Section */}
          <div className="clay-card p-6">
            <h3 className="font-bold text-slate-800 border-b border-violet-100/40 pb-3 mb-4 flex items-center gap-2 font-heading">
              <Calendar className="w-5 h-5 text-[#7C6EF0]" />
              Recent Attendance
            </h3>
            
            {(!employee.attendance || employee.attendance.length === 0) ? (
              <div className="text-center p-6 text-slate-500 bg-white/50 rounded-xl border border-violet-100/40 border-dashed shadow-inner font-medium">
                No recent attendance records.
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-white text-slate-500 border-b border-violet-100/40">
                        <th className="p-3 font-bold uppercase tracking-wider text-xs">Date</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-xs">Status</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-xs">Check In</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-xs">Check Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-100/40">
                      {employee.attendance.slice(0, 10).map((att: any) => (
                        <tr key={att.id} className="hover:bg-white/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-700">{formatDate(att.date)}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              att.status === 'PRESENT' ? 'bg-clay-green/10 text-[#5CB77E] border-[#5CB77E]/30' :
                              att.status === 'ABSENT' ? 'bg-clay-rose/10 text-[#E5636C] border-[#E5636C]/30' :
                              'bg-clay-amber/10 text-[#F2A65A] border-[#F2A65A]/30'
                            }`}>
                              {att.status}
                            </span>
                            {att.status === 'ABSENT' && att.absentReason && (
                              <div className="text-[10px] text-gray-500 font-medium italic mt-1 max-w-[200px] truncate" title={att.absentReason}>
                                Reason: {att.absentReason}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                          <td className="p-3 text-slate-600 font-medium">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden flex flex-col gap-3">
                  {employee.attendance.slice(0, 10).map((att: any) => (
                    <div key={att.id} className="clay-card-sm p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="font-mono font-bold text-slate-700">{formatDate(att.date)}</div>
                        <div className="flex flex-col items-end">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            att.status === 'PRESENT' ? 'bg-clay-green/10 text-[#5CB77E] border-[#5CB77E]/30' :
                            att.status === 'ABSENT' ? 'bg-clay-rose/10 text-[#E5636C] border-[#E5636C]/30' :
                            'bg-clay-amber/10 text-[#F2A65A] border-[#F2A65A]/30'
                          }`}>
                            {att.status}
                          </span>
                          {att.status === 'ABSENT' && att.absentReason && (
                            <span className="text-[10px] text-gray-500 font-medium italic mt-1 text-right max-w-[150px] truncate" title={att.absentReason}>
                              {att.absentReason}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-violet-100/30">
                        <div><span className="text-slate-400">Check In:</span> <span className="font-semibold">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span></div>
                        <div><span className="text-slate-400">Check Out:</span> <span className="font-semibold">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Payment Section */}
          <div className="clay-card p-6">
            <h3 className="font-bold text-slate-800 border-b border-violet-100/40 pb-3 mb-4 flex items-center gap-2 font-heading">
              <Banknote className="w-5 h-5 text-[#5CB77E]" />
              Salary Payment History
            </h3>
            
            {(!employee.salaryPayments || employee.salaryPayments.length === 0) ? (
              <div className="text-center p-6 text-slate-500 bg-white/50 rounded-xl border border-violet-100/40 border-dashed shadow-inner font-medium">
                No salary payment records found.
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-white text-slate-500 border-b border-violet-100/40">
                        <th className="p-3 font-bold uppercase tracking-wider text-xs">Month/Year</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-xs">Date Paid</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-xs text-right">Amount</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-100/40">
                      {employee.salaryPayments.map((pay: any) => (
                        <tr key={pay.id} className="hover:bg-white/50 transition-colors">
                          <td className="p-3 font-bold text-slate-800">
                            {new Date(pay.paymentYear, pay.paymentMonth - 1).toLocaleString('default', { month: 'short' })} {pay.paymentYear}
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{formatDate(pay.paymentDate)}</td>
                          <td className="p-3 text-right font-mono font-bold text-[#7C6EF0]">
                            {formatCurrency(Number(pay.amount))}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#5CB77E] text-xs font-bold bg-clay-green/10 px-2.5 py-1 rounded-full w-fit border border-[#5CB77E]/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {pay.status}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden flex flex-col gap-3">
                  {employee.salaryPayments.map((pay: any) => (
                    <div key={pay.id} className="clay-card-sm p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-slate-800 font-heading">
                          {new Date(pay.paymentYear, pay.paymentMonth - 1).toLocaleString('default', { month: 'short' })} {pay.paymentYear}
                        </div>
                        <div className="font-mono font-bold text-[#7C6EF0] text-lg">
                          {formatCurrency(Number(pay.amount))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <div><span className="text-slate-400">Date:</span> {formatDate(pay.paymentDate)}</div>
                        <div className="flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#5CB77E] text-[10px] font-bold bg-clay-green/10 px-2 py-0.5 rounded-full border border-[#5CB77E]/30">
                          <CheckCircle2 className="w-3 h-3" /> {pay.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
