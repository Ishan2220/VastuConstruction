import { QueryClient } from '@tanstack/react-query';

export class CacheManager {
  /**
   * Called when an Expense is created, updated, or deleted.
   * Invalidates local expense queries and all cross-module dependencies.
   */
  static invalidateOnExpense(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
    queryClient.invalidateQueries({ queryKey: ['vendors-select'] });
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
  }

  /**
   * Called when Income is recorded or deleted.
   */
  static invalidateOnIncome(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['incomes-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['clients-directory'] });
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
  }

  /**
   * Called on Project mutations.
   */
  static invalidateOnProject(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['site-dashboard'] });
  }

  static invalidateOnSiteDashboard(queryClient: QueryClient, projectId: string) {
    queryClient.invalidateQueries({ queryKey: ['site-dashboard', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  /**
   * Called on Material / Stock / Consumption mutations.
   */
  static invalidateOnMaterial(queryClient: QueryClient, projectId?: string) {
    queryClient.invalidateQueries({ queryKey: ['materials-list'] });
    queryClient.invalidateQueries({ queryKey: ['material-stock'] });
    queryClient.invalidateQueries({ queryKey: ['material-orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['site-materials-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['site-material-history', projectId] });
      queryClient.invalidateQueries({ queryKey: ['site-dashboard', projectId] });
    }
  }

  /**
   * Called on Vendor Payment mutations.
   */
  static invalidateOnVendorPayment(queryClient: QueryClient, vendorId: string) {
    queryClient.invalidateQueries({ queryKey: ['vendor-details', vendorId] });
    queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['expenses-list'] }); // Payment creates an expense
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }); // Payment updates account balance
  }

  /**
   * Called on Attendance mutations.
   */
  static invalidateOnAttendance(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['attendance'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-list'] });
  }

  /**
   * Called on Salary Payment mutations.
   */
  static invalidateOnSalary(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['salary-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['expenses-list'] }); // Salary creates an expense
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
  }

  /**
   * Called on Invoice mutations.
   */
  static invalidateOnInvoice(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['clients-directory'] });
    queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
  }

  /**
   * General fallback for modules that just need their own list and dashboard sync.
   */
  static invalidateEntity(queryClient: QueryClient, entityListKey: string) {
    queryClient.invalidateQueries({ queryKey: [entityListKey] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
  }
}
