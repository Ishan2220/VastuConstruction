import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - attach access token
api.interceptors.request.use(
  (config) => {
    // Dynamic import to avoid circular dependency
    const token = localStorage.getItem('vastu-auth-token');
    if (token) {
      const parsed = JSON.parse(token);
      if (parsed?.state?.accessToken) {
        config.headers.Authorization = `Bearer ${parsed.state.accessToken}`;
      }
    }

    // Attach Idempotency-Key for all mutating requests
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const idempotencyKey = typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : Date.now().toString() + Math.random().toString(36).substring(2);
        
      if (!config.headers) {
        config.headers = {} as any;
      }
      
      config.headers['Idempotency-Key'] = idempotencyKey;
      config.headers['idempotency-key'] = idempotencyKey;
      
      if (typeof config.headers.set === 'function') {
        config.headers.set('Idempotency-Key', idempotencyKey);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not retry or redirect if the 401 came from auth endpoints (/auth/login, /auth/refresh)
    if (
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', null, {
          withCredentials: true,
        });

        const newToken = data?.data?.accessToken;

        // Update local storage
        const stored = localStorage.getItem('vastu-auth-token');
        if (stored && newToken) {
          const parsed = JSON.parse(stored);
          parsed.state.accessToken = newToken;
          localStorage.setItem('vastu-auth-token', JSON.stringify(parsed));
        }

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('vastu-auth-token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
