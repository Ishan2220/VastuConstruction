import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  ShieldCheck,
  ArrowLeft,
  Search,
  Users,
  CheckCircle2,
  Save,
  RotateCcw,
  Receipt,
  IndianRupee,
  History,
  Landmark,
  FileText,
  Truck,
  Package,
  Building2,
  CalendarCheck,
  UserCog,
  Calculator,
  BarChart3,
  ClipboardList,
  Database,
  Lock,
  ChevronRight,
  Info,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

// The 15 RBAC pages defined in App.tsx
export const AVAILABLE_PAGES = [
  'Expenses',
  'Income / Payments',
  'Payment History',
  'Accounts',
  'Vendors',
  'Attendance',
  'Clients',
  'Materials',
  'Purchase Orders',
  'Reports',
  'Employees',
  'Payroll Engine',
  'Invoices',
  'Audit Logs',
  'Storage Analytics'
] as const;

export type PageName = typeof AVAILABLE_PAGES[number];

interface PageMeta {
  name: PageName;
  category: 'Finance' | 'Procurement' | 'Workforce' | 'Administration';
  description: string;
  icon: React.ElementType;
  defaultRoles: string[];
}

const PAGE_DEFINITIONS: Record<PageName, PageMeta> = {
  'Expenses': {
    name: 'Expenses',
    category: 'Finance',
    description: 'Site and operational project expenditures tracking',
    icon: Receipt,
    defaultRoles: ['ADMIN', 'ACCOUNTANT'],
  },
  'Income / Payments': {
    name: 'Income / Payments',
    category: 'Finance',
    description: 'Client payments and incoming revenue inflows',
    icon: IndianRupee,
    defaultRoles: ['ADMIN', 'ACCOUNTANT'],
  },
  'Payment History': {
    name: 'Payment History',
    category: 'Finance',
    description: 'Full ledger and historical payment logs',
    icon: History,
    defaultRoles: ['ADMIN', 'ACCOUNTANT', 'ENGINEER'],
  },
  'Accounts': {
    name: 'Accounts',
    category: 'Finance',
    description: 'Bank accounts, cash reserves, and petty cash books',
    icon: Landmark,
    defaultRoles: ['ADMIN', 'ACCOUNTANT'],
  },
  'Invoices': {
    name: 'Invoices',
    category: 'Finance',
    description: 'Customer GST invoices and billing vouchers',
    icon: FileText,
    defaultRoles: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'ENGINEER'],
  },
  'Vendors': {
    name: 'Vendors',
    category: 'Procurement',
    description: 'Supplier directory, credit balances, and contacts',
    icon: Truck,
    defaultRoles: ['ADMIN', 'ACCOUNTANT', 'ENGINEER'],
  },
  'Materials': {
    name: 'Materials',
    category: 'Procurement',
    description: 'Material catalog, quantities, and inventory',
    icon: Package,
    defaultRoles: ['ADMIN', 'ENGINEER'],
  },
  'Purchase Orders': {
    name: 'Purchase Orders',
    category: 'Procurement',
    description: 'Purchase orders, delivery entries, and goods receipts',
    icon: FileText,
    defaultRoles: ['ADMIN', 'ACCOUNTANT', 'ENGINEER'],
  },
  'Attendance': {
    name: 'Attendance',
    category: 'Workforce',
    description: 'Daily staff and site labour attendance logs',
    icon: CalendarCheck,
    defaultRoles: ['ADMIN', 'ENGINEER', 'ACCOUNTANT'],
  },
  'Employees': {
    name: 'Employees',
    category: 'Workforce',
    description: 'Company employee directory, salary setup, and roles',
    icon: UserCog,
    defaultRoles: ['ADMIN', 'ACCOUNTANT'],
  },
  'Payroll Engine': {
    name: 'Payroll Engine',
    category: 'Workforce',
    description: 'Automated salary calculations and payroll dispatch',
    icon: Calculator,
    defaultRoles: ['ADMIN', 'ACCOUNTANT'],
  },
  'Clients': {
    name: 'Clients',
    category: 'Administration',
    description: 'Client profiles, contracts, and confidential agreements',
    icon: Building2,
    defaultRoles: ['ADMIN'],
  },
  'Reports': {
    name: 'Reports',
    category: 'Administration',
    description: 'Executive financial summaries and profit & loss sheets',
    icon: BarChart3,
    defaultRoles: ['ADMIN', 'ACCOUNTANT'],
  },
  'Audit Logs': {
    name: 'Audit Logs',
    category: 'Administration',
    description: 'Real-time security log and system mutation audit trail',
    icon: ClipboardList,
    defaultRoles: ['ADMIN'],
  },
  'Storage Analytics': {
    name: 'Storage Analytics',
    category: 'Administration',
    description: 'Media, document uploads, and cloud storage statistics',
    icon: Database,
    defaultRoles: ['ADMIN'],
  },
};

const CATEGORIES: Array<{ key: PageMeta['category']; label: string; icon: string }> = [
  { key: 'Finance', label: 'Financial & Banking', icon: '💰' },
  { key: 'Procurement', label: 'Procurement & Materials', icon: '📦' },
  { key: 'Workforce', label: 'Workforce & Payroll', icon: '👷' },
  { key: 'Administration', label: 'Administration & Reports', icon: '🛡️' },
];

export default function PageAccessPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ENGINEER' | 'ACCOUNTANT'>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Fetch users list
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  const allUsers: User[] = useMemo(() => {
    return usersResponse?.data || [];
  }, [usersResponse]);

  // Filter to only non-admin users (ENGINEER, ACCOUNTANT)
  const nonAdminUsers = useMemo(() => {
    return allUsers.filter((u) => u.role === 'ENGINEER' || u.role === 'ACCOUNTANT');
  }, [allUsers]);

  // Filtered by search and role
  const filteredUsers = useMemo(() => {
    return nonAdminUsers.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [nonAdminUsers, searchQuery, roleFilter]);

  // Active selected user object
  const selectedUser = useMemo(() => {
    return nonAdminUsers.find((u) => u.id === selectedUserId) || null;
  }, [nonAdminUsers, selectedUserId]);

  // Auto-select first user if none is selected
  useEffect(() => {
    if (!selectedUserId && filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUserId]);

  // Sync selected pages when selected user changes
  useEffect(() => {
    if (selectedUser) {
      const isCustomAccessActive =
        selectedUser.tempAdminUntil &&
        new Date(selectedUser.tempAdminUntil) > new Date() &&
        Array.isArray(selectedUser.tempAdminPages);

      setSelectedPages(isCustomAccessActive ? [...selectedUser.tempAdminPages!] : []);
    } else {
      setSelectedPages([]);
    }
  }, [selectedUser]);

  // Mutation to update user page access
  const updateAccessMutation = useMutation({
    mutationFn: async ({ userId, pages }: { userId: string; pages: string[] }) => {
      // Set to far future date to make access permanent
      const permanentDate = '2099-12-31T23:59:59.999Z';
      const { data } = await api.put(`/users/${userId}/page-access`, {
        pages,
        accessUntil: pages.length > 0 ? permanentDate : null,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        selectedUser ? `Access permissions updated for ${selectedUser.name}` : 'Permissions saved successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Failed to update user page access';
      toast.error(message);
    },
  });

  const isSaving = updateAccessMutation.isPending;

  // Toggle page selection
  const handleTogglePage = (pageName: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageName) ? prev.filter((p) => p !== pageName) : [...prev, pageName]
    );
  };

  // Select all pages
  const handleSelectAll = () => {
    setSelectedPages([...AVAILABLE_PAGES]);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedPages([]);
  };

  // Has changes compared to persisted data
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedUser) return false;
    const isCustomAccessActive =
      selectedUser.tempAdminUntil &&
      new Date(selectedUser.tempAdminUntil) > new Date() &&
      Array.isArray(selectedUser.tempAdminPages);

    const savedPages = isCustomAccessActive ? selectedUser.tempAdminPages! : [];
    if (savedPages.length !== selectedPages.length) return true;
    const savedSorted = [...savedPages].sort();
    const currentSorted = [...selectedPages].sort();
    return savedSorted.some((val, idx) => val !== currentSorted[idx]);
  }, [selectedUser, selectedPages]);

  const handleSave = () => {
    if (!selectedUser) return;
    updateAccessMutation.mutate({
      userId: selectedUser.id,
      pages: selectedPages,
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans relative min-h-[85vh]">
      {/* Background ambient glows for claymorphic feel */}
      <div className="absolute top-[-5%] left-[-5%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] bg-violet-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2.5 rounded-2xl bg-white/80 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white shadow-sm transition-all hover:scale-105 active:scale-95"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-md shadow-indigo-200 text-white">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 tracking-tight">
                Page Access Control
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Configure fine-grained page visibility and permissions for non-admin team members.
            </p>
          </div>
        </div>

        {/* Quick status counters */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xs text-xs font-semibold text-slate-600 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>
              <strong className="text-slate-900">{nonAdminUsers.length}</strong> Team Members
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Split / Master-Detail layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Team Member Selector (hidden on mobile if detail view is open) */}
        <div
          className={cn(
            'lg:col-span-5 xl:col-span-4 space-y-4',
            showMobileDetail ? 'hidden lg:block' : 'block'
          )}
        >
          {/* Search & Filter Bar */}
          <div className="bg-white/70 backdrop-blur-md border border-slate-200/70 p-4 rounded-3xl shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all"
              />
            </div>

            {/* Role filter buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/70 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRoleFilter('ALL')}
                className={cn(
                  'flex-1 py-1.5 rounded-xl transition-all',
                  roleFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                All ({nonAdminUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('ENGINEER')}
                className={cn(
                  'flex-1 py-1.5 rounded-xl transition-all',
                  roleFilter === 'ENGINEER'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Engineers
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('ACCOUNTANT')}
                className={cn(
                  'flex-1 py-1.5 rounded-xl transition-all',
                  roleFilter === 'ACCOUNTANT'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Accountants
              </button>
            </div>
          </div>

          {/* User List */}
          <div className="bg-white/70 backdrop-blur-md border border-slate-200/70 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-slate-100/80 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">No team members found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery ? 'Try clearing your search filters.' : 'No Engineers or Accountants available.'}
                </p>
              </div>
            ) : (
              <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100/80">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUserId === user.id;
                  const hasCustomPages =
                    user.tempAdminUntil &&
                    new Date(user.tempAdminUntil) > new Date() &&
                    Array.isArray(user.tempAdminPages) &&
                    user.tempAdminPages.length > 0;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowMobileDetail(true);
                      }}
                      className={cn(
                        'w-full text-left p-4 transition-all flex items-center justify-between gap-3 relative group',
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/70 border-l-4 border-l-indigo-600'
                          : 'hover:bg-slate-50/70'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs transition-transform',
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-indigo-200 scale-105'
                              : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 group-hover:scale-105'
                          )}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                              {user.name}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
                                user.role === 'ENGINEER'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              )}
                            >
                              {user.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {hasCustomPages ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50/90 px-2 py-0.5 rounded-full border border-indigo-100">
                                <Sparkles className="w-3 h-3" />
                                {user.tempAdminPages!.length} custom pages
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Default role access</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight
                        className={cn(
                          'w-4 h-4 text-slate-300 transition-transform shrink-0',
                          isSelected && 'text-indigo-600 translate-x-0.5'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Permission Editor */}
        <div
          className={cn(
            'lg:col-span-7 xl:col-span-8 space-y-5',
            !showMobileDetail ? 'hidden lg:block' : 'block'
          )}
        >
          {selectedUser ? (
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              {/* Mobile Back to List button */}
              <div className="p-3 border-b border-slate-100 bg-slate-50 lg:hidden">
                <button
                  type="button"
                  onClick={() => setShowMobileDetail(false)}
                  className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Team Members list
                </button>
              </div>

              {/* User Selected Banner Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-100 shrink-0">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold font-heading text-slate-900">{selectedUser.name}</h2>
                        <span
                          className={cn(
                            'text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                            selectedUser.role === 'ENGINEER'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          )}
                        >
                          {selectedUser.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{selectedUser.email}</p>
                    </div>
                  </div>

                  {/* Save button in header for desktop */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving || !hasUnsavedChanges}
                      className={cn(
                        'flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-sm',
                        hasUnsavedChanges
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-md'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      )}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status bar info */}
                <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>
                      {selectedPages.length === 0 ? (
                        <span>This user has standard <strong>{selectedUser.role}</strong> permissions.</span>
                      ) : (
                        <span>
                          Custom access active on <strong>{selectedPages.length}</strong> of {AVAILABLE_PAGES.length} pages.
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Selection controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      Clear All
                    </button>
                    {hasUnsavedChanges && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Unsaved changes
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Categorized Permissions Grid */}
              <div className="p-6 space-y-6 max-h-[640px] overflow-y-auto">
                {CATEGORIES.map(({ key, label, icon }) => {
                  const pagesInCategory = AVAILABLE_PAGES.filter(
                    (p) => PAGE_DEFINITIONS[p].category === key
                  );

                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <span className="text-base">{icon}</span>
                        <h3 className="text-sm font-bold font-heading text-slate-800 tracking-wide uppercase">
                          {label}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pagesInCategory.map((pageName) => {
                          const pageMeta = PAGE_DEFINITIONS[pageName];
                          const isSelected = selectedPages.includes(pageName);
                          const isRoleDefault = pageMeta.defaultRoles.includes(selectedUser.role);
                          const IconComponent = pageMeta.icon;

                          return (
                            <div
                              key={pageName}
                              onClick={() => handleTogglePage(pageName)}
                              className={cn(
                                'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none relative group',
                                isSelected
                                  ? 'bg-indigo-50/50 border-indigo-200 shadow-xs hover:border-indigo-300'
                                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                              )}
                            >
                              {/* Checkbox Icon */}
                              <div className="mt-0.5 shrink-0 text-slate-400">
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                    <CheckSquare className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-lg border-2 border-slate-300 bg-white group-hover:border-indigo-400 transition-colors" />
                                )}
                              </div>

                              {/* Page Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      'text-sm font-bold transition-colors',
                                      isSelected ? 'text-indigo-950 font-heading' : 'text-slate-800'
                                    )}
                                  >
                                    {pageName}
                                  </span>

                                  {isRoleDefault && (
                                    <span
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                                      title="This page is inherently part of the base role access"
                                    >
                                      Role Default
                                    </span>
                                  )}

                                  {isSelected && !isRoleDefault && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                                      Custom Grant
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                  {pageMeta.description}
                                </p>
                              </div>

                              {/* Page category icon badge */}
                              <div
                                className={cn(
                                  'p-2 rounded-xl shrink-0 transition-colors',
                                  isSelected ? 'bg-indigo-100/70 text-indigo-600' : 'bg-slate-100 text-slate-400'
                                )}
                              >
                                <IconComponent className="w-4 h-4" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Access is applied permanently (until year 2099) until explicitly modified by an Admin.
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedUser?.tempAdminPages) {
                        setSelectedPages([...selectedUser.tempAdminPages]);
                      } else {
                        setSelectedPages([]);
                      }
                    }}
                    disabled={!hasUnsavedChanges || isSaving}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !hasUnsavedChanges}
                    className={cn(
                      'flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-sm',
                      hasUnsavedChanges
                        ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-300 hover:shadow-md cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Permissions</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-heading">No User Selected</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Select an Engineer or Accountant from the list on the left to configure which pages they can access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
