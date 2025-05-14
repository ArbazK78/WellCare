// src/lib/api.ts
import axios, { AxiosRequestConfig, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { logoutGuide } from "@/utils/logoutHelper";

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: false,
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    let token: string | null = null;

    if (config.url?.startsWith('/guides')) {
      token = localStorage.getItem('guide_token');
    } else {
      token = localStorage.getItem('userToken');
    }

    console.log(`🔥 [Interceptor] Requesting: ${config.method} ${config.url}`);
    console.log(`🔑 [Interceptor] Selected Token: ${token ? token.slice(0, 10) + '...' : 'absent'}`);

    if (token) {
      try {
        const decoded = jwtDecode<{ exp: number }>(token);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
          console.warn('⚠️ [Interceptor] Token expired.');
          logoutGuide();
        } else {
          // Directly set the Authorization header on the existing headers object
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ [Interceptor] Attached Authorization header.');
        }
      } catch (err) {
        console.error('❌ [Interceptor] Token decoding failed:', err);
      }
    } else {
      console.warn('⚠️ [Interceptor] No token found for this request.');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;