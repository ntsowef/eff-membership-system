import { api } from './api';
import type {
  User,
  CreateAdminRequest,
  UserCreationWorkflow,
  UserSession,
  MFAStatus,
  MFASetup,
  UserStatistics,
  AdminListParams,
  WorkflowReviewRequest,
  BulkUpdateRequest,
  GeographicAssignmentRequest
} from '../types/userManagement';

// Types are imported from ../types/userManagement.ts

// User Management API Service
export class UserManagementAPI {
  // Admin Management
  static async getAdmins(params?: AdminListParams) {
    const response = await api.get('/admin-management/admins', { params });
    return response.data;
  }

  static async createAdmin(data: CreateAdminRequest) {
    const response = await api.post('/admin-management/create-admin', data);
    return response.data;
  }

  static async updateUser(userId: number, data: any) {
    const response = await api.put(`/admin-management/users/${userId}`, data);
    return response.data;
  }

  static async resetUserPassword(userId: number, newPassword: string) {
    const response = await api.put(`/admin-management/users/${userId}/reset-password`, {
      new_password: newPassword
    });
    return response.data;
  }

  static async logout() {
    const sessionId = localStorage.getItem('sessionId');
    const response = await api.post('/auth/logout', {}, {
      headers: sessionId ? { 'X-Session-ID': sessionId } : {}
    });
    return response.data;
  }

  static async getAvailableRoles() {
    const response = await api.get('/admin-management/roles');
    return response.data;
  }

  static async getUserStatistics() {
    const response = await api.get('/admin-management/statistics');
    return response.data;
  }

  static async bulkUpdateUsers(data: BulkUpdateRequest) {
    const response = await api.patch('/admin-management/bulk-update', data);
    return response.data;
  }

  static async assignGeographicBoundary(data: GeographicAssignmentRequest) {
    const response = await api.post('/admin-management/assign-geographic-boundary', data);
    return response.data;
  }

  // Workflow Management
  static async getPendingWorkflows() {
    const response = await api.get('/admin-management/workflows/pending');
    return response.data;
  }

  static async reviewWorkflow(workflowId: number, data: WorkflowReviewRequest) {
    const response = await api.patch(`/admin-management/workflows/${workflowId}/review`, data);
    return response.data;
  }

  // Session Management
  static async getMySessions() {
    const response = await api.get('/sessions/my-sessions');
    return response.data;
  }

  static async getSessionLimits() {
    const response = await api.get('/sessions/limits');
    return response.data;
  }

  static async refreshSession() {
    const response = await api.post('/sessions/refresh');
    return response.data;
  }

  static async terminateSession(sessionId: string, reason?: string) {
    const response = await api.post('/sessions/terminate', { session_id: sessionId, reason });
    return response.data;
  }

  static async terminateOtherSessions() {
    const response = await api.post('/sessions/terminate-others');
    return response.data;
  }

  static async terminateAllSessions(reason?: string) {
    const response = await api.post('/sessions/terminate-all', { reason });
    return response.data;
  }

  static async getSessionStatistics() {
    const response = await api.get('/sessions/statistics');
    return response.data;
  }

  // MFA Management
  static async getMFAStatus() {
    const response = await api.get('/mfa/status');
    return response.data;
  }

  static async generateMFASetup() {
    const response = await api.post('/mfa/setup');
    return response.data;
  }

  static async enableMFA(token: string) {
    const response = await api.post('/mfa/enable', { token });
    return response.data;
  }

  static async disableMFA(token: string) {
    const response = await api.post('/mfa/disable', { token });
    return response.data;
  }

  static async verifyMFA(token: string) {
    const response = await api.post('/mfa/verify', { token });
    return response.data;
  }

  static async regenerateBackupCodes(currentToken: string) {
    const response = await api.post('/mfa/backup-codes/regenerate', { current_token: currentToken });
    return response.data;
  }

  static async getMFAStatistics() {
    const response = await api.get('/mfa/statistics');
    return response.data;
  }

  // Authentication
  static async login(email: string, password: string, mfaToken?: string) {
    try {
      // Use the api instance with proper proxy configuration
      const response = await api.post('/auth/login', {
        email,
        password,
        mfa_token: mfaToken
      });
      return response.data;
    } catch (error: any) {
      // Enhanced error handling
      if (error.response) {
        // Server responded with error status
        throw error;
      } else if (error.request) {
        // Network error
        throw {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to server. Please check your internet connection.',
          response: { status: 0 }
        };
      } else {
        // Other error
        throw {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred. Please try again.',
          response: { status: 0 }
        };
      }
    }
  }

  static async validateToken() {
    const response = await api.get('/auth/validate');
    return response.data;
  }

  static async refreshToken() {
    const response = await api.post('/auth/refresh');
    return response.data;
  }

  // Profile Management
  static async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  }

  static async updateProfile(data: {
    name?: string;
    email?: string;
    current_password?: string;
    new_password?: string;
  }) {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  }
}
