import axios from 'axios';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: '/api/v1', // Use proxy path
  timeout: 60000, // 60 seconds - increased for PDF generation and large exports
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token, session ID, and CSRF protection
api.interceptors.request.use(
  (config) => {
    // Read token from Zustand persisted storage
    const authStorage = localStorage.getItem('auth-storage');
    let token = null;
    let sessionId = null;

    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token;
        sessionId = parsed.state?.sessionId;
      } catch (error) {
        console.error('❌ Failed to parse auth-storage:', error);
      }
    }

    console.log('🔑 Axios Interceptor - Token from auth-storage:', token ? `${token.substring(0, 20)}...` : 'NULL');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Axios Interceptor - Authorization header added');
    } else {
      console.log('❌ Axios Interceptor - NO TOKEN FOUND in auth-storage!');
    }

    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }

    // Add CSRF protection for state-changing requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      // Add CSRF token from meta tag if available
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }

      // Add custom header to identify legitimate requests
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    console.log('📤 Axios Interceptor - Request config:', {
      url: config.url,
      method: config.method,
      hasAuthHeader: !!config.headers.Authorization
    });

    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: any) => {
    return response;
  },
  (error: any) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access - clear auth data
      // Clear Zustand persisted storage
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('tokenExpiration');
      localStorage.removeItem('sessionExpiration');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

// Common API error type
export interface ApiError {
  success: false;
  message: string;
  error: {
    code: string;
    details?: string | string[];
  };
  timestamp: string;
}

// Generic API functions
export const apiGet = async <T>(url: string, params?: any): Promise<T> => {
  const response = await api.get(url, { params });

  // Check if this is a paginated response (has pagination property)
  if (response.data && typeof response.data === 'object' && 'pagination' in response.data) {
    // For paginated responses, return the entire response structure
    return response.data;
  }

  // Check if this is a standard API response wrapper with data property
  if (response.data && typeof response.data === 'object' && 'data' in response.data && 'success' in response.data) {
    // For analytics and dashboard endpoints, extract the data property
    return response.data.data;
  }

  // For other responses, return as-is
  return response.data;
};

export const apiPost = async <T>(url: string, data?: any): Promise<T> => {
  const response = await api.post(url, data);

  // Check if this is a paginated response (has pagination property)
  if (response.data && typeof response.data === 'object' && 'pagination' in response.data) {
    return response.data;
  }

  // Check if this is a standard API response wrapper with data property
  if (response.data && typeof response.data === 'object' && 'data' in response.data && 'success' in response.data) {
    return response.data.data;
  }

  return response.data;
};

export const apiPut = async <T>(url: string, data?: any): Promise<T> => {
  const response = await api.put(url, data);

  // Check if this is a paginated response (has pagination property)
  if (response.data && typeof response.data === 'object' && 'pagination' in response.data) {
    return response.data;
  }

  // Check if this is a standard API response wrapper with data property
  if (response.data && typeof response.data === 'object' && 'data' in response.data && 'success' in response.data) {
    return response.data.data;
  }

  return response.data;
};

export const apiDelete = async <T>(url: string): Promise<T> => {
  const response = await api.delete(url);

  // Check if this is a paginated response (has pagination property)
  if (response.data && typeof response.data === 'object' && 'pagination' in response.data) {
    return response.data;
  }

  // Check if this is a standard API response wrapper with data property
  if (response.data && typeof response.data === 'object' && 'data' in response.data && 'success' in response.data) {
    return response.data.data;
  }

  return response.data;
};

export const apiPatch = async <T>(url: string, data?: any): Promise<T> => {
  const response = await api.patch(url, data);

  // Check if this is a paginated response (has pagination property)
  if (response.data && typeof response.data === 'object' && 'pagination' in response.data) {
    return response.data;
  }

  // Check if this is a standard API response wrapper with data property
  if (response.data && typeof response.data === 'object' && 'data' in response.data && 'success' in response.data) {
    return response.data.data;
  }

  return response.data;
};

// File upload function
export const apiUpload = async <T>(
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<T> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent: any) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(progress);
      }
    },
  });

  return response.data;
};

export default api;
