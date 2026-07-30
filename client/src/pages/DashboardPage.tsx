import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  HardHat,
  IndianRupee,
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
  Plus,
  Users,
  X,
  Wallet,
  CheckSquare,
  Square,
  AlertCircle,
  PackageCheck,
  Landmark,
  Activity,
  Banknote,
} from 'lucide-react';
import { CacheManager } from '@/lib/CacheManager';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';
import { staggerContainer, fadeInUp, clayCardHover } from '@/animations';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

// --------------- Types ---------------
interface KpiState {
  totalLeads: number;
  activeProjects: number;
  activeSites: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashInHand: number;
  bankBalance: number;
  clientReceivable: number;
  vendorPayable: number;
}

interface SiteItem {
  id: string;
  name: string;
  location: string;
  progress: number;
  income: number;
  expense: number;
}

interface ReminderItem {
  id: string;
  title: string;
  dateStr: string;
  tag: string;
}

interface ExpenseCategoryItem {
  id: string;
  name: string;
  amount: number;
  color: string;
}

interface PaymentModeItem {
  id: string;
  mode: string;
  amount: number;
  pct: number;
  color: string;
  text: string;
}

interface ActivityItem {
  id: string;
  desc: string;
  time: string;
  type: 'PAYMENT' | 'MATERIAL' | 'LEAD' | 'INCOME';
}

interface TaskItem {
  id: string;
  title: string;
  time: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
}

interface LeadItem {
  id: string;
  name: string;
  city: string;
  stage: string;
  date: string;
  badge: string;
}

// --------------- Defaults ---------------
const defaultKpis: KpiState = {
  totalLeads: 0,
  activeProjects: 0,
  activeSites: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  cashInHand: 0,
  bankBalance: 0,
  clientReceivable: 0,
  vendorPayable: 0,
};

const CHART_COLORS = [
  '#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', 
  '#10B981', '#3B82F6', '#F43F5E', '#84CC16', '#06B6D4', 
  '#D946EF', '#EAB308', '#22C55E', '#A855F7', '#0EA5E9', 
  '#EF4444', '#16A34A', '#F97316', '#64748B', '#0F766E'
];
const BADGE_OPTIONS = [
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-rose-50 text-rose-700 border-rose-200',
];

// --------------- KPI Label Map ---------------
type KpiField = keyof Omit<KpiState, 'overallProfit'>;
const KPI_LABELS: Record<KpiField, string> = {
  totalLeads: 'Total Leads',
  activeProjects: 'Active Projects',
  activeSites: 'Active Sites',
  monthlyIncome: 'Total Income',
  monthlyExpenses: 'Total Expenses',
  cashInHand: 'Cash in Hand',
  bankBalance: 'Bank Balance',
  clientReceivable: 'Client Receivable',
  vendorPayable: 'Vendor Payable',
};

const MONEY_KPIS: KpiField[] = ['monthlyIncome', 'monthlyExpenses', 'cashInHand', 'bankBalance', 'clientReceivable', 'vendorPayable'];

// ============================================
// KPI Card Config
// ============================================
const kpiCardConfig = [
  { key: 'totalLeads', label: 'Total Leads', icon: Users, gradient: 'bg-clay-violet', iconColor: 'text-[#7C6EF0]', route: '/leads', isMoney: false },
  { key: 'activeProjects', label: 'Active Projects', icon: Building2, gradient: 'bg-clay-green', iconColor: 'text-[#5CB77E]', route: '/projects', isMoney: false },
  { key: 'activeSites', label: 'Active Sites', icon: HardHat, gradient: 'bg-clay-amber', iconColor: 'text-[#F2A65A]', route: '/sites', isMoney: false },
  { key: 'monthlyIncome', label: 'Total Income', icon: IndianRupee, gradient: 'bg-clay-green', iconColor: 'text-[#5CB77E]', route: '/reports', isMoney: true },
  { key: 'monthlyExpenses', label: 'Total Expenses', icon: TrendingDown, gradient: 'bg-clay-rose', iconColor: 'text-[#E5636C]', route: '/reports', isMoney: true },
] as const;

const finCardConfig = [
  { key: 'cashInHand', label: 'Cash in Hand', icon: Wallet, iconBg: 'bg-clay-green', iconColor: 'text-[#5CB77E]', route: '/accounts' },
  { key: 'bankBalance', label: 'Bank Balance', icon: Landmark, iconBg: 'bg-clay-violet', iconColor: 'text-[#7C6EF0]', route: '/accounts' },
  { key: 'clientReceivable', label: 'Client Receivable', icon: Users, iconBg: 'bg-clay-blue', iconColor: 'text-[#4EA8DE]', route: '/clients' },
  { key: 'vendorPayable', label: 'Vendor Payable', icon: Building2, iconBg: 'bg-clay-amber', iconColor: 'text-[#F2A65A]', route: '/vendors' },
] as const;


// ============================================
// COMPONENT
// ============================================
export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: serverDashboard, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/summary');
      return data?.data || null;
    },
    refetchOnMount: true,
  });

  const { data: kpiData } = useQuery({
    queryKey: ['admin-dashboard-stats', 'dashboard-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/kpis');
      return data || null; // Returning exact shape, not data.data
    },
    refetchOnMount: true,
  });

  const { data: todayActivities = [] } = useQuery({
    queryKey: ['admin-dashboard-stats', 'today-activities'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/activities');
      return data?.data || [];
    },
    refetchOnMount: true,
  });

  const kpis: KpiState & { overallProfit: number } = useMemo(() => {
    if (!kpiData) return { ...defaultKpis, overallProfit: 0 };
    return {
      totalLeads: kpiData.totalLeads || 0,
      activeProjects: kpiData.activeProjects || 0,
      activeSites: kpiData.activeSites || 0,
      monthlyIncome: Number(kpiData.incomeThisMonth) || 0,
      monthlyExpenses: Number(kpiData.expensesThisMonth) || 0,
      cashInHand: Number(kpiData.cashInHand) || 0,
      bankBalance: Number(kpiData.bankBalance) || 0,
      clientReceivable: Number(kpiData.clientReceivable) || 0,
      vendorPayable: Number(kpiData.vendorPayable) || 0,
      overallProfit: Number(kpiData.overallProfit) || 0,
    };
  }, [kpiData]);

  const overallProfit = kpis.overallProfit;

  // ---- Dashboard Data Mappings ----
  const sites = useMemo(() => {
    if (!serverDashboard?.activeSites) return [];
    const plMap = new Map();
    if (serverDashboard?.siteWisePL) {
      serverDashboard.siteWisePL.forEach((pl: any) => {
        plMap.set(pl.id, pl);
      });
    }
    return serverDashboard.activeSites.map((s: any) => {
      const pl = plMap.get(s.id);
      return {
        id: s.id,
        name: s.name,
        location: s.city || 'Mumbai',
        progress: s.progress || 0,
        income: pl ? Number(pl.totalIncome) : Number(s.contractValue) || 0,
        expense: pl ? Number(pl.totalExpense) : 0,
      };
    });
  }, [serverDashboard]);

  const remindersList = useMemo(() => {
    if (!serverDashboard?.upcomingReminders) return [];
    return serverDashboard.upcomingReminders.map((r: any) => ({
      id: r.id,
      title: r.title || r.project?.name || 'Meeting',
      dateStr: new Date(r.startTime).toLocaleString(),
      tag: r.type || 'Meeting'
    }));
  }, [serverDashboard]);

  const expenseCategories = useMemo(() => {
    if (!serverDashboard?.expenseByCategory) return [];
    return serverDashboard.expenseByCategory.map((c: any, idx: number) => ({
      id: String(idx),
      name: c.type,
      amount: Number(c._sum?.amount) || 0,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }));
  }, [serverDashboard]);
  const totalExpCatAmount = expenseCategories.reduce((s: number, c: any) => s + c.amount, 0);

  const personalExpenseTotal = useMemo(() => {
    return expenseCategories.find((c: any) => c.name === 'PERSONAL')?.amount || 0;
  }, [expenseCategories]);

  const paymentModes = useMemo(() => {
    if (!serverDashboard?.paymentModeSummary) return [];
    const pmData = serverDashboard.paymentModeSummary.map((pm: any, idx: number) => ({
      id: String(idx),
      mode: pm.paymentMethod,
      amount: Number(pm._sum?.amount) || 0,
      pct: 0,
      color: CHART_COLORS[idx % CHART_COLORS.length],
      text: CHART_COLORS[idx % CHART_COLORS.length]
    }));
    const total = pmData.reduce((s: number, p: any) => s + p.amount, 0) || 1;
    return pmData.map((pm: any) => ({ ...pm, pct: Math.round((pm.amount / total) * 100) }));
  }, [serverDashboard]);
  const totalPaymentModeAmount = paymentModes.reduce((s: number, pm: any) => s + pm.amount, 0);

  const activities = useMemo(() => {
    if (!serverDashboard?.recentActivities) return [];
    return serverDashboard.recentActivities.map((a: any) => ({
      id: a.id,
      desc: `${a.user?.name || 'System'} ${a.action.toLowerCase()} ${a.module.toLowerCase()}`,
      time: new Date(a.date).toLocaleString(),
      type: a.module
    }));
  }, [serverDashboard]);

  const todayTasks = useMemo(() => {
    if (!serverDashboard?.todayTasks) return [];
    return serverDashboard.todayTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      time: t.dueDate ? new Date(t.dueDate).toLocaleTimeString() : '12:00 PM',
      priority: t.priority,
      completed: t.status === 'COMPLETED'
    }));
  }, [serverDashboard]);

  const leads = useMemo(() => {
    if (!serverDashboard?.recentLeads) return [];
    return serverDashboard.recentLeads.map((l: any, idx: number) => ({
      id: l.id,
      name: l.name,
      city: l.source || '',
      stage: l.status,
      date: new Date(l.createdAt).toLocaleDateString(),
      badge: BADGE_OPTIONS[idx % BADGE_OPTIONS.length]
    }));
  }, [serverDashboard]);

  const topOutstandingClients = useMemo(() => {
    if (!serverDashboard?.topOutstandingClients) return [];
    return serverDashboard.topOutstandingClients;
  }, [serverDashboard]);

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/tasks/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      refetch(); // Refetch dashboard data
      toast.success('Task status updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update task');
    }
  });

  const toggleTaskComplete = (id: string, e: React.MouseEvent, currentCompleted: boolean) => {
    e.stopPropagation();
    updateTaskStatusMutation.mutate({ id, status: currentCompleted ? 'PENDING' : 'COMPLETED' });
  };

  // ---- Create Project Modal (API) ----
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  useQuickAddListener('project', () => setIsCreateProjectOpen(true));
  const [newProject, setNewProject] = useState({
    name: '', code: '', clientId: '', status: 'IN_PROGRESS', budget: '', contractValue: '', city: 'Mumbai', state: 'Maharashtra', description: '',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await api.get('/clients');
      return data?.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (projectData: Record<string, unknown>) => {
      const { data } = await api.post('/projects', projectData);
      return data.data;
    },
    onSuccess: () => {
      CacheManager.invalidateOnProject(queryClient);
      toast.success('Site project registered successfully!');
      setIsCreateProjectOpen(false);
      setNewProject({ name: '', code: '', clientId: '', status: 'IN_PROGRESS', budget: '', contractValue: '', city: 'Mumbai', state: 'Maharashtra', description: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to register project');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.code || !newProject.clientId) {
      toast.error('Please fill required fields (Name, Code, Client)');
      return;
    }
    createMutation.mutate({
      ...newProject,
      budget: Number(newProject.budget) || 0,
      contractValue: Number(newProject.contractValue) || 0,
      startDate: new Date(),
    });
  };

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError) {
    return <ErrorState error="Failed to synchronize dashboard data." onRetry={() => refetch()} />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 min-h-full font-sans">

      {/* =========================================== */}
      {/* ROW 2: Financial Cards + Overall Profit */}
      {/* =========================================== */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {finCardConfig.map((cfg) => {
          const Icon = cfg.icon;
          const value = kpis[cfg.key as keyof KpiState];
          return (
            <motion.div
              key={cfg.key}
              variants={fadeInUp}
              onClick={() => navigate(cfg.route)}
              className="clay-card-sm p-3 sm:p-4 cursor-pointer group flex flex-col justify-between min-h-[90px]"
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center ${cfg.iconColor} mb-2 shrink-0`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 leading-tight">{cfg.label}</div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 font-heading group-hover:text-[#7C6EF0] transition-colors truncate mt-0.5">
                  {formatCurrency(value)}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Overall Profit */}
        <motion.div
          variants={fadeInUp}
          onClick={() => navigate('/reports')}
          className="clay-card-sm p-3 sm:p-4 cursor-pointer group flex flex-col justify-between min-h-[90px]"
        >
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${overallProfit > 0 ? 'bg-clay-green text-[#5CB77E]' : overallProfit < 0 ? 'bg-clay-rose text-[#E5636C]' : 'bg-slate-100 text-slate-500'} mb-2 shrink-0`}>
            {overallProfit > 0 ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> : overallProfit < 0 ? <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" /> : <Minus className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 leading-tight">Overall Profit</div>
            <div className={`text-sm sm:text-lg font-extrabold font-heading ${overallProfit > 0 ? 'text-[#5CB77E]' : overallProfit < 0 ? 'text-[#E5636C]' : 'text-slate-500'} truncate mt-0.5`}>
              {formatCurrency(overallProfit)}
            </div>
          </div>
        </motion.div>

        {/* Personal Expenses (Admin Only) */}
        {user?.role === 'ADMIN' && (
          <motion.div
            variants={fadeInUp}
            onClick={() => navigate('/expenses')}
            className="clay-card-sm p-3 sm:p-4 cursor-pointer group flex flex-col justify-between min-h-[90px]"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-clay-rose flex items-center justify-center text-[#E5636C] mb-2 shrink-0">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 leading-tight">Personal Expenses</div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 font-heading group-hover:text-[#7C6EF0] transition-colors truncate mt-0.5">
                {formatCurrency(personalExpenseTotal)}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* =========================================== */}
      {/* ROW 4: Today's Tasks + Recent Leads + Activities */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's Tasks */}
        <div className="clay-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 font-heading">Today's Tasks</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/tasks')}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-clay-violet text-[#7C6EF0] hover:bg-violet-100 cursor-pointer" title="Go to Tasks">
                  <Plus className="w-4 h-4" />
                </button>
                <Link to="/tasks" className="text-xs font-bold text-[#7C6EF0] hover:underline">All</Link>
              </div>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-hide">
              {todayTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No tasks for today.</div>
              ) : (
                todayTasks.map((t: any) => (
                  <div key={t.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      t.completed ? 'bg-green-50/40 border-green-200/40 opacity-75' : 'bg-white/60 border-violet-100/30 hover:border-[#7C6EF0]/30'
                    }`}>
                    <div className="flex items-center gap-3">
                      <button onClick={(e: any) => toggleTaskComplete(t.id, e, !!t.completed)} className="flex-shrink-0 cursor-pointer disabled:opacity-50" disabled={updateTaskStatusMutation.isPending}>
                        {t.completed ? <CheckSquare className="w-4 h-4 text-[#5CB77E]" /> : <Square className="w-4 h-4 text-slate-300" />}
                      </button>
                      <div>
                        <div className={`text-xs font-bold font-heading ${t.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {t.time || '12:00 PM'}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                      t.priority === 'High' ? 'bg-clay-rose text-[#E5636C]' :
                      t.priority === 'Low' ? 'bg-clay-blue text-[#4EA8DE]' :
                      'bg-clay-amber text-[#F2A65A]'
                    }`}>{t.priority}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 text-center">
            <Link to="/tasks" className="text-xs font-bold text-[#7C6EF0] hover:underline">Open Task Directory</Link>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="clay-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 font-heading">Recent Leads</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/leads')}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-clay-violet text-[#7C6EF0] hover:bg-violet-100 cursor-pointer" title="Go to Leads">
                  <Plus className="w-4 h-4" />
                </button>
                <Link to="/leads" className="text-xs font-bold text-[#7C6EF0] hover:underline">All</Link>
              </div>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-hide">
              {leads.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No leads added yet.</div>
              ) : (
                leads.map((lead: any) => (
                  <div key={lead.id} onClick={() => navigate('/leads')}
                    className="py-2.5 px-3 rounded-xl bg-white/60 border border-violet-100/30 hover:border-[#7C6EF0]/30 flex items-center justify-between transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C6EF0] to-[#A78BFA] text-white font-bold flex items-center justify-center text-xs shrink-0 font-heading">
                        {lead.name[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 font-heading">{lead.name}</div>
                        <div className="text-[11px] text-slate-400">{lead.city}</div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {lead.stage && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase ${lead.badge}`}>
                          {lead.stage}
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400">{lead.date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 text-center">
            <Link to="/leads" className="text-xs font-bold text-[#7C6EF0] hover:underline">Open CRM Leads Hub</Link>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="clay-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 font-heading">Recent Activities</h3>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-hide">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No recent activities.</div>
              ) : (
                activities.map((act: any) => (
                  <div key={act.id} className="p-3 rounded-xl bg-white/60 border border-violet-100/30 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-clay-violet flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#7C6EF0]">{act.type.slice(0, 2)}</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 font-heading">{act.desc}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{act.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 text-center">
            <span className="text-xs font-bold text-slate-400">System Activity Log</span>
          </div>
        </div>
      </div>

      {/* =========================================== */}
      {/* ROW 1: Five KPI Cards — Mobile Grid */}
      {/* =========================================== */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {kpiCardConfig.map((cfg) => {
          const Icon = cfg.icon;
          const value = kpis[cfg.key as keyof KpiState];
          return (
            <motion.div
              key={cfg.key}
              variants={fadeInUp}
              {...clayCardHover}
              onClick={() => navigate(cfg.route)}
              className={`clay-card p-4 cursor-pointer group flex flex-col justify-between min-h-[110px]`}
            >
              <div className={`w-10 h-10 rounded-xl ${cfg.gradient} flex items-center justify-center ${cfg.iconColor} mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="mt-1">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">{cfg.label}</span>
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading group-hover:text-[#7C6EF0] transition-colors mt-0.5 block truncate">
                  {cfg.isMoney ? formatCurrency(value) : value}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* =========================================== */}
      {/* MIDDLE ROW: Active Sites + Reminders */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Sites Progress */}
        <motion.div variants={fadeInUp} initial="hidden" animate="show" className="lg:col-span-2 clay-card p-5">
          <div className="flex items-center justify-between border-b border-slate-100/60 pb-3 mb-4">
            <h3 className="text-base font-bold text-slate-800 font-heading">Active Sites</h3>
            <Link to="/sites" className="text-xs font-bold text-[#7C6EF0] hover:underline">View All</Link>
          </div>
          <div className="space-y-2.5">
            {sites.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No sites added yet.</div>
            ) : (
              sites.map((site: any, index: number) => (
                <div key={site.id} onClick={() => navigate('/site-profit-loss')}
                  className="p-3 rounded-xl bg-white/60 border border-violet-100/40 hover:border-[#7C6EF0]/30 transition-all cursor-pointer flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-clay-violet flex items-center justify-center text-[#7C6EF0] shrink-0">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-800 group-hover:text-[#7C6EF0] transition-colors font-heading truncate">{site.name}</div>
                      <span className="font-semibold text-xs truncate" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>{site.location}</span>
                    </div>
                  </div>
                  <div className="text-right min-w-[100px] space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                      <span>Progress</span>
                      <span className="text-[#7C6EF0] font-heading">{site.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-violet-100/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#7C6EF0] to-[#A78BFA] rounded-full transition-all" style={{ width: `${site.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => navigate('/sites')}
            className="w-full mt-4 py-2.5 rounded-xl border border-dashed border-[#7C6EF0]/30 bg-clay-violet hover:bg-violet-100/50 text-[#7C6EF0] text-xs font-bold transition-all flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer">
            <Plus className="w-4 h-4" /> Go to Sites
          </button>
        </motion.div>

        {/* Upcoming Reminders */}
        <motion.div variants={fadeInUp} initial="hidden" animate="show" className="clay-card p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-heading">Upcoming Reminders</h3>
                <p className="text-[11px] text-slate-400">Scheduled meetings & site checks</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/calendar')}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-clay-violet text-[#7C6EF0] hover:bg-violet-100 cursor-pointer" title="Go to Calendar">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 scrollbar-hide">
              {remindersList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No upcoming reminders.</div>
              ) : (
                remindersList.map((rem: any) => (
                  <div key={rem.id} onClick={() => navigate('/calendar')}
                    className="p-3 rounded-xl bg-white/60 border border-violet-100/40 hover:border-[#7C6EF0]/30 transition-all cursor-pointer flex items-start gap-2.5 group">
                    <div className="w-8 h-8 rounded-lg bg-clay-violet text-[#7C6EF0] flex items-center justify-center shrink-0 mt-0.5">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-[#7C6EF0] transition-colors font-heading">{rem.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{rem.dateStr}</div>
                      <span className="text-[10px] font-bold text-[#7C6EF0] bg-clay-violet px-1.5 py-0.5 rounded mt-1 inline-block">{rem.tag}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 text-center">
            <Link to="/calendar" className="text-xs font-bold text-[#7C6EF0] hover:underline flex items-center justify-center gap-1">
              Open Calendar <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* =========================================== */}
      {/* CHARTS ROW: Expenses + Payment Mode + Site P/L */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Expense by Category */}
        {user?.role !== 'ENGINEER' && (
        <div className="clay-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 font-heading">Expenses by Category</h3>
              <button onClick={() => navigate('/expenses')}
                className="clay-btn px-3 py-1.5 text-xs flex items-center gap-1">
                View
              </button>
            </div>
            <div className="flex items-center justify-center py-3">
              <div className="w-36 h-36 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseCategories} dataKey="amount" innerRadius={50} outerRadius={70}
                      paddingAngle={expenseCategories.length === 1 ? 0 : 5} stroke="none">
                      {expenseCategories.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] text-slate-400 font-semibold">Total</span>
                  <span className="text-sm font-extrabold text-slate-800 font-heading">{formatCurrency(totalExpCatAmount)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">
              {expenseCategories.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">No expense categories yet.</div>
              ) : (
                expenseCategories.map((cat: any, index: number) => {
                  const pct = totalExpCatAmount > 0 ? Math.round((cat.amount / totalExpCatAmount) * 100) : 0;
                  return (
                    <div key={cat.id} className="flex items-center justify-between text-xs font-semibold p-2.5 rounded-xl bg-white/60 border border-violet-100/30">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /> {cat.name} ({pct}%)
                      </span>
                      <span className="font-heading font-bold text-slate-800">{formatCurrency(cat.amount)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 text-center">
            <Link to="/expenses" className="text-xs font-bold text-[#7C6EF0] hover:underline">View Expense Ledger</Link>
          </div>
        </div>
        )}

        {/* Payment Mode Summary */}
        {user?.role !== 'ENGINEER' && (
        <div className="clay-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 font-heading">Payment Modes</h3>
            </div>
            <div className="flex items-center justify-center py-3">
              <div className="w-36 h-36 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentModes} dataKey="amount" innerRadius={50} outerRadius={70}
                      paddingAngle={paymentModes.length === 1 ? 0 : 5} stroke="none">
                      {paymentModes.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] text-slate-400 font-semibold">Total</span>
                  <span className="text-sm font-extrabold text-slate-800 font-heading">{formatCurrency(totalPaymentModeAmount)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">
              {paymentModes.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">No payment modes yet.</div>
              ) : (
                paymentModes.map((pm: any, index: number) => (
                  <div key={pm.id} className="flex items-center justify-between text-xs font-semibold p-2.5 rounded-xl bg-white/60 border border-violet-100/30">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-slate-600">{pm.mode} ({pm.pct}%)</span>
                    </div>
                    <span className="font-heading font-bold text-slate-800">{formatCurrency(pm.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 text-center">
            <span className="text-[11px] text-slate-400">Payment mode totals (this month)</span>
          </div>
        </div>
        )}

        {/* Site-wise Profit/Loss */}
        <div className="clay-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 font-heading">Site P&L</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-clay-violet text-[#7C6EF0]">This Month</span>
            </div>
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-hide">
              {sites.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No sites added yet.</div>
              ) : (
                sites.map((site: any) => {
                  const profit = site.income - site.expense;
                  return (
                    <div key={site.id} onClick={() => navigate('/site-profit-loss')}
                      className="p-3 rounded-xl bg-white/60 border border-violet-100/30 hover:border-[#7C6EF0]/30 transition-all cursor-pointer">
                      <div className="text-sm font-bold text-slate-800 font-heading mb-2">{site.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-slate-400 font-medium">Income</div>
                          <div className="font-bold font-heading text-[#5CB77E]">{formatCurrency(site.income)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">Expense</div>
                          <div className="font-bold font-heading text-[#E5636C]">{formatCurrency(site.expense)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">Profit</div>
                          <div className={`font-bold font-heading ${profit >= 0 ? 'text-[#5CB77E]' : 'text-[#E5636C]'}`}>
                            {formatCurrency(profit)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 text-center">
            <Link to="/site-profit-loss" className="text-xs font-bold text-[#7C6EF0] hover:underline">Detailed Analysis</Link>
          </div>
        </div>
      </div>

      {/* =========================================== */}
      {/* ANALYTICS ROW: Outstanding Ledgers */}
      {/* =========================================== */}
      {user?.role !== 'ENGINEER' && (
      <div className="grid grid-cols-1 gap-4">
        {/* Outstanding Ledgers */}
        <div className="clay-card p-5 border-l-4 border-l-[#7C6EF0] flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100/60 pb-3 mb-4">
            <h3 className="text-base font-bold text-slate-800 font-heading">Outstanding Ledgers</h3>
            <Link to="/clients" className="text-xs font-bold text-[#7C6EF0] hover:underline">View All Clients</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto scrollbar-hide pr-1">
            {topOutstandingClients.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs col-span-full">No outstanding balances.</div>
            ) : (
              topOutstandingClients.map((client: any) => (
                <div key={client.id} className="p-4 rounded-xl bg-white/60 border border-violet-100/40 flex flex-col justify-between gap-2 shadow-xs hover:border-[#7C6EF0]/30 transition-all cursor-pointer" onClick={() => navigate(`/clients`)}>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate font-heading">{client.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{client.companyName || 'Private Client'}</div>
                  </div>
                  <div className="text-left mt-2 border-t border-slate-100/60 pt-2">
                    <div className="text-xs text-slate-400 font-medium mb-0.5">Pending Amount</div>
                    <div className="text-sm font-bold text-[#E5636C] font-heading">
                      ₹{(client.outstanding || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {/* =========================================== */}
      {/* ACTIVITY FEED */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 mt-4">
        <motion.div variants={fadeInUp} initial="hidden" animate="show" className="clay-card p-5">
          <div className="flex items-center justify-between border-b border-slate-100/60 pb-3 mb-4">
            <h3 className="text-base font-bold text-slate-800 font-heading">Today's Activities</h3>
            <span className="text-xs font-bold text-slate-400">Live Feed</span>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {todayActivities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No activities recorded today yet.</div>
            ) : (
              todayActivities.map((act: any) => (
                <div key={act.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:border-[#7C6EF0]/30 transition-colors">
                      {act.type === 'EXPENSE' && <Banknote className="w-4 h-4 text-[#E5636C]" />}
                      {act.type === 'INCOME' && <IndianRupee className="w-4 h-4 text-[#5CB77E]" />}
                      {act.type === 'CLIENT' && <Users className="w-4 h-4 text-[#4EA8DE]" />}
                      {act.type === 'LEAD' && <Activity className="w-4 h-4 text-[#F2A65A]" />}
                      {act.type === 'TASK' && <CheckSquare className="w-4 h-4 text-[#7C6EF0]" />}
                    </div>
                    <div className="w-px h-full bg-slate-100 mt-2" />
                  </div>
                  <div className="bg-white/60 p-3 rounded-xl border border-violet-100/40 w-full mb-2 group-hover:border-[#7C6EF0]/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{act.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {act.amount !== undefined && (
                        <div className={`text-sm font-bold ${act.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {act.type === 'INCOME' ? '+' : '-'}₹{(act.amount || 0).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* MODALS                                       */}
      {/* ============================================ */}

      {/* Create Project Modal */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="clay-card w-full max-w-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Register New Project</h3>
              <button onClick={() => setIsCreateProjectOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Project Code *</label>
                  <input type="text" required placeholder="e.g. PROJ-MUM-05" value={newProject.code}
                    onChange={(e: any) => setNewProject({ ...newProject, code: e.target.value.toUpperCase() })}
                    className="clay-input w-full px-3 py-2 text-sm font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Client *</label>
                  <AutocompleteInput
                    value={newProject.clientId}
                    onChange={(val: string) => setNewProject({ ...newProject, clientId: val })}
                    options={(clients as any[]).map(c => ({ id: c.id, name: `${c.name} (${c.companyName || 'Corporate'})` }))}
                    placeholder="Search Client..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Project Name *</label>
                <input type="text" required placeholder="e.g. Skyline Residency Tower A" value={newProject.name}
                  onChange={(e: any) => setNewProject({ ...newProject, name: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm font-semibold" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Contract Value (INR)</label>
                  <input type="number" placeholder="150000000" value={newProject.contractValue}
                    onChange={(e: any) => setNewProject({ ...newProject, contractValue: e.target.value })}
                    className="clay-input w-full px-3 py-2 text-sm font-semibold font-heading" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Budget (INR)</label>
                  <input type="number" placeholder="120000000" value={newProject.budget}
                    onChange={(e: any) => setNewProject({ ...newProject, budget: e.target.value })}
                    className="clay-input w-full px-3 py-2 text-sm font-semibold font-heading" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100/60">
                <button type="button" onClick={() => setIsCreateProjectOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending}
                  className="clay-btn px-5 py-2 text-sm disabled:opacity-50">Register Project</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
