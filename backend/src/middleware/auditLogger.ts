import { Request, Response, NextFunction } from 'express';
import { AuditLogModel, AuditAction, EntityType, CreateAuditLogData } from '../models/auditLogs';

// Re-export types for use in other modules
export { AuditAction, EntityType } from '../models/auditLogs';

// Extended Request interface for audit logging
interface AuditRequest extends Request {
  auditData?: {
    action?: string;
    entityType?: string;
    entityId?: number;
    oldValues?: any;
    newValues?: any;
  };
}

// Utility function to get client IP address
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// Utility function to get session ID from request
const getSessionId = (req: Request): string | undefined => {
  // Try to get session ID from various sources
  return (
    req.headers['x-session-id'] as string ||
    req.cookies?.sessionId ||
    (req as any).session?.id ||
    undefined
  );
};

// Main audit logging function
export const logAudit = async (
  userId: number | undefined,
  action: string,
  entityType: string,
  entityId?: number,
  oldValues?: any,
  newValues?: any,
  req?: Request
): Promise<void> => {
  try {
    const auditData: CreateAuditLogData = {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: req ? getClientIP(req) : undefined,
      user_agent: req?.headers['user-agent'],
      session_id: req ? getSessionId(req) : undefined
    };

    await AuditLogModel.createAuditLog(auditData);
  } catch (error) {
    // Don't throw errors for audit logging to prevent disrupting main operations
    console.error('Audit logging failed:', error);
  }
};

// Middleware to automatically log API requests
export const auditMiddleware = (action?: string, entityType?: string) => {
  return async (req: AuditRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    // Override res.json to capture response data
    res.json = function(body: any) {
      // Restore original res.json
      res.json = originalJson;
      
      // Log the audit entry after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const auditAction = action || req.auditData?.action || inferActionFromMethod(req.method);
        const auditEntityType = entityType || req.auditData?.entityType || inferEntityTypeFromPath(req.path);
        
        // Don't log read operations for sensitive endpoints
        if (auditAction !== 'read' || shouldLogReadOperation(req.path)) {
          logAudit(
            req.user?.id,
            auditAction,
            auditEntityType,
            req.auditData?.entityId || extractEntityIdFromParams(req),
            req.auditData?.oldValues,
            req.auditData?.newValues || extractNewValuesFromBody(req.body),
            req
          );
        }
      }
      
      return originalJson.call(this, body);
    };

    next();
  };
};

// Infer action from HTTP method
const inferActionFromMethod = (method: string): string => {
  switch (method.toUpperCase()) {
    case 'GET':
      return AuditAction.READ;
    case 'POST':
      return AuditAction.CREATE;
    case 'PUT':
    case 'PATCH':
      return AuditAction.UPDATE;
    case 'DELETE':
      return AuditAction.DELETE;
    default:
      return 'unknown';
  }
};

// Infer entity type from request path
const inferEntityTypeFromPath = (path: string): string => {
  if (path.includes('/members')) return EntityType.MEMBER;
  if (path.includes('/membership-applications')) return EntityType.APPLICATION;
  if (path.includes('/documents')) return EntityType.DOCUMENT;
  if (path.includes('/notifications')) return EntityType.NOTIFICATION;
  if (path.includes('/users')) return EntityType.USER;
  if (path.includes('/roles')) return EntityType.ROLE;
  if (path.includes('/permissions')) return EntityType.PERMISSION;
  if (path.includes('/provinces')) return EntityType.PROVINCE;
  if (path.includes('/regions')) return EntityType.REGION;
  if (path.includes('/municipalities')) return EntityType.MUNICIPALITY;
  if (path.includes('/wards')) return EntityType.WARD;
  
  return 'unknown';
};

// Extract entity ID from request parameters
const extractEntityIdFromParams = (req: Request): number | undefined => {
  const id = req.params.id || req.params.memberId || req.params.applicationId || req.params.documentId;
  return id ? parseInt(id) : undefined;
};

// Extract new values from request body (sanitized)
const extractNewValuesFromBody = (body: any): any => {
  if (!body || typeof body !== 'object') return undefined;
  
  // Create a sanitized copy of the body, removing sensitive fields
  const sanitized = { ...body };
  
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.currentPassword;
  delete sanitized.newPassword;
  delete sanitized.token;
  delete sanitized.resetToken;
  
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

// Determine if read operations should be logged for specific paths
const shouldLogReadOperation = (path: string): boolean => {
  // Log read operations for sensitive endpoints
  const sensitiveEndpoints = [
    '/documents',
    '/audit-logs',
    '/users',
    '/admin'
  ];
  
  return sensitiveEndpoints.some(endpoint => path.includes(endpoint));
};

// Specific audit logging functions for common operations

// Authentication audit logging
export const logAuthentication = async (
  email: string,
  success: boolean,
  req: Request,
  userId?: number
): Promise<void> => {
  const action = success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED;
  await logAudit(userId, action, EntityType.USER, userId, undefined, { email }, req);
};

export const logLogout = async (userId: number, req: Request): Promise<void> => {
  await logAudit(userId, AuditAction.LOGOUT, EntityType.USER, userId, undefined, undefined, req);
};

export const logPasswordReset = async (userId: number | undefined, req: Request): Promise<void> => {
  await logAudit(userId, AuditAction.PASSWORD_RESET, EntityType.USER, userId, undefined, undefined, req);
};

export const logPasswordChange = async (userId: number, req: Request): Promise<void> => {
  await logAudit(userId, AuditAction.PASSWORD_CHANGED, EntityType.USER, userId, undefined, undefined, req);
};

// Application audit logging
export const logApplicationSubmission = async (
  userId: number | undefined,
  applicationId: number,
  applicationData: any,
  req: Request
): Promise<void> => {
  await logAudit(
    userId,
    AuditAction.APPLICATION_SUBMITTED,
    EntityType.APPLICATION,
    applicationId,
    undefined,
    applicationData,
    req
  );
};

export const logApplicationReview = async (
  reviewerId: number,
  applicationId: number,
  oldStatus: string,
  newStatus: string,
  req: Request
): Promise<void> => {
  const action = newStatus === 'Approved' ? AuditAction.APPLICATION_APPROVED : AuditAction.APPLICATION_REJECTED;
  await logAudit(
    reviewerId,
    action,
    EntityType.APPLICATION,
    applicationId,
    { status: oldStatus },
    { status: newStatus },
    req
  );
};

// Member audit logging
export const logMemberStatusChange = async (
  userId: number,
  memberId: number,
  oldStatus: string,
  newStatus: string,
  req: Request
): Promise<void> => {
  let action = AuditAction.UPDATE;
  if (newStatus === 'Active') action = AuditAction.MEMBER_ACTIVATED;
  if (newStatus === 'Suspended') action = AuditAction.MEMBER_SUSPENDED;
  
  await logAudit(
    userId,
    action,
    EntityType.MEMBER,
    memberId,
    { status: oldStatus },
    { status: newStatus },
    req
  );
};

// Document audit logging
export const logDocumentUpload = async (
  userId: number,
  documentId: number,
  documentData: any,
  req: Request
): Promise<void> => {
  await logAudit(
    userId,
    AuditAction.DOCUMENT_UPLOADED,
    EntityType.DOCUMENT,
    documentId,
    undefined,
    documentData,
    req
  );
};

export const logDocumentDownload = async (
  userId: number,
  documentId: number,
  req: Request
): Promise<void> => {
  await logAudit(
    userId,
    AuditAction.DOCUMENT_DOWNLOADED,
    EntityType.DOCUMENT,
    documentId,
    undefined,
    undefined,
    req
  );
};

export const logDocumentDeletion = async (
  userId: number,
  documentId: number,
  req: Request
): Promise<void> => {
  await logAudit(
    userId,
    AuditAction.DOCUMENT_DELETED,
    EntityType.DOCUMENT,
    documentId,
    undefined,
    undefined,
    req
  );
};

// User management audit logging
export const logUserCreation = async (
  adminId: number,
  newUserId: number,
  userData: any,
  req: Request
): Promise<void> => {
  await logAudit(
    adminId,
    AuditAction.USER_CREATED,
    EntityType.USER,
    newUserId,
    undefined,
    userData,
    req
  );
};

export const logRoleAssignment = async (
  adminId: number,
  userId: number,
  oldRole: string,
  newRole: string,
  req: Request
): Promise<void> => {
  await logAudit(
    adminId,
    AuditAction.ROLE_ASSIGNED,
    EntityType.USER,
    userId,
    { role: oldRole },
    { role: newRole },
    req
  );
};

// System audit logging
export const logSystemAction = async (
  userId: number | undefined,
  action: string,
  details: any,
  req?: Request
): Promise<void> => {
  await logAudit(userId, action, EntityType.SYSTEM, undefined, undefined, details, req);
};

// Middleware to set audit data on request
export const setAuditData = (
  action: string,
  entityType: string,
  entityId?: number,
  oldValues?: any,
  newValues?: any
) => {
  return (req: AuditRequest, res: Response, next: NextFunction): void => {
    req.auditData = {
      action,
      entityType,
      entityId,
      oldValues,
      newValues
    };
    next();
  };
};
