import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  HardHat,
  IndianRupee,
  Calendar as CalendarIcon,
  Clock,
  ArrowUpRight,
  ChevronRight,
  PlusCircle,
  Plus,
  BarChart3,
  Users,
  Pencil,
  Trash2,
  Activity,
  Wallet,
  Bell,
  CheckSquare,
  Square,
  Edit3,
  X,
  Landmark,
  AlertCircle,
  PackageCheck,
  FileText,
} from 'lucide-react';
import { CacheManager } from '@/lib/CacheManager';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';

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

const defaultSites: SiteItem[] = [];

const EXPENSE_COLORS = ['bg-indigo-600', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-violet-600', 'bg-blue-600', 'bg-cyan-500', 'bg-pink-500'];
const PM_COLORS = ['bg-indigo-600', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-600', 'bg-blue-600', 'bg-cyan-500'];
const PM_TEXT_COLORS = ['text-indigo-600', 'text-emerald-600', 'text-amber-600', 'text-violet-600', 'text-blue-600', 'text-cyan-600'];
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
    refetchInterval: 300000, // 5 minutes
  });

  const kpis: KpiState = useMemo(() => {
    if (!serverDashboard?.kpis) return defaultKpis;
    return {
      totalLeads: serverDashboard.kpis.leadCount || 0,
      activeProjects: serverDashboard.kpis.activeProjectCount || 0,
      activeSites: serverDashboard.kpis.activeSiteCount || 0,
      monthlyIncome: Number(serverDashboard.kpis.monthlyIncome) || 0,
      monthlyExpenses: Number(serverDashboard.kpis.monthlyExpense) || 0,
      cashInHand: Number(serverDashboard.kpis.cashInHand) || 0,
      bankBalance: Number(serverDashboard.kpis.bankBalance) || 0,
      clientReceivable: Number(serverDashboard.kpis.clientReceivable) || 0,
      vendorPayable: Number(serverDashboard.kpis.vendorPayable) || 0,
    };
  }, [serverDashboard]);

  const openKpiEdit = () => {};
  const overallProfit = kpis.monthlyIncome - kpis.monthlyExpenses;

  
  // ---- Dashboard Data Mappings (No Mock States) ----
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
      color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length]
    }));
  }, [serverDashboard]);
  const totalExpCatAmount = expenseCategories.reduce((s: number, c: any) => s + c.amount, 0);

  const paymentModes = useMemo(() => {
    if (!serverDashboard?.paymentModeSummary) return [];
    const pmData = serverDashboard.paymentModeSummary.map((pm: any, idx: number) => ({
      id: String(idx),
      mode: pm.paymentMethod,
      amount: Number(pm._sum?.amount) || 0,
      pct: 0,
      color: PM_COLORS[idx % PM_COLORS.length],
      text: PM_TEXT_COLORS[idx % PM_TEXT_COLORS.length]
    }));
    const total = pmData.reduce((s: number, p: any) => s + p.amount, 0) || 1;
    return pmData.map((pm: any) => ({ ...pm, pct: Math.round((pm.amount / total) * 100) }));
  }, [serverDashboard]);
  const totalPaymentModeAmount = paymentModes.reduce((s: number, pm: any) => s + pm.amount, 0);

  const activities = useMemo(() => {
    if (!serverDashboard?.recentActivities) return [];
    return serverDashboard.recentActivities.map((a: any) => ({
      id: a.id,
      desc: `${a.user?.name || 'System'} ${a.action === 'CREATE' ? 'created' : a.action === 'DELETE' ? 'deleted' : 'updated'} ${a.entity}`,
      time: new Date(a.createdAt).toLocaleString(),
      type: 'PAYMENT'
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

  const toggleTaskComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info('Status updates should be done in Tasks module');
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
  const cardBase = 'bg-white rounded-2xl border border-slate-200/80 shadow-sm';
  const modalOverlay = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm';
  const modalInner = 'bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6';
  const inputCls = 'w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const btnCancel = 'px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold';
  const btnSave = 'px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md disabled:opacity-50';

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="h-80 bg-slate-200 rounded-2xl col-span-2"></div>
           <div className="h-80 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500">
        <p className="mb-4 text-sm font-semibold">Failed to synchronize dashboard data.</p>
        <button onClick={() => refetch()} className="px-5 py-2 bg-indigo-600 font-bold text-white rounded-xl shadow-sm hover:bg-indigo-700 transition">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 bg-slate-50 min-h-full font-sans">

      {/* =========================================== */}
      {/* ROW 1: Five KPI Cards */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Leads */}
        <motion.div whileHover={{ y: -3 }} onClick={() => navigate('/leads')}
          className={`${cardBase} p-5 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Leads</span>
            <span className="text-2xl font-extrabold text-slate-900 font-heading group-hover:text-indigo-600 transition-colors">
              {kpis.totalLeads}
            </span>
          </div>
        </motion.div>

        {/* Active Projects */}
        <motion.div whileHover={{ y: -3 }} onClick={() => navigate('/projects')}
          className={`${cardBase} p-5 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e: any) => { e.stopPropagation(); setIsCreateProjectOpen(true); }}
                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all" title="Add New Project">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Projects</span>
            <span className="text-2xl font-extrabold text-slate-900 font-heading group-hover:text-emerald-600 transition-colors">
              {kpis.activeProjects}
            </span>
          </div>
        </motion.div>

        {/* Active Sites */}
        <motion.div whileHover={{ y: -3 }} onClick={() => navigate('/sites')}
          className={`${cardBase} p-5 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <HardHat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Sites</span>
            <span className="text-2xl font-extrabold text-slate-900 font-heading group-hover:text-amber-600 transition-colors">
              {kpis.activeSites}
            </span>
          </div>
        </motion.div>

        {/* Monthly Income */}
        <motion.div whileHover={{ y: -3 }} onClick={() => navigate('/income')}
          className={`${cardBase} p-5 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Income</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono group-hover:text-emerald-600 transition-colors">
              {formatCurrency(kpis.monthlyIncome)}
            </span>
          </div>
        </motion.div>

        {/* Monthly Expenses */}
        <motion.div whileHover={{ y: -3 }} onClick={() => navigate('/expenses')}
          className={`${cardBase} p-5 hover:shadow-md hover:border-rose-300 transition-all cursor-pointer group flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Expenses</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono group-hover:text-rose-600 transition-colors">
              {formatCurrency(kpis.monthlyExpenses)}
            </span>
          </div>
        </motion.div>
      </div>

      {/* =========================================== */}
      {/* ROW 2: Five Financial Cards */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Cash in Hand */}
        <div onClick={() => navigate('/accounts')}
          className={`${cardBase} p-4 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between gap-3 group`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Cash in Hand</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono group-hover:text-emerald-600 transition-colors">
                {formatCurrency(kpis.cashInHand)}
              </div>
            </div>
          </div>
        </div>

        {/* Bank Balance */}
        <div onClick={() => navigate('/accounts')}
          className={`${cardBase} p-4 hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between gap-3 group`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Bank Balance</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono group-hover:text-indigo-600 transition-colors">
                {formatCurrency(kpis.bankBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* Client Receivable */}
        <div onClick={() => navigate('/clients')}
          className={`${cardBase} p-4 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between gap-3 group`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Client Receivable</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono group-hover:text-blue-600 transition-colors">
                {formatCurrency(kpis.clientReceivable)}
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Payable */}
        <div onClick={() => navigate('/vendors')}
          className={`${cardBase} p-4 hover:border-violet-300 transition-all cursor-pointer flex items-center justify-between gap-3 group`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Vendor Payable</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono group-hover:text-violet-600 transition-colors">
                {formatCurrency(kpis.vendorPayable)}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Profit (Auto-calculated) */}
        <div onClick={() => navigate('/reports')}
          className={`${cardBase} p-4 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between gap-3 group`}>
          <div>
            <div className="text-xs font-semibold text-slate-500">Overall Profit (All Time)</div>
            <div className={`text-lg font-extrabold font-mono ${overallProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(overallProfit)}
            </div>
          </div>
          <div className={`w-12 h-8 flex items-center justify-center ${overallProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {overallProfit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* =========================================== */}
      {/* MIDDLE ROW: Active Sites Progress + Reminders */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Sites Progress (2 cols) */}
        <div className={`lg:col-span-2 ${cardBase} p-6`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-base font-bold text-slate-900 font-heading">Active Sites</h3>
            <Link to="/sites" className="text-xs font-bold text-indigo-600 hover:underline">View All</Link>
          </div>

          <div className="space-y-3">
            {sites.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No sites added yet. Click below to add one.</div>
            ) : (
              sites.map((site: any) => (
                <div key={site.id} onClick={() => navigate('/site-profit-loss')}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                      <HardHat className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors font-heading">{site.name}</div>
                      <div className="text-xs text-slate-500">{site.location}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right min-w-[100px] space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>Progress</span>
                        <span className="text-indigo-600 font-mono">{site.progress}%</span>
                      </div>
                      <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${site.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">

                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button onClick={() => navigate('/sites')}
            className="w-full mt-4 py-2.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Go to Sites
          </button>
        </div>

        {/* Right: Upcoming Reminders */}
        <div className={`${cardBase} p-6 flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Upcoming Reminders</h3>
                <p className="text-[11px] text-slate-400">Scheduled meetings and site checks</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/calendar')}
                  className="p-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer" title="Go to Calendar">
                  <Plus className="w-4 h-4" />
                </button>
                <Link to="/calendar" className="text-xs font-bold text-indigo-600 hover:underline">View All</Link>
              </div>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {remindersList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No upcoming reminders. Click "+" above to add.</div>
              ) : (
                remindersList.map((rem: any) => (
                  <div key={rem.id} onClick={() => navigate('/calendar')}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between gap-3 group">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors font-heading">{rem.title}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">{rem.dateStr}</div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">{rem.tag}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link to="/calendar" className="text-xs font-bold text-indigo-600 hover:underline flex items-center justify-center gap-1">
              Open Calendar <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================== */}
      {/* ALERTS ROW */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`md:col-span-3 ${cardBase} p-6 border-l-4 border-rose-500`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Critical System Alerts
            </h3>
            <div className="flex items-center gap-2">
              <Link to="/reports" className="text-xs font-bold text-rose-600 hover:underline">View All</Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Alert 1 */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <PackageCheck className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Material Shortage Detected</h4>
                <p className="text-xs text-amber-700 mt-1">Cement stock is critically low at 'Skyline Tower' site.</p>
                <button className="mt-2 text-[10px] font-bold px-2 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300">REVIEW INVENTORY</button>
              </div>
            </div>
            {/* Alert 2 */}
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <IndianRupee className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-rose-900">Client Payment Dues</h4>
                <p className="text-xs text-rose-700 mt-1">₹5,00,000 pending from 'Mahindra Dev' since 15 days.</p>
                <button className="mt-2 text-[10px] font-bold px-2 py-1 bg-rose-200 text-rose-800 rounded hover:bg-rose-300">SEND REMINDER</button>
              </div>
            </div>
            {/* Alert 3 */}
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <Users className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-rose-900">Labour Payment Dues</h4>
                <p className="text-xs text-rose-700 mt-1">Weekly payout pending for 45 workers at 'Riverside Villa'.</p>
                <button className="mt-2 text-[10px] font-bold px-2 py-1 bg-rose-200 text-rose-800 rounded hover:bg-rose-300">PROCESS PAYMENTS</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================== */}
      {/* ROW 3: Expense Categories + Payment Modes + Site P/L */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Expense by Category */}
        {user?.role !== 'ENGINEER' && (
        <div className={`${cardBase} p-6 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 font-heading">Expense by Category</h3>
              <button onClick={() => navigate('/expenses')}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold flex items-center gap-1 cursor-pointer">
                View
              </button>
            </div>

            {/* Donut ring */}
            <div className="flex items-center justify-center py-3">
              <div className="w-36 h-36 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      dataKey="amount"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={expenseCategories.length === 1 ? 0 : 5}
                      stroke="none"
                    >
                      {expenseCategories.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color.replace('bg-', '').includes('indigo') ? '#4f46e5' : entry.color.replace('bg-', '').includes('amber') ? '#f59e0b' : entry.color.replace('bg-', '').includes('emerald') ? '#10b981' : entry.color.replace('bg-', '').includes('rose') ? '#f43f5e' : entry.color.replace('bg-', '').includes('cyan') ? '#06b6d4' : '#6366f1'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-slate-400 font-semibold">Total</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">{formatCurrency(totalExpCatAmount)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 max-h-[200px] overflow-y-auto pr-1">
              {expenseCategories.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">No expense categories added yet.</div>
              ) : (
                expenseCategories.map((cat: any) => {
                  const pct = totalExpCatAmount > 0 ? Math.round((cat.amount / totalExpCatAmount) * 100) : 0;
                  return (
                    <div key={cat.id} className="flex items-center justify-between text-xs font-bold p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span className={`w-3 h-3 rounded-full ${cat.color}`} /> {cat.name} ({pct}%)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-900">{formatCurrency(cat.amount)}</span>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link to="/expenses" className="text-xs font-bold text-indigo-600 hover:underline">View Expense Ledger</Link>
          </div>
        </div>
        )}

        {/* Card 2: Payment Mode Summary */}
        {user?.role !== 'ENGINEER' && (
        <div className={`${cardBase} p-6 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 font-heading">Payment Mode Summary</h3>
            </div>

            <div className="flex items-center justify-center py-3">
              <div className="w-36 h-36 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentModes}
                      dataKey="amount"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={paymentModes.length === 1 ? 0 : 5}
                      stroke="none"
                    >
                      {paymentModes.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color.replace('bg-', '').includes('indigo') ? '#4f46e5' : entry.color.replace('bg-', '').includes('emerald') ? '#10b981' : entry.color.replace('bg-', '').includes('amber') ? '#f59e0b' : entry.color.replace('bg-', '').includes('violet') ? '#8b5cf6' : '#6366f1'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-slate-400 font-semibold">Total</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">{formatCurrency(totalPaymentModeAmount)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 max-h-[200px] overflow-y-auto pr-1">
              {paymentModes.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">No payment modes added yet.</div>
              ) : (
                paymentModes.map((pm: any) => (
                  <div key={pm.id} className="flex items-center justify-between text-xs font-bold p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${pm.color}`} />
                      <span className="text-slate-800">{pm.mode} ({pm.pct}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-900 font-extrabold">{formatCurrency(pm.amount)}</span>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 font-medium">Add or update payment mode totals</span>
          </div>
        </div>
        )}

        {/* Card 3: Site-wise Profit / Loss */}
        <div className={`${cardBase} p-6 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 font-heading">Site-wise Profit / Loss</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700">This Month</span>
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {sites.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No sites added yet.</div>
              ) : (
                sites.map((site: any) => {
                  const profit = site.income - site.expense;
                  return (
                    <div key={site.id} onClick={() => navigate('/site-profit-loss')}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-300 transition-all cursor-pointer">
                      <div className="text-sm font-bold text-slate-900 font-heading mb-2">{site.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-slate-400 font-medium">Income</div>
                          <div className="font-bold font-mono text-emerald-600">{formatCurrency(site.income)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">Expense</div>
                          <div className="font-bold font-mono text-rose-600">{formatCurrency(site.expense)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">Profit</div>
                          <div className={`font-bold font-mono ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link to="/site-profit-loss" className="text-xs font-bold text-indigo-600 hover:underline">View Detailed Analysis</Link>
          </div>
        </div>
      </div>

      {/* =========================================== */}
      {/* ROW 4: Recent Activities + Today's Tasks + Recent Leads */}
      {/* =========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">        {/* Card 2: Today's Tasks */}
        <div className={`${cardBase} p-6 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 font-heading">Today's Tasks</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/tasks')}
                  className="p-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer" title="Go to Tasks">
                  <Plus className="w-4 h-4" />
                </button>
                <Link to="/tasks" className="text-xs font-bold text-indigo-600 hover:underline">View All</Link>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {todayTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No tasks for today. Click "+" to schedule one.</div>
              ) : (
                todayTasks.map((t: any) => (
                  <div key={t.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      t.completed ? 'bg-emerald-50/50 border-emerald-200 opacity-75' : 'bg-slate-50 border-slate-100 hover:border-indigo-300'
                    }`}>
                    <div className="flex items-center gap-3">
                      <button onClick={(e: any) => toggleTaskComplete(t.id, e)} className="flex-shrink-0 cursor-pointer">
                        {t.completed ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                      <div>
                        <div className={`text-xs font-bold font-heading ${t.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {t.time || '12:00 PM'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        t.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        t.priority === 'Low' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>{t.priority}</span>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link to="/tasks" className="text-xs font-bold text-indigo-600 hover:underline">Open Task Directory</Link>
          </div>
        </div>

        {/* Card 3: Recent Leads */}
        <div className={`${cardBase} p-6 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 font-heading">Recent Leads</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/leads')}
                  className="p-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer" title="Go to Leads">
                  <Plus className="w-4 h-4" />
                </button>
                <Link to="/leads" className="text-xs font-bold text-indigo-600 hover:underline">View All</Link>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {leads.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No leads added yet. Click "+" to add one.</div>
              ) : (
                leads.map((lead: any) => (
                  <div key={lead.id} onClick={() => navigate('/leads')}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {lead.name[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 font-heading">{lead.name}</div>
                        <div className="text-[11px] text-slate-500">{lead.city}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right space-y-1">
                        {lead.stage && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${lead.badge}`}>
                            {lead.stage}
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">{lead.date}</div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">

                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link to="/leads" className="text-xs font-bold text-indigo-600 hover:underline">Open CRM Leads Hub</Link>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* MODALS                                       */}
      {/* ============================================ */}

      {/* Create Project Modal (API) */}
      {isCreateProjectOpen && (
        <div className={modalOverlay}>
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Register New Site Project</h3>
              <button onClick={() => setIsCreateProjectOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Project Code *</label>
                  <input type="text" required placeholder="e.g. PROJ-MUM-05" value={newProject.code}
                    onChange={(e: any) => setNewProject({ ...newProject, code: e.target.value.toUpperCase() })}
                    className={`${inputCls} font-mono`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Client Contract *</label>
                  <select required value={newProject.clientId}
                    onChange={(e: any) => setNewProject({ ...newProject, clientId: e.target.value })}
                    className={inputCls}>
                    <option value="">Select Client</option>
                    {(clients as any[]).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.companyName || 'Corporate'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Project Name *</label>
                <input type="text" required placeholder="e.g. Skyline Residency Tower A" value={newProject.name}
                  onChange={(e: any) => setNewProject({ ...newProject, name: e.target.value })}
                  className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Contract Value (INR)</label>
                  <input type="number" placeholder="150000000" value={newProject.contractValue}
                    onChange={(e: any) => setNewProject({ ...newProject, contractValue: e.target.value })}
                    className={`${inputCls} font-mono`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Estimated Budget (INR)</label>
                  <input type="number" placeholder="120000000" value={newProject.budget}
                    onChange={(e: any) => setNewProject({ ...newProject, budget: e.target.value })}
                    className={`${inputCls} font-mono`} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateProjectOpen(false)} className={btnCancel}>Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className={btnSave}>Register Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
