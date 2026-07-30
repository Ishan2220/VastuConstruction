import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const tryRefresh = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        if (data.success && data.data) {
          useAuthStore.getState().setAccessToken(data.data.accessToken);
          try {
            const { data: meData } = await api.get('/auth/me');
            if (meData.success && meData.data) {
              useAuthStore.getState().setAuth(data.data.accessToken, meData.data);
            }
          } catch {
            if (data.data.user) {
              useAuthStore.getState().setAuth(data.data.accessToken, data.data.user);
            } else {
              useAuthStore.getState().setLoading(false);
            }
          }
        } else {
          useAuthStore.getState().setLoading(false);
        }
      } catch {
        useAuthStore.setState({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    tryRefresh();
  }, []);

  return <>{children}</>;
}
