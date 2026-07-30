import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/ui/ConfirmProvider';
import AppLayout from '@/components/layout/AppLayout';

import { lazy, Suspense } from 'react';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

// Lazy loaded Pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LeadsPage = lazy(() => import('@/pages/LeadsPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailsPage = lazy(() => import('@/pages/ProjectDetailsPage'));
const SiteDashboardPage = lazy(() => import('@/pages/SiteDashboardPage'));
const SitesPage = lazy(() => import('@/pages/SitesPage'));
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage'));
const IncomePage = lazy(() => import('@/pages/IncomePage'));
const AccountsPage = lazy(() => import('@/pages/AccountsPage'));
const VendorsPage = lazy(() => import('@/pages/VendorsPage'));
const VendorDetailsPage = lazy(() => import('@/pages/VendorDetailsPage'));
const LabourPage = lazy(() => import('@/pages/LabourPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const MaterialsPage = lazy(() => import('@/pages/MaterialsPage'));
const PurchaseOrdersPage = lazy(() => import('@/pages/PurchaseOrdersPage'));
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const TasksPage = lazy(() => import('@/pages/TasksPage'));
const EmployeesPage = lazy(() => import('@/pages/EmployeesPage'));
const EmployeeDetailsPage = lazy(() => import('@/pages/EmployeeDetailsPage'));
const AttendancePage = lazy(() => import('@/pages/AttendancePage'));
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const SiteProfitLossPage = lazy(() => import('@/pages/SiteProfitLossPage'));
const StorageAnalyticsPage = lazy(() => import('@/pages/StorageAnalyticsPage'));
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage'));
const UsersPage = lazy(() => import('@/pages/settings/UsersPage'));
const AccountPage = lazy(() => import('@/pages/settings/AccountPage'));
const FinancialSettingsPage = lazy(() => import('@/pages/settings/FinancialSettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const PaymentHistoryPage = lazy(() => import('@/pages/PaymentHistoryPage'));
const PayrollPage = lazy(() => import('@/pages/PayrollPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-white space-y-4 font-sans">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <div className="text-sm font-semibold tracking-wide text-slate-300">
          Vastu Construction Control Tower Initializing...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ allowedRoles, pageName, children }: { allowedRoles: string[], pageName?: string, children: React.ReactNode }) {
  const { user } = useAuthStore();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const hasBaseRole = allowedRoles.includes(user.role);
  
  let hasTempAdmin = false;
  if (pageName && user.tempAdminUntil && user.tempAdminPages) {
    if (new Date(user.tempAdminUntil) > new Date() && user.tempAdminPages.includes(pageName)) {
      hasTempAdmin = true;
    }
  }

  if (!hasBaseRole && !hasTempAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-white space-y-4 font-sans">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <div className="text-sm font-semibold tracking-wide text-slate-300">
          Verifying Session...
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public Login Route */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />

            {/* Protected Application Routes within Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailsPage />} />
              <Route path="projects/:id/dashboard" element={<SiteDashboardPage />} />
              <Route path="sites" element={<Navigate to="/projects" replace />} />
              <Route path="sites/:id/dashboard" element={<Navigate to="/projects" replace />} />
              <Route path="site-profit-loss" element={<SiteProfitLossPage />} />
              <Route path="expenses" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Expenses"><ExpensesPage /></RoleRoute>} />
              <Route path="income" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Income / Payments"><IncomePage /></RoleRoute>} />
              <Route path="payment-history" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT', 'ENGINEER']} pageName="Payment History"><PaymentHistoryPage /></RoleRoute>} />
              <Route path="accounts" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Accounts"><AccountsPage /></RoleRoute>} />
              <Route path="vendors" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT', 'ENGINEER']} pageName="Vendors"><VendorsPage /></RoleRoute>} />
              <Route path="vendors/:id" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT', 'ENGINEER']} pageName="Vendors"><VendorDetailsPage /></RoleRoute>} />
              <Route path="labour" element={<RoleRoute allowedRoles={['ADMIN', 'ENGINEER']} pageName="Labour"><LabourPage /></RoleRoute>} />
              <Route path="attendance" element={<RoleRoute allowedRoles={['ADMIN', 'ENGINEER', 'ACCOUNTANT']} pageName="Attendance"><AttendancePage /></RoleRoute>} />
              <Route path="clients" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Clients"><ClientsPage /></RoleRoute>} />
              <Route path="materials" element={<RoleRoute allowedRoles={['ADMIN', 'ENGINEER']} pageName="Materials"><MaterialsPage /></RoleRoute>} />
              <Route path="projects/:id/materials" element={<RoleRoute allowedRoles={['ADMIN', 'ENGINEER']} pageName="Materials"><MaterialsPage /></RoleRoute>} />
              <Route path="sites/:id/materials" element={<RoleRoute allowedRoles={['ADMIN', 'ENGINEER']} pageName="Materials"><MaterialsPage /></RoleRoute>} />
              <Route path="purchase-orders" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT', 'ENGINEER']} pageName="Purchase Orders"><PurchaseOrdersPage /></RoleRoute>} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="reports" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Reports"><ReportsPage /></RoleRoute>} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="employees" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Employees"><EmployeesPage /></RoleRoute>} />
              <Route path="employees/:id" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Employees"><EmployeeDetailsPage /></RoleRoute>} />
              <Route path="payroll" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Payroll Engine"><PayrollPage /></RoleRoute>} />
              <Route path="audit-logs" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Audit Logs"><AuditLogsPage /></RoleRoute>} />
              <Route path="storage-analytics" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Storage Analytics"><StorageAnalyticsPage /></RoleRoute>} />
              <Route path="invoices" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Invoices"><InvoicesPage /></RoleRoute>} />
              <Route path="settings" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Settings"><SettingsPage /></RoleRoute>} />
              <Route path="settings/users" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Settings"><UsersPage /></RoleRoute>} />
              <Route path="settings/financial" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Settings"><FinancialSettingsPage /></RoleRoute>} />
              <Route path="settings/account" element={<AccountPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </ConfirmProvider>

      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  );
}
