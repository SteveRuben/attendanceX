// src/services/apiService.ts - Service API centralisé pour AttendanceX
import { authService } from './authService';

// Determine the correct API base URL
const getApiBaseUrl = () => {
  const envUrl = (import.meta.env as any).VITE_API_URL;
  if (envUrl) {
    // If VITE_API_URL is set, use it as-is (it should contain the full path)
    return envUrl;
  }
  // Fallback for local development
  return 'http://localhost:5001/v1';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiService {
  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    const token = authService.getAccessToken();
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 - token expired
      if (response.status === 401 && token) {
        try {
          await authService.refreshAccessToken();
          // Retry with new token
          const newToken = authService.getAccessToken();
          if (newToken) {
            defaultHeaders.Authorization = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, {
              ...config,
              headers: {
                ...defaultHeaders,
                ...options.headers,
              },
            });
            return await retryResponse.json();
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }

  // GET request
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let finalEndpoint = endpoint;
    
    if (params) {
      const url = new URL(`${API_BASE_URL}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
      finalEndpoint = endpoint + '?' + url.searchParams.toString();
    }

    return this.makeRequest<T>(finalEndpoint);
  }

  // POST request
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async postWithHeader<T = any>(endpoint: string, data: any, headers: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload
  async upload<T = any>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const token = authService.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers,
    });
  }
}

export const apiService = new ApiService();