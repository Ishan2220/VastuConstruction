import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import LeadsPage from '@/pages/LeadsPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailsPage from '@/pages/ProjectDetailsPage';
import SitesPage from '@/pages/SitesPage';
import ExpensesPage from '@/pages/ExpensesPage';
import IncomePage from '@/pages/IncomePage';
import AccountsPage from '@/pages/AccountsPage';
import VendorsPage from '@/pages/VendorsPage';
import VendorDetailsPage from '@/pages/VendorDetailsPage';
import LabourPage from '@/pages/LabourPage';
import ClientsPage from '@/pages/ClientsPage';
import DocumentsPage from '@/pages/DocumentsPage';
import ReportsPage from '@/pages/ReportsPage';
import CalendarPage from '@/pages/CalendarPage';
import TasksPage from '@/pages/TasksPage';
import EmployeesPage from '@/pages/EmployeesPage';
import EmployeeDetailsPage from '@/pages/EmployeeDetailsPage';
import SalaryPaymentsPage from '@/pages/SalaryPaymentsPage';
import AuditLogsPage from '@/pages/AuditLogsPage';
import SettingsPage from '@/pages/SettingsPage';
import SiteProfitLossPage from '@/pages/SiteProfitLossPage';
import StorageAnalyticsPage from '@/pages/StorageAnalyticsPage';
import InvoicesPage from '@/pages/InvoicesPage';
import UsersPage from '@/pages/settings/UsersPage';
import AccountPage from '@/pages/settings/AccountPage';
import NotFoundPage from '@/pages/NotFoundPage';

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

function RoleRoute({ allowedRoles, children }: { allowedRoles: string[], children: React.ReactNode }) {
  const { user } = useAuthStore();
  
  if (!user || !allowedRoles.includes(user.role)) {
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
          <Route path="sites" element={<SitesPage />} />
          <Route path="site-profit-loss" element={<SiteProfitLossPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="income" element={<IncomePage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="vendors/:id" element={<VendorDetailsPage />} />
          <Route path="labour" element={<LabourPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/:id" element={<EmployeeDetailsPage />} />
          <Route path="salaries" element={<SalaryPaymentsPage />} />
          <Route path="audit-logs" element={<RoleRoute allowedRoles={['ADMIN']}><AuditLogsPage /></RoleRoute>} />
          <Route path="storage-analytics" element={<StorageAnalyticsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/users" element={<RoleRoute allowedRoles={['ADMIN']}><UsersPage /></RoleRoute>} />
          <Route path="settings/account" element={<AccountPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>

      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  );
}
