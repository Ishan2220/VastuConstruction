import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  IndianRupee, 
  CheckCircle2, 
  TrendingUp, 
  ChevronRight,
  User,
  Phone,
  Mail,
  HardHat,
  PieChart,
  Calendar,
  Layers
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import { useState } from 'react';
import { X } from 'lucide-react';

export default function SiteDashboardPage() {
  const { id } = useParams();

  const { data: project, isLoading } = useQuery({
    queryKey: ['site-dashboard', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}/dashboard`);
      return data.data;
    },
  });

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const { data: incomes } = useQuery({
    queryKey: ['site-incomes', id],
    queryFn: async () => {
      const { data } = await api.get(`/income?projectId=${id}`);
      return data.data?.data || [];
    },
    enabled: isIncomeModalOpen,
  });

  const { data: expenses } = useQuery({
    queryKey: ['site-expenses', id],
    queryFn: async () => {
      const { data } = await api.get(`/expenses?projectId=${id}`);
      return data.data?.data || [];
    },
    enabled: isExpenseModalOpen,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C6EF0]"></div>
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  const stats = project.dashboardStats || {};
  
  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans pb-24">
      <PageHeader
        title={project.name}
        description={`${project.address || project.city || ''} ${project.state ? `, ${project.state}` : ''}`}
        showBack={false}
        breadcrumbs={[
          { label: 'Sites', href: '/projects' },
          { label: project.name, href: `/projects/${project.id}` },
          { label: 'Dashboard' }
        ]}
      >
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-clay-violet/30 text-[#7C6EF0] text-xs font-bold border border-violet-100/50">
            {project.projectCode || project.code}
          </span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
            project.status === 'IN_PROGRESS'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : project.status === 'COMPLETED'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {project.status.replace('_', ' ')}
          </span>
        </div>
      </PageHeader>

      {/* Hero Valuation & Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="clay-card p-6 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contract Value</span>
          <div className="text-2xl font-extrabold text-[#7C6EF0] font-heading">
            {formatCurrency(Number(project.contractValue || stats.contractValue || 0))}
          </div>
          <div className="text-xs text-slate-400 font-medium">Total approved valuation</div>
        </div>

        <div className="clay-card p-6 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Fee</span>
          <div className="text-2xl font-extrabold text-[#F2A65A] font-heading">
            {formatCurrency(Number(project.budget || stats.budget || 0))}
          </div>
          <div className="text-xs text-slate-400 font-medium">Cost limit allocation</div>
        </div>

        <div className="clay-card p-6 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Physical Completion</span>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-[#5CB77E] font-heading">
              {project.progress || 0}%
            </div>
            <CheckCircle2 className="w-6 h-6 text-[#5CB77E]" />
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-1 inner-shadow">
            <div
              className="h-full bg-gradient-to-r from-[#7C6EF0] to-[#5CB77E] rounded-full transition-all duration-500"
              style={{ width: `${project.progress || 0}%` }}
            />
          </div>
        </div>

        <div className="clay-card p-6 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Site Location</span>
          <div className="text-lg font-bold text-slate-800 flex items-center gap-2 font-heading">
            <MapPin className="w-5 h-5 text-[#E5636C]" />
            <span>{project.city || 'Mumbai'}, {project.state || 'Maharashtra'}</span>
          </div>
          <div className="text-xs text-slate-500 truncate font-medium">
            Client: <strong className="text-[#7C6EF0]">{project.client?.name || 'Unassigned Client'}</strong>
          </div>
        </div>
      </div>

      {/* Contract Scope & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 clay-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 font-heading">Contract Scope & Engineering Specifications</h3>
          <p className="text-sm text-slate-600 leading-relaxed bg-white/50 p-4 rounded-xl border border-violet-100/30 shadow-inner">
            {project.description ||
              'Full structural construction contract including foundation work, reinforced cement concrete (RCC) columns, structural framing, electrical plumbing conduits, and safety compliance according to municipal code guidelines.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white/50 border border-violet-100/40 space-y-1">
              <div className="text-xs text-slate-500 font-bold uppercase">Assigned Project Client</div>
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-[#7C6EF0]" />
                <span>{project.client?.name || 'Unassigned Client'}</span>
              </div>
              <div className="text-xs text-slate-500 font-mono">{project.client?.phone || 'No Phone Recorded'}</div>
            </div>

            <div className="p-4 rounded-xl bg-white/50 border border-violet-100/40 space-y-1">
              <div className="text-xs text-slate-500 font-bold uppercase">Assigned Site Engineer</div>
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <HardHat className="w-4 h-4 text-[#F2A65A]" />
                <span>{project.engineer?.name || 'Unassigned'}</span>
              </div>
              <div className="text-xs text-slate-500 font-mono">{project.engineer?.email || 'No Email Recorded'}</div>
            </div>
          </div>
        </div>

        {/* Timeline / Recent Activity */}
        <div className="clay-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 font-heading">Milestone Timeline</h3>
          <div className="space-y-4 border-l-2 border-violet-100/40 pl-4 py-1">
            {!project.timeline || project.timeline.length === 0 ? (
              <div className="py-6 text-slate-400 text-xs font-medium">No timeline milestones recorded for this project yet.</div>
            ) : (
              project.timeline.slice(0, 5).map((event: any) => (
                <div key={event.id} className="relative space-y-1">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#7C6EF0] ring-4 ring-white" />
                  <div className="text-xs font-bold text-slate-800">{event.action}</div>
                  <div className="text-xs text-slate-500 leading-snug">{event.notes}</div>
                  <div className="text-[10px] text-slate-400 font-mono font-medium">
                    {new Date(event.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {(() => {
        const totalBudget = project.budget || stats.contractValue || 0;
        const reactiveFinancialProgress = totalBudget > 0 ? Math.min(Math.round((stats.totalSpent / totalBudget) * 100), 100) : 0;
        
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Completion Card */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="clay-card p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C6EF0]/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-clay-violet/30 text-[#7C6EF0] rounded-xl border border-violet-100/50">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 font-heading text-lg">Financial Overview</h3>
                    <p className="text-xs text-slate-500">Revenue collection & expenditure</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-emerald-600 font-heading">{reactiveFinancialProgress}%</div>
                  <div className="text-xs text-slate-500 font-semibold">Spent</div>
                </div>
              </div>

              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full relative"
                  style={{ width: `${reactiveFinancialProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 cursor-pointer hover:bg-emerald-100/50 transition-colors" onClick={() => setIsIncomeModalOpen(true)}>
                  <div className="text-xs text-emerald-600 font-semibold mb-1 uppercase">Total Received</div>
                  <div className="text-lg font-bold text-slate-900">{formatCurrency(stats.totalReceived)}</div>
                </div>
                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/50 cursor-pointer hover:bg-rose-100/50 transition-colors" onClick={() => setIsExpenseModalOpen(true)}>
                  <div className="text-xs text-rose-600 font-semibold mb-1 uppercase">Total Spent (Expenses)</div>
                  <div className="text-lg font-bold text-slate-900">{formatCurrency(stats.totalSpent)}</div>
                </div>
              </div>
            </motion.div>

        {/* Physical Completion Card */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="clay-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/50">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-heading text-lg">Physical Progress</h3>
                <p className="text-xs text-slate-500">Site construction & milestones</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-blue-600 font-heading">{stats.manualProgress || 0}%</div>
              <div className="text-xs text-slate-500 font-semibold">Completed</div>
            </div>
          </div>

          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full relative"
              style={{ width: `${stats.manualProgress || 0}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_ease-in-out_infinite]"></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold mb-1 uppercase">Site Progress Updates</div>
              <div className="text-lg font-bold text-slate-900">{project._count?.siteProgress || 0} Logs</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold mb-1 uppercase">Task Completion</div>
              <div className="text-lg font-bold text-slate-900">{stats.completedTasks} / {stats.totalTasks} Tasks</div>
            </div>
          </div>
          </motion.div>
          </div>
        );
      })()}
      {/* Income Modal */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Total Received Details</h3>
              <button onClick={() => setIsIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {!incomes ? (
                <div className="text-center py-4 text-slate-500">Loading...</div>
              ) : incomes.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No incomes recorded.</div>
              ) : (
                <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Mode</th>
                      <th className="px-4 py-2">Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incomes.map((inc: any) => (
                      <tr key={inc.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">{formatDate(inc.date || inc.createdAt)}</td>
                        <td className="px-4 py-2 font-bold text-emerald-600">{formatCurrency(inc.amount)}</td>
                        <td className="px-4 py-2">{inc.paymentMethod || '-'}</td>
                        <td className="px-4 py-2">{inc.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Expenses Details</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {!expenses ? (
                <div className="text-center py-4 text-slate-500">Loading...</div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No expenses recorded.</div>
              ) : (
                <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Mode</th>
                      <th className="px-4 py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">{formatDate(exp.date || exp.createdAt)}</td>
                        <td className="px-4 py-2 font-bold text-rose-600">{formatCurrency(exp.amount)}</td>
                        <td className="px-4 py-2">{exp.paymentMethod || '-'}</td>
                        <td className="px-4 py-2">{exp.type || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
