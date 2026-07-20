import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  sidebarMobileOpen: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  setSidebarMobileOpen: (open) =>
    set({ sidebarMobileOpen: open }),
}));
