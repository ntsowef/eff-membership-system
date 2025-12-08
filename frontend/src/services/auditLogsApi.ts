import api from './api';

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface AuditLogFilters {
  entity_type?: string;
  entity_id?: number;
  action?: string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get audit logs with optional filters
 */
export const getAuditLogs = async (filters?: AuditLogFilters): Promise<AuditLog[]> => {
  const response = await api.get('/audit-logs', { params: filters });
  return response.data;
};

/**
 * Get audit logs for a specific delegate
 */
export const getDelegateAuditLogs = async (delegateId: number): Promise<AuditLog[]> => {
  const response = await api.get('/audit-logs', {
    params: {
      entity_type: 'delegate',
      entity_id: delegateId
    }
  });
  return response.data;
};

/**
 * Get all delegate-related audit logs
 */
export const getAllDelegateAuditLogs = async (filters?: Omit<AuditLogFilters, 'entity_type'>): Promise<AuditLog[]> => {
  const response = await api.get('/audit-logs', {
    params: {
      ...filters,
      entity_type: 'delegate'
    }
  });
  return response.data;
};

/**
 * Get audit log by ID
 */
export const getAuditLogById = async (id: number): Promise<AuditLog> => {
  const response = await api.get(`/audit-logs/${id}`);
  return response.data;
};

// Default export
export default {
  getAuditLogs,
  getDelegateAuditLogs,
  getAllDelegateAuditLogs,
  getAuditLogById
};
