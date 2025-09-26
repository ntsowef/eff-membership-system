// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    expires_in: string;
    requires_mfa?: boolean;
  };
  timestamp: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  firstname?: string;
  surname?: string;
  phone?: string;
  admin_level: 'national' | 'province' | 'district' | 'municipality' | 'ward' | 'none';
  role_name?: string;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  is_active: boolean;
  mfa_enabled?: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// Province context for filtering
export interface ProvinceContext {
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  filtered_by_province: boolean;
}

// Enhanced user with province filtering context
export interface UserWithContext extends User {
  provinceContext?: ProvinceContext;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface MFAVerificationData {
  token: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// API Error Response
export interface AuthError {
  success: false;
  message: string;
  error: {
    code: string;
    details?: string | string[];
  };
  timestamp: string;
}

// Session Management
export interface UserSession {
  id: string;
  session_id: string;
  user_id: number;
  ip_address: string;
  user_agent: string;
  expires_at: string;
  last_activity: string;
  created_at: string;
  is_current?: boolean;
}

export interface SessionLimits {
  max_concurrent_sessions: number;
  session_timeout_minutes: number;
  idle_timeout_minutes: number;
}

// Permission and Role Types
export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  admin_level: string;
  permissions: Permission[];
}

// Geographic Boundaries
export interface GeographicBoundary {
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  municipal_code?: string;
  municipal_name?: string;
  ward_code?: string;
  ward_name?: string;
}

// Authentication Context
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  verifyMFA: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasAdminLevel: (level: string) => boolean;
  canAccessUserManagement: () => boolean;
}

// Form Validation Types
export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface MFAFormErrors {
  token?: string;
  general?: string;
}

export interface ForgotPasswordFormErrors {
  email?: string;
  general?: string;
}

export interface ResetPasswordFormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

// Security Features
export interface SecuritySettings {
  mfa_enabled: boolean;
  password_expires_at?: string;
  failed_login_attempts: number;
  account_locked_until?: string;
  last_password_change?: string;
  require_password_change: boolean;
}

// Audit and Logging
export interface LoginAttempt {
  id: number;
  email: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason?: string;
  attempted_at: string;
}

export interface SecurityEvent {
  id: number;
  user_id: number;
  event_type: 'login' | 'logout' | 'password_change' | 'mfa_setup' | 'account_locked' | 'suspicious_activity';
  description: string;
  ip_address: string;
  user_agent: string;
  metadata?: Record<string, any>;
  created_at: string;
}
