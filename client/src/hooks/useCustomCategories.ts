import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type CategoryModule = 'materials' | 'tasks' | 'expenses' | 'vendors' | 'labour' | 'incomes' | 'sites' | 'payment_method' | 'lead_source' | 'document_type';

export function useCustomCategories(module: string, defaultCategories: string[] = []) {
  const queryClient = useQueryClient();

  const { data: customList = [] } = useQuery({
    queryKey: ['custom-categories', module],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${module.toUpperCase()}`);
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const { data } = await api.post('/categories', {
        type: module.toUpperCase(),
        value: categoryName,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories', module] });
    },
  });

  const addCategory = (categoryName: string) => {
    const cleaned = categoryName.trim().toUpperCase();
    if (!cleaned) return;
    if (!customList.includes(cleaned) && !defaultCategories.includes(cleaned)) {
      addMutation.mutate(cleaned);
    }
  };

  const deleteCategory = (categoryName: string) => {
    // Backend doesn't have a delete route yet in the implementation plan,
    // but the user just requested Add Custom permanent feature.
    // If we want to support delete, we can add it later.
    // For now, it will just log to console or be a no-op until delete route is added.
    console.log("Delete Custom Category via API not implemented yet");
  };

  const allCategories = Array.from(new Set([...defaultCategories, ...customList]));

  return {
    customCategories: customList,
    allCategories,
    addCategory,
    deleteCategory,
  };
}
