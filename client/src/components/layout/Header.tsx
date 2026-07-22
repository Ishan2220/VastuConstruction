import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Menu,
  Search,
  Plus,
  Bell,
  Calendar,
  LogOut,
  Settings,
  User,
  ArrowLeft,
  Building2,
  HardHat,
  PackageCheck,
  IndianRupee,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Briefcase,
  Layers,
  Check,
  CheckSquare,
  X,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn, getInitials, formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard Control Tower',
  '/leads': 'Leads & CRM Tenders',
  '/projects': 'Construction Projects & Timeline',
  '/sites': 'Site Operations',
  '/expenses': 'Expenses & Outflow Ledger',
  '/income': 'Income & Client Billing',
  '/accounts': 'Accounting & Ledger',
  '/materials': 'Material Management & Inventory',
  '/vendors': 'Vendor Agencies Directory',
  '/labour': 'Site Labour & Muster Roll',
  '/clients': 'Client Contracts Directory',
  '/documents': 'Document Vault & Blueprints',
  '/reports': 'Executive Reports & Telemetry',
  '/calendar': 'Master Construction Schedule',
  '/tasks': 'Engineering Tasks & Deadlines',
  '/employees': 'Staff & Field Engineers',
  '/settings': 'System Settings & Profile',
  '/audit-logs': 'Security Audit & Compliance Logs',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/projects/')) return 'Project Site Details & Daily Logs';
  const base = '/' + pathname.split('/')[1];
  return pageTitles[base] ?? 'Enterprise Module';
}

export default function Header() {
  const { setSidebarMobileOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data.data || { data: [], unreadCount: 0 };
    },
    refetchInterval: 30000,
  });

  const { data: globalSearchResults = [] } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: async () => {
      if (!isSearchOpen || searchQuery.trim().length < 2) return [];
      const { data } = await api.get(`/search?query=${encodeURIComponent(searchQuery)}`);
      return data.data || [];
    },
    enabled: isSearchOpen && searchQuery.trim().length >= 2,
  });

  const notifications = Array.isArray(notifData?.data) ? notifData.data : (Array.isArray(notifData) ? notifData : []);
  const unreadNotifications = typeof notifData?.unreadCount === 'number' ? notifData.unreadCount : notifications.filter((n: any) => !n.isRead).length;

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const pageTitle = getPageTitle(location.pathname);
  const isDashboard = location.pathname === '/';

  const baseNavItems = [
    { title: 'Dashboard Control Tower', category: 'MODULE', link: '/', icon: Building2 },
    { title: 'Construction Projects & Timeline', category: 'MODULE', link: '/projects', icon: Building2 },
    { title: 'Material Management & Inventory', category: 'MODULE', link: '/materials', icon: PackageCheck },
    { title: 'Site Operations & Progress', category: 'MODULE', link: '/sites', icon: HardHat },
    { title: 'Site Labour & Muster Roll', category: 'MODULE', link: '/labour', icon: HardHat },
    { title: 'Income & Client Billing Ledger', category: 'MODULE', link: '/income', icon: IndianRupee },
    { title: 'Expenses & Outflow Ledger', category: 'MODULE', link: '/expenses', icon: IndianRupee },
    { title: 'Master Construction Schedule', category: 'MODULE', link: '/calendar', icon: Calendar },
    { title: 'Document Vault & Blueprints', category: 'MODULE', link: '/documents', icon: FileText },
    { title: 'Engineering Tasks Checklist', category: 'MODULE', link: '/tasks', icon: CheckCircle2 },
    { title: 'Employees & Workforce', category: 'MODULE', link: '/employees', icon: Users },
    { title: 'Salary Payments', category: 'MODULE', link: '/salaries', icon: IndianRupee },
    { title: 'Client Directory', category: 'MODULE', link: '/clients', icon: Users },
    { title: 'Vendor Directory', category: 'MODULE', link: '/vendors', icon: PackageCheck },
    { title: 'Invoices & Billing', category: 'MODULE', link: '/invoices', icon: FileText },
    { title: 'System Settings & Configuration', category: 'MODULE', link: '/settings', icon: Settings },
    { title: 'Audit Logs & Security Compliance', category: 'MODULE', link: '/audit-logs', icon: Layers },
  ];

  const dynamicGlobalItems = (Array.isArray(globalSearchResults) ? globalSearchResults : []).map((res: any) => ({
    title: res.title,
    subtitle: res.subtitle,
    category: res.type.toUpperCase(),
    link: getLinkForType(res.type, res.id),
    icon: getIconForType(res.type),
  }));

  const filteredBaseNav = searchQuery.trim().length >= 2 
    ? baseNavItems.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : baseNavItems.slice(0, 7);

  const filteredSearch = searchQuery.trim().length < 2
    ? filteredBaseNav
    : [...dynamicGlobalItems, ...filteredBaseNav];

  function getLinkForType(type: string, id: string) {
    switch (type) {
      case 'Project': return `/projects/${id}`;
      case 'Client': return `/clients`;
      case 'Vendor': return `/vendors`;
      case 'Employee': return `/employees`;
      case 'Invoice': return `/invoices`;
      case 'Purchase Order': return `/purchase-orders`;
      default: return `/`;
    }
  }

  function getIconForType(type: string) {
    switch (type) {
      case 'Project': return Building2;
      case 'Client': return User;
      case 'Vendor': return PackageCheck;
      case 'Employee': return Briefcase;
      case 'Invoice': return FileText;
      case 'Purchase Order': return PackageCheck;
      default: return Search;
    }
  }

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, isSearchOpen]);

  // Keyboard shortcuts and arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      } else if (isSearchOpen && filteredSearch.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredSearch.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredSearch.length) % filteredSearch.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = filteredSearch[selectedIndex] || filteredSearch[0];
          if (selected) {
            setIsSearchOpen(false);
            setSearchQuery('');
            navigate(selected.link);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, filteredSearch, selectedIndex, navigate]);

  // Click outside handler for Quick Add dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#quick-add-dropdown') && !target.closest('#quick-add-btn')) {
        setIsQuickAddOpen(false);
      }
    };
    if (isQuickAddOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isQuickAddOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-violet-100/30 bg-white/70 px-4 backdrop-blur-xl md:px-6">
        {/* Left: Mobile menu + Back button + Page title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarMobileOpen(true)}
            className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-[#7C6EF0] lg:hidden transition-colors shrink-0"
            title="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Universal Back Button whenever not on Dashboard */}
          {!isDashboard && (
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50/50 hover:bg-violet-100/50 text-slate-600 font-bold text-xs transition-all border border-violet-100/40 shrink-0"
              title="Go back to previous screen or dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#7C6EF0]" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight font-heading truncate">{pageTitle}</h1>
              {!isDashboard && (
                <span className="hidden sm:inline-flex shrink-0 items-center text-[10px] font-bold px-2 py-0.5 rounded-lg bg-clay-violet text-[#7C6EF0] uppercase tracking-wider">
                  Live
                </span>
              )}
            </div>
            {isDashboard && (
              <p className="text-xs text-slate-400 hidden sm:block truncate">
                Welcome back, <strong className="text-slate-600">{user?.name || 'User'}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Center: Search Trigger Input */}
        <div className="hidden max-w-md flex-1 md:block">
          <div
            onClick={() => setIsSearchOpen(true)}
            className="relative cursor-pointer group"
          >
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-hover:text-[#7C6EF0] transition-colors" />
            <div
              className={cn(
                "flex items-center justify-between h-10 w-full rounded-xl border border-violet-100/40 bg-white/50 pl-10 pr-3 text-sm text-slate-400",
                "group-hover:border-[#7C6EF0]/30 group-hover:bg-white group-hover:shadow-xs transition-all duration-200"
              )}
            >
              <span>Search projects, materials, labour, or logs...</span>
              <kbd className="rounded-md border border-violet-100/40 bg-white/80 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 group-hover:text-[#7C6EF0] group-hover:border-[#7C6EF0]/20">
                Ctrl+K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Quick Add Menu, Calendar, Notifications, User Admin Account */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Mobile Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="rounded-xl p-1.5 sm:p-2 text-slate-400 hover:bg-violet-50 hover:text-[#7C6EF0] md:hidden transition-colors shrink-0"
            title="Search Platform"
          >
            <Search className="h-5 w-5" />
          </button>
          {/* Quick Add Dropdown */}
          <div className="relative shrink-0">
            <button 
              id="quick-add-btn"
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="sm:gap-1.5 rounded-xl bg-gradient-to-r from-[#7C6EF0] to-[#6558D3] text-xs font-bold text-white hover:opacity-90 shadow-sm transition-all cursor-pointer p-2 sm:px-3.5 sm:py-2 inline-flex items-center justify-center shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Add</span>
            </button>
            {isQuickAddOpen && (
              <div id="quick-add-dropdown" className="absolute right-0 top-full mt-2 w-64 max-w-[85vw] p-2 clay-card z-50 flex flex-col gap-0.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
                  Create New Entry
                </div>
                <div className="h-px bg-violet-100/30 my-1" />
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    navigate('/projects', { state: { action: 'create' } });
                    setTimeout(() => window.dispatchEvent(new CustomEvent('quick-add-create', { detail: 'project' })), 100);
                  }}
                  className="w-full flex items-center rounded-xl p-2.5 font-semibold text-slate-600 hover:bg-violet-50 hover:text-[#7C6EF0] transition-colors text-sm text-left"
                >
                  <Building2 className="mr-2.5 h-4 w-4 text-indigo-500 shrink-0" />
                  <span>+ Add Site Project</span>
                </button>
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    navigate('/expenses', { state: { action: 'create' } });
                    setTimeout(() => window.dispatchEvent(new CustomEvent('quick-add-create', { detail: 'expense' })), 100);
                  }}
                  className="w-full flex items-center rounded-xl p-2.5 font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors text-sm text-left"
                >
                  <IndianRupee className="mr-2.5 h-4 w-4 text-rose-500 shrink-0" />
                  <span>+ Record Site Expense</span>
                </button>
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    navigate('/materials', { state: { action: 'create' } });
                    setTimeout(() => window.dispatchEvent(new CustomEvent('quick-add-create', { detail: 'material' })), 100);
                  }}
                  className="w-full flex items-center rounded-xl p-2.5 font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 transition-colors text-sm text-left"
                >
                  <PackageCheck className="mr-2.5 h-4 w-4 text-amber-500 shrink-0" />
                  <span>+ Order Material Stock</span>
                </button>
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    navigate('/labour', { state: { action: 'create' } });
                    setTimeout(() => window.dispatchEvent(new CustomEvent('quick-add-create', { detail: 'labour' })), 100);
                  }}
                  className="w-full flex items-center rounded-xl p-2.5 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm text-left"
                >
                  <HardHat className="mr-2.5 h-4 w-4 text-blue-500 shrink-0" />
                  <span>+ Check-in Labour Muster</span>
                </button>
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    navigate('/tasks', { state: { action: 'create' } });
                    setTimeout(() => window.dispatchEvent(new CustomEvent('quick-add-create', { detail: 'task' })), 100);
                  }}
                  className="w-full flex items-center rounded-xl p-2.5 font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors text-sm text-left"
                >
                  <CheckSquare className="mr-2.5 h-4 w-4 text-cyan-500 shrink-0" />
                  <span>+ Assign Engineering Task</span>
                </button>
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    navigate('/documents', { state: { action: 'create' } });
                    setTimeout(() => window.dispatchEvent(new CustomEvent('quick-add-create', { detail: 'document' })), 100);
                  }}
                  className="w-full flex items-center rounded-xl p-2.5 font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-600 transition-colors text-sm text-left"
                >
                  <FileText className="mr-2.5 h-4 w-4 text-violet-500 shrink-0" />
                  <span>+ Upload Blueprint / NOC</span>
                </button>
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    navigate('/leads', { state: { action: 'create' } });
                    setTimeout(() => window.dispatchEvent(new CustomEvent('quick-add-create', { detail: 'lead' })), 100);
                  }}
                  className="w-full flex items-center rounded-xl p-2.5 font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-sm text-left"
                >
                  <User className="mr-2.5 h-4 w-4 text-emerald-500 shrink-0" />
                  <span>+ Add Client Inquiry (Lead)</span>
                </button>
              </div>
            )}
          </div>

          {/* Calendar Navigation Button */}
          <button
            onClick={() => navigate('/calendar')}
            className={cn(
              "rounded-xl p-2.5 transition-all border shadow-2xs",
              location.pathname === '/calendar'
                ? "bg-clay-violet text-[#7C6EF0] border-[#7C6EF0]/20 font-bold"
                : "bg-white/60 text-slate-500 border-violet-100/40 hover:bg-violet-50 hover:text-[#7C6EF0]"
            )}
            title="Open Master Schedule & Milestones"
          >
            <Calendar className="h-4 w-4" />
          </button>

          {/* Notifications Bell Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="relative rounded-xl p-2.5 bg-white/60 border border-violet-100/40 text-slate-500 transition-all hover:bg-violet-50 hover:text-[#7C6EF0] cursor-pointer focus:outline-none inline-flex items-center justify-center"
              title="View Notifications & Alerts"
            >
              <Bell className="h-4 w-4 pointer-events-none" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse pointer-events-none">
                  {unreadNotifications}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-3 clay-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#7C6EF0]" /> Notifications
                </span>
                {unreadNotifications > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-[11px] font-bold text-[#7C6EF0] hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No notifications logged right now.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.isRead) markReadMutation.mutate(n.id);
                        if (n.linkUrl) navigate(n.linkUrl);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer space-y-1",
                        n.isRead
                          ? "bg-slate-50/60 border-violet-100/20 opacity-75"
                          : "bg-violet-50/40 border-violet-100/30 hover:bg-violet-50/60"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-1.5 truncate">
                          <AlertCircle className={cn("w-3.5 h-3.5 shrink-0", n.isRead ? "text-slate-400" : "text-[#7C6EF0]")} />
                          {n.title || 'System Notification'}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-snug">
                        {n.message || 'Updated project state.'}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 pt-2 text-center">
                <button
                  onClick={() => navigate('/audit-logs')}
                  className="text-xs font-bold text-slate-400 hover:text-[#7C6EF0] transition-colors inline-flex items-center gap-1"
                >
                  View All System Logs <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Admin Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="ml-1 shrink-0 flex items-center gap-2.5 rounded-xl p-1.5 transition-all bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-indigo-200 shadow-2xs cursor-pointer focus:outline-none"
              title="User Profile & Admin Options"
            >
              <Avatar className="h-8 w-8 border border-violet-200/40 rounded-lg pointer-events-none">
                <AvatarFallback className="bg-gradient-to-br from-[#7C6EF0] to-[#A78BFA] text-xs font-bold text-white rounded-lg pointer-events-none">
                  {getInitials(user?.name || 'User')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block pr-1">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'User'}</p>
                <p className="text-[10px] font-semibold text-[#7C6EF0] uppercase tracking-wider">
                  {user?.role ?? 'ADMIN'}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-2 clay-card">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">{user?.name || 'User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-clay-violet text-[#7C6EF0]">
                  <Sparkles className="w-3 h-3 text-[#7C6EF0]" /> Admin
                </div>
              </div>

              <DropdownMenuItem
                onClick={() => navigate('/')}
                className="cursor-pointer rounded-xl p-2.5 font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 transition-colors"
              >
                <Building2 className="mr-2.5 h-4 w-4 text-slate-500" />
                <span>Dashboard Control Tower</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate('/settings')}
                className="cursor-pointer rounded-xl p-2.5 font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 transition-colors"
              >
                <User className="mr-2.5 h-4 w-4 text-slate-500" />
                <span>Executive Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate('/settings')}
                className="cursor-pointer rounded-xl p-2.5 font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 transition-colors"
              >
                <Settings className="mr-2.5 h-4 w-4 text-slate-500" />
                <span>Platform Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="cursor-pointer rounded-xl p-2.5 font-bold text-rose-600 hover:bg-rose-50 focus:bg-rose-50 transition-colors"
              >
                <LogOut className="mr-2.5 h-4 w-4 text-rose-500" />
                <span>Sign Out of Workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Interactive Search Command Modal (`Ctrl+K`) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-2xl overflow-hidden">
            {/* Search Input Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-violet-100/30 bg-white/60">
              <Search className="w-5 h-5 text-[#7C6EF0] mr-3 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type to search projects, inventory, tasks, or billing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 mr-2">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100 shrink-0"
              >
                ESC
              </button>
            </div>

            {/* Results Body */}
            <div className="p-3 max-h-96 overflow-y-auto space-y-2 divide-y divide-slate-100/60">
              {filteredSearch.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm space-y-1">
                  <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600">No matching records found for "{searchQuery}"</p>
                  <p className="text-xs">Try searching for "project", "cement", "labour", or "income"</p>
                </div>
              ) : (
                <>
                  <div className="px-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {searchQuery ? `Search Results (${filteredSearch.length})` : 'Quick Jump & Modules'}
                  </div>
                  {filteredSearch.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={item.title + idx}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate(item.link);
                        }}
                        className={cn(
                          "p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer group",
                          isSelected ? "bg-violet-50 border border-[#7C6EF0]/20" : "hover:bg-violet-50/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                            isSelected ? "bg-[#7C6EF0] text-white" : "bg-clay-violet text-[#7C6EF0] group-hover:bg-[#7C6EF0] group-hover:text-white"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className={cn("text-sm font-bold transition-colors", isSelected ? "text-[#7C6EF0]" : "text-slate-700 group-hover:text-[#7C6EF0]")}>{item.title}</div>
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.category}</div>
                          </div>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 transition-all", isSelected ? "text-[#7C6EF0] translate-x-1" : "text-slate-300 group-hover:text-[#7C6EF0] group-hover:translate-x-1")} />
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Use <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono">↓</kbd> to navigate or click to open</span>
              <span className="text-[#7C6EF0] font-bold">VastuConstruction</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
