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

export default function SiteDashboardPage() {
  const { id } = useParams();

  const { data: project, isLoading } = useQuery({
    queryKey: ['site-dashboard', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}/dashboard`);
      return data.data;
    },
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

      {/* Header Info */}
      <div className="clay-card p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-6 border border-violet-100/30">
        <div className="space-y-4">
          
          <div className="flex gap-6 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Client</div>
                <div className="text-sm font-bold text-slate-800">{project.client?.name}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Engineer</div>
                <div className="text-sm font-bold text-slate-800">{project.engineer?.name || 'Unassigned'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-center min-w-[250px]">
          <div className="text-sm text-slate-500 font-semibold mb-1">Total Contract Value</div>
          <div className="text-3xl font-extrabold text-[#7C6EF0] font-heading flex items-center gap-2">
            <IndianRupee className="w-6 h-6" /> {formatCurrency(stats.contractValue).replace('₹', '')}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Started: {formatDate(project.startDate)}
          </div>
        </div>
      </div>

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
              <div className="text-2xl font-extrabold text-emerald-600 font-heading">{stats.financialProgress}%</div>
              <div className="text-xs text-slate-500 font-semibold">Collected</div>
            </div>
          </div>

          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full relative"
              style={{ width: `${stats.financialProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
              <div className="text-xs text-emerald-600 font-semibold mb-1 uppercase">Total Received</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(stats.totalReceived)}</div>
            </div>
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/50">
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

    </div>
  );
}
