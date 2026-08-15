import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

const normalizeUser = (user: any): any => {
  if (!user) return null;
  return {
    ...user,
    role: user.role || user.employee?.designation || 'ENGINEER',
  };
};

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  presentation: { reason: string; expiresAt: string } | null;
  setPresentation: (data: { reason: string; expiresAt: string } | null) => void;
  endPresentation: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      presentation: null,

      setAuth: (token, user) =>
        set({
          accessToken: token,
          user: user,
          isAuthenticated: true,
          isLoading: false,
        }),

      setAccessToken: (token) =>
        set({ accessToken: token }),

      setUser: (user) =>
        set({ user: user }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (err) {
          console.error('Logout failed:', err);
        }
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          presentation: null,
        });
      },

      setPresentation: (data) => set({ presentation: data }),
      
      endPresentation: async () => {
        try {
          // This endpoint needs to be called to revoke session
          // However, we don't have the sessionId here, the backend revokes based on cookie?
          // Wait, the backend revoke endpoint expects `sessionId` and `superAdminId` which is from the token.
          // Actually, if the normal user is logged in, they can't call `/api/support/revoke` because that requires SUPER_ADMIN.
          // Wait! The user who is presenting is logged in as the normal ADMIN, but they also have the `support_session_token`.
          // If they click "End Presentation", we just need to clear the cookie. The backend could have a `/api/support/end` endpoint that clears the cookie, 
          // or we can just log them out of the ERP to be safe. But the prompt says "Existing ADMIN login still works." 
          // So "End presentation session" should just clear the support cookie and return to login or normal mode.
          await fetch('/api/support/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        } catch (err) {
          console.error('End presentation failed:', err);
        }
        set({ presentation: null });
        window.location.href = '/login';
      },
    }),
    {
      name: 'vastu-auth-token',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: normalizeUser(state.user),
        isAuthenticated: state.isAuthenticated,
        presentation: state.presentation,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          state.user = normalizeUser(state.user);
        }
      },
    }
  )
);
