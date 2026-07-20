import { QueryClient } from '@tanstack/react-query';

export class CacheManager {
  /**
   * Called when an Expense is created, updated, or deleted.
   * Invalidates local expense queries and all cross-module dependencies.
   */
  static invalidateOnExpense(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    // Potential future granular keys:
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['bank-accounts-select'] });
  }

  /**
   * Called when Income is recorded or deleted.
   */
  static invalidateOnIncome(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['incomes-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['bank-accounts-select'] });
  }

  /**
   * Called on Project mutations.
   */
  static invalidateOnProject(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
  }

  /**
   * General fallback for modules that just need their own list and dashboard sync.
   */
  static invalidateEntity(queryClient: QueryClient, entityListKey: string) {
    queryClient.invalidateQueries({ queryKey: [entityListKey] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
  }
}
