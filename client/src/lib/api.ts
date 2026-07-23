// src/lib/api.ts
import axios, { InternalAxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { logoutGuide, logoutCustomer } from "@/utils/logoutHelper";

const api = axios.create({
  // FC-2 fix: Use env variable for API base URL, fallback to localhost for dev
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: false,
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    let token: string | null = null;

    // Guide endpoints need guide_token:
    const isGuideEndpoint =
      config.url?.startsWith('/guides') ||
      config.url?.startsWith('/bookings/guide') ||
      (config.method === 'put' && /^\/bookings\/[^/]+\/status$/.test(config.url ?? '')) ||
      (config.method === 'post' && /^\/bookings\/[^/]+\/start-trip$/.test(config.url ?? ''));

    token = isGuideEndpoint
      ? localStorage.getItem('guide_token')
      : localStorage.getItem('userToken');

    if (token) {
      try {
        const decoded = jwtDecode<{ exp: number }>(token);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
          // FC-1 fix: Redirect guide to guide login, customer to customer login
          if (isGuideEndpoint) {
            logoutGuide();
          } else {
            logoutCustomer();
          }
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        // Silently handle decoding errors in production
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;