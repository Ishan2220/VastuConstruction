import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

const normalizeUser = (u: User | null): User | null => {
  if (!u) return null;
  if (u.name === 'Rajesh Sharma' || u.email === 'admin@vastuconstruction.in') {
    return { ...u, name: 'Sandeep Jadhav' };
  }
  return u;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (token, user) =>
        set({
          accessToken: token,
          user: normalizeUser(user) as User,
          isAuthenticated: true,
          isLoading: false,
        }),

      setAccessToken: (token) =>
        set({ accessToken: token }),

      setUser: (user) =>
        set({ user: normalizeUser(user) as User }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      logout: () =>
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'vastu-auth-token',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: normalizeUser(state.user),
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          state.user = normalizeUser(state.user);
        }
      },
    }
  )
);
