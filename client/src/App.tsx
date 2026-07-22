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
          <Route path="expenses" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} pageName="Expenses"><ExpensesPage /></RoleRoute>} />
          <Route path="income" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} pageName="Income / Payments"><IncomePage /></RoleRoute>} />
          <Route path="accounts" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} pageName="Accounts"><AccountsPage /></RoleRoute>} />
          <Route path="vendors" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT', 'ENGINEER']} pageName="Vendors"><VendorsPage /></RoleRoute>} />
          <Route path="vendors/:id" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT', 'ENGINEER']} pageName="Vendors"><VendorDetailsPage /></RoleRoute>} />
          <Route path="labour" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ENGINEER']} pageName="Labour / Staff"><LabourPage /></RoleRoute>} />
          <Route path="clients" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} pageName="Clients"><ClientsPage /></RoleRoute>} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="reports" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} pageName="Reports"><ReportsPage /></RoleRoute>} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="employees" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Employees"><EmployeesPage /></RoleRoute>} />
          <Route path="employees/:id" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Employees"><EmployeeDetailsPage /></RoleRoute>} />
          <Route path="salaries" element={<RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} pageName="Salaries"><SalaryPaymentsPage /></RoleRoute>} />
          <Route path="audit-logs" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Audit Logs"><AuditLogsPage /></RoleRoute>} />
          <Route path="storage-analytics" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Storage Analytics"><StorageAnalyticsPage /></RoleRoute>} />
          <Route path="invoices" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} pageName="Invoices"><InvoicesPage /></RoleRoute>} />
          <Route path="settings" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Settings"><SettingsPage /></RoleRoute>} />
          <Route path="settings/users" element={<RoleRoute allowedRoles={['ADMIN']} pageName="Settings"><UsersPage /></RoleRoute>} />
          <Route path="settings/account" element={<AccountPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>

      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  );
}
