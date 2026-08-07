import { NavLink, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  UserPlus,
  Briefcase,
  Building2,
  Receipt,
  IndianRupee,
  Landmark,
  Package,
  Truck,
  HardHat,
  Users,
  FileText,
  BarChart3,
  Calendar,
  CheckSquare,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardList,
  Database,
  Wallet,
  History,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import type { Role } from '@/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Leads (CRM)', icon: UserPlus, href: '/leads' },
  { label: 'Project Sites', icon: Building2, href: '/projects' },
  { label: 'Expenses', icon: Receipt, href: '/expenses', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Income / Payments', icon: IndianRupee, href: '/income', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Payment History', icon: History, href: '/payment-history', roles: ['ADMIN', 'ACCOUNTANT', 'ENGINEER'] },
  { label: 'Accounts', icon: Landmark, href: '/accounts', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Invoices', icon: FileText, href: '/invoices', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Vendors', icon: Truck, href: '/vendors', roles: ['ADMIN', 'ACCOUNTANT', 'ENGINEER'] },
  { label: 'Materials', icon: Package, href: '/materials', roles: ['ADMIN', 'ENGINEER', 'ACCOUNTANT'] },
  { label: 'Material Entries', icon: Receipt, href: '/purchase-orders', roles: ['ADMIN', 'ACCOUNTANT', 'ENGINEER'] },

  { label: 'Attendance', icon: CheckSquare, href: '/attendance', roles: ['ADMIN', 'ENGINEER', 'ACCOUNTANT'] },
  { label: 'Clients', icon: Building2, href: '/clients', roles: ['ADMIN'] },
  { label: 'Employees', icon: UserCog, href: '/employees', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Payroll Engine', icon: Calculator, href: '/payroll', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Documents', icon: FileText, href: '/documents' },
  { label: 'Reports', icon: BarChart3, href: '/reports', roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Calendar', icon: Calendar, href: '/calendar' },
  { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
  { label: 'Audit Logs', icon: ClipboardList, href: '/audit-logs', roles: ['ADMIN'] },
  { label: 'Storage Analytics', icon: Database, href: '/storage-analytics', roles: ['ADMIN'] },
  { label: 'Settings', icon: Settings, href: '/settings', roles: ['ADMIN'] },
];

function Clock({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn(
      "border-t border-white/10 px-4 py-3 bg-[#6558D3] z-10 relative shrink-0",
      sidebarCollapsed && "px-2 text-center"
    )}>
      {!sidebarCollapsed ? (
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-white/70">
            {format(currentTime, 'EEEE, dd MMM yyyy')}
          </p>
          <p className="text-xs font-semibold tabular-nums text-white/90">
            {format(currentTime, 'hh:mm:ss a')}
          </p>
        </div>
      ) : (
        <p className="text-[10px] font-semibold tabular-nums text-white/80">
          {format(currentTime, 'HH:mm')}
        </p>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { sidebarCollapsed, sidebarMobileOpen, toggleSidebar, setSidebarMobileOpen } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // ESC support for mobile drawer
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarMobileOpen) {
        setSidebarMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [sidebarMobileOpen, setSidebarMobileOpen]);

  const userRole = user?.role ?? 'ADMIN';

  const hasTempAdmin = (label: string) => {
    if (!user?.tempAdminUntil || !Array.isArray(user?.tempAdminPages)) return false;
    if (new Date(user.tempAdminUntil) < new Date()) return false;
    return user.tempAdminPages.includes(label);
  };

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole) || hasTempAdmin(item.label)
  );

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const isCollapsed = !isMobile && sidebarCollapsed;
    return (
      <div className="flex h-full flex-col bg-gradient-to-b from-[#7C6EF0] to-[#6558D3] overflow-hidden">
        {/* Logo */}
        <div className={cn(
          "flex items-center gap-3 border-b border-white/10 px-4 py-5",
          isCollapsed && "justify-center px-2"
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F2A65A] to-orange-500 shadow-md">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="flex flex-col">
                  <h1 className="text-xs font-bold tracking-wider text-white leading-tight font-heading">
                    VASTU <span className="text-[#F2A65A] font-extrabold">×</span> CONSTRACORE
                  </h1>
                  <p className="text-[9px] font-semibold text-white/70 tracking-widest mt-0.5 uppercase">
                    By Shivlink Technologies
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-hide">
          <ul className="space-y-0.5">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href} className="relative">
                  <NavLink
                    to={item.href}
                    onClick={() => setSidebarMobileOpen(false)}
                    className={cn(
                      "relative group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-200 overflow-hidden",
                      active
                        ? "bg-white/20 text-white font-bold"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <Icon className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      active ? "text-white" : "text-white/70 group-hover:text-white"
                    )} />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3.5px] rounded-r-full bg-[#F2A65A] shadow-[0_0_8px_rgba(242,166,90,0.6)]" />
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - Date & Time */}
        <Clock sidebarCollapsed={isCollapsed} />

        {/* Collapse Toggle - Desktop */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="hidden border-t border-white/10 px-4 py-2.5 text-white/60 transition-colors hover:bg-white/5 hover:text-white/90 lg:flex lg:items-center lg:justify-center cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative hidden h-screen flex-shrink-0 lg:block z-30 overflow-hidden"
      >
        {renderSidebarContent(false)}
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden shadow-2xl"
            >
              <button
                onClick={() => setSidebarMobileOpen(false)}
                className="absolute right-3 top-4 rounded-md p-1.5 text-white/70 hover:text-white hover:bg-white/10 z-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
