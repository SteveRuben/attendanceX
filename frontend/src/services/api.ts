// API Configuration - Service API centralisé pour AttendanceX

// Determine the correct API base URL for Vite
const getApiBaseUrl = () => {
  // Vite environment variable (correct pour Vite)
  const viteUrl = import.meta.env.VITE_API_URL;

  if (viteUrl) {
    return viteUrl;
  }

  // Fallback for local development
  /*  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
     return 'http://localhost:5001/v1';
   }
   
   return '/api'; */
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    VERIFY_EMAIL: `${API_BASE_URL}/auth/verify-email`,
    RESEND_VERIFICATION: `${API_BASE_URL}/auth/resend-verification`,
    USER_CONTEXT: `${API_BASE_URL}/auth/user-context`,
    SET_ACTIVE_ORGANIZATION: `${API_BASE_URL}/auth/set-active-organization`,
    ACCEPT_INVITATION: `${API_BASE_URL}/auth/accept-invitation`,
  },

  // Plans
  PLANS: {
    LIST: `${API_BASE_URL}/plans`,
    GET: (planId: string) => `${API_BASE_URL}/plans/${planId}`,
    CALCULATE_PRICE: `${API_BASE_URL}/plans/calculate-price`,
  },

  // Metadata
  METADATA: {
    INDUSTRIES: `${API_BASE_URL}/organizations/sector-templates`, // Utilise l'API existante
    ORGANIZATION_SIZES: `${API_BASE_URL}/metadata/organization-sizes`,
    COUNTRIES: `${API_BASE_URL}/metadata/countries`,
    TIMEZONES: `${API_BASE_URL}/metadata/timezones`,
  },

  // Organizations
  ORGANIZATIONS: {
    LIST: `${API_BASE_URL}/organizations`,
    CREATE: `${API_BASE_URL}/organizations`,
    GET: (orgId: string) => `${API_BASE_URL}/organizations/${orgId}`,
    UPDATE: (orgId: string) => `${API_BASE_URL}/organizations/${orgId}`,
    DELETE: (orgId: string) => `${API_BASE_URL}/organizations/${orgId}`,
    SECTOR_TEMPLATES: `${API_BASE_URL}/organizations/sector-templates`,
    SECTOR_TEMPLATE: (sector: string) => `${API_BASE_URL}/organizations/templates/${sector}`,
  },

  // Users
  USERS: {
    LIST: `${API_BASE_URL}/users`,
    GET: (userId: string) => `${API_BASE_URL}/users/${userId}`,
    UPDATE: (userId: string) => `${API_BASE_URL}/users/${userId}`,
    DELETE: (userId: string) => `${API_BASE_URL}/users/${userId}`,
    INVITE: `${API_BASE_URL}/users/invite`,
  },

  // Events
  EVENTS: {
    LIST: `${API_BASE_URL}/events`,
    CREATE: `${API_BASE_URL}/events`,
    GET: (eventId: string) => `${API_BASE_URL}/events/${eventId}`,
    UPDATE: (eventId: string) => `${API_BASE_URL}/events/${eventId}`,
    DELETE: (eventId: string) => `${API_BASE_URL}/events/${eventId}`,
  },

  // Attendance
  ATTENDANCE: {
    LIST: `${API_BASE_URL}/attendance`,
    CHECKIN: `${API_BASE_URL}/attendance/checkin`,
    CHECKOUT: `${API_BASE_URL}/attendance/checkout`,
    BULK_IMPORT: `${API_BASE_URL}/attendance/bulk-import`,
  },
} as const;

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const;

// API Response types
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

// Specific API error class
export class ApiError extends Error {
  public status: number;
  public code?: string;

  constructor({ message, status, code }: { message: string; status: number; code?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Auth service interface (to avoid circular dependencies)
interface AuthService {
  getAccessToken(): string | null;
  refreshAccessToken(): Promise<void>;
}

// Simple auth service implementation
const createAuthService = (): AuthService => {
  return {
    getAccessToken(): string | null {
      return localStorage.getItem('accessToken');
    },

    async refreshAccessToken(): Promise<void> {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      if (data.success && data.data?.accessToken) {
        localStorage.setItem('accessToken', data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem('refreshToken', data.data.refreshToken);
        }
      } else {
        throw new Error('Invalid refresh response');
      }
    }
  };
};

const authService = createAuthService();

// Advanced API service class
class ApiService {
  async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    const token = authService.getAccessToken();
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      credentials: 'include',
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
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new ApiError({
            message: 'Session expired. Please login again.',
            status: 401,
            code: 'SESSION_EXPIRED'
          });
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError({
          message: data.message || data.error || `HTTP ${response.status}`,
          status: response.status,
          code: data.code
        });
      }

      return data;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new ApiError({
          message: 'Network error. Please check your connection.',
          status: 0,
          code: 'NETWORK_ERROR'
        });
      }

      throw new ApiError({
        message: error.message || 'Unknown error occurred',
        status: 0,
        code: 'UNKNOWN_ERROR'
      });
    }
  }

  // GET request
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let finalEndpoint = endpoint;

    if (params) {
      const url = new URL(endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
      finalEndpoint = endpoint.startsWith('http') ? url.toString() : endpoint + '?' + url.searchParams.toString();
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

  // POST with custom headers
  async postWithHeaders<T = any>(endpoint: string, data: any, headers: Record<string, string>): Promise<ApiResponse<T>> {
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

  // PATCH request
  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
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

// Export service instance
export const apiService = new ApiService();

// Legacy compatibility - simple API call function
export const apiCall = async <T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  return await apiService.makeRequest<T>(url, options);
};