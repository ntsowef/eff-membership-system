// War Council Structure Access Control Utilities
// Provides client-side permission checking for War Council functionality

export interface User {
  id: number;
  email: string;
  role_name: string;
  admin_level?: string;
  is_active: boolean;
  permissions?: string[];
}

export interface PermissionCheck {
  hasAccess: boolean;
  reason?: string;
  requiredLevel?: string;
  userLevel?: string;
}

/**
 * War Council Permission Manager
 * Handles access control for War Council Structure functionality
 */
export class WarCouncilPermissions {
  
  /**
   * Check if user can view War Council Structure
   */
  static canViewWarCouncil(user: User | null): PermissionCheck {
    if (!user || !user.is_active) {
      return {
        hasAccess: false,
        reason: 'User not authenticated or inactive'
      };
    }

    // Super admin has full access
    if (user.role_name === 'super_admin') {
      return { hasAccess: true };
    }

    // National and Provincial admins can view
    const allowedLevels = ['national', 'province'];
    if (allowedLevels.includes(user.admin_level || '')) {
      return { hasAccess: true };
    }

    return {
      hasAccess: false,
      reason: 'War Council viewing requires National or Provincial Admin access',
      requiredLevel: 'National or Provincial Admin',
      userLevel: user.admin_level || 'None'
    };
  }

  /**
   * Check if user can manage War Council appointments
   */
  static canManageWarCouncilAppointments(user: User | null): PermissionCheck {
    if (!user || !user.is_active) {
      return {
        hasAccess: false,
        reason: 'User not authenticated or inactive'
      };
    }

    // Super admin has full access
    if (user.role_name === 'super_admin') {
      return { hasAccess: true };
    }

    // Only National admins can manage War Council appointments
    const allowedLevels = ['national'];
    if (allowedLevels.includes(user.admin_level || '')) {
      return { hasAccess: true };
    }

    return {
      hasAccess: false,
      reason: 'War Council appointment management requires National Admin access only',
      requiredLevel: 'National Admin',
      userLevel: user.admin_level || 'None'
    };
  }

  /**
   * Check if user can create War Council appointments
   */
  static canCreateWarCouncilAppointments(user: User | null): PermissionCheck {
    return this.canManageWarCouncilAppointments(user);
  }

  /**
   * Check if user can terminate War Council appointments
   */
  static canTerminateWarCouncilAppointments(user: User | null): PermissionCheck {
    return this.canManageWarCouncilAppointments(user);
  }

  /**
   * Check if user can view War Council dashboard
   */
  static canViewWarCouncilDashboard(user: User | null): PermissionCheck {
    return this.canViewWarCouncil(user);
  }

  /**
   * Check if user can access War Council reports
   */
  static canAccessWarCouncilReports(user: User | null): PermissionCheck {
    return this.canViewWarCouncil(user);
  }

  /**
   * Get user's War Council access level
   */
  static getWarCouncilAccessLevel(user: User | null): 'none' | 'view' | 'manage' {
    if (!user || !user.is_active) {
      return 'none';
    }

    if (user.role_name === 'super_admin') {
      return 'manage';
    }

    if (user.admin_level === 'national') {
      return 'manage';
    }

    if (user.admin_level === 'province') {
      return 'view';
    }

    return 'none';
  }

  /**
   * Get permission error message for UI display
   */
  static getPermissionErrorMessage(check: PermissionCheck): string {
    if (check.hasAccess) {
      return '';
    }

    if (check.reason) {
      return check.reason;
    }

    return 'Access denied. Insufficient permissions.';
  }

  /**
   * Check if user can perform specific War Council action
   */
  static canPerformAction(user: User | null, action: WarCouncilAction): PermissionCheck {
    switch (action) {
      case 'view_structure':
      case 'view_dashboard':
        return this.canViewWarCouncil(user);
      
      case 'create_appointment':
      case 'terminate_appointment':
      case 'manage_appointments':
        return this.canManageWarCouncilAppointments(user);
      
      case 'view_reports':
        return this.canAccessWarCouncilReports(user);
      
      default:
        return {
          hasAccess: false,
          reason: 'Unknown action'
        };
    }
  }

  /**
   * Get available actions for user
   */
  static getAvailableActions(user: User | null): WarCouncilAction[] {
    const actions: WarCouncilAction[] = [];
    const accessLevel = this.getWarCouncilAccessLevel(user);

    if (accessLevel === 'none') {
      return actions;
    }

    // View actions available to all authorized users
    if (accessLevel === 'view' || accessLevel === 'manage') {
      actions.push('view_structure', 'view_dashboard', 'view_reports');
    }

    // Management actions only for national admins
    if (accessLevel === 'manage') {
      actions.push('create_appointment', 'terminate_appointment', 'manage_appointments');
    }

    return actions;
  }

  /**
   * Validate user permissions and throw error if insufficient
   */
  static validatePermission(user: User | null, action: WarCouncilAction): void {
    const check = this.canPerformAction(user, action);
    
    if (!check.hasAccess) {
      throw new Error(this.getPermissionErrorMessage(check));
    }
  }

  /**
   * Check if user should see War Council tab in navigation
   */
  static shouldShowWarCouncilTab(user: User | null): boolean {
    return this.canViewWarCouncil(user).hasAccess;
  }

  /**
   * Check if user should see appointment creation buttons
   */
  static shouldShowAppointmentButtons(user: User | null): boolean {
    return this.canManageWarCouncilAppointments(user).hasAccess;
  }

  /**
   * Get permission-based UI configuration
   */
  static getUIConfig(user: User | null): WarCouncilUIConfig {
    const accessLevel = this.getWarCouncilAccessLevel(user);
    
    return {
      showWarCouncilTab: accessLevel !== 'none',
      showDashboard: accessLevel !== 'none',
      showStructure: accessLevel !== 'none',
      showAppointmentButtons: accessLevel === 'manage',
      showTerminationButtons: accessLevel === 'manage',
      showReports: accessLevel !== 'none',
      readOnly: accessLevel === 'view',
      accessLevel
    };
  }
}

// Type definitions
export type WarCouncilAction = 
  | 'view_structure'
  | 'view_dashboard'
  | 'create_appointment'
  | 'terminate_appointment'
  | 'manage_appointments'
  | 'view_reports';

export interface WarCouncilUIConfig {
  showWarCouncilTab: boolean;
  showDashboard: boolean;
  showStructure: boolean;
  showAppointmentButtons: boolean;
  showTerminationButtons: boolean;
  showReports: boolean;
  readOnly: boolean;
  accessLevel: 'none' | 'view' | 'manage';
}

// Permission constants
export const WAR_COUNCIL_PERMISSIONS = {
  VIEW_STRUCTURE: 'war_council:view_structure',
  VIEW_DASHBOARD: 'war_council:view_dashboard',
  CREATE_APPOINTMENT: 'war_council:create_appointment',
  TERMINATE_APPOINTMENT: 'war_council:terminate_appointment',
  MANAGE_APPOINTMENTS: 'war_council:manage_appointments',
  VIEW_REPORTS: 'war_council:view_reports'
} as const;

// Admin levels
export const ADMIN_LEVELS = {
  NATIONAL: 'national',
  PROVINCE: 'province',
  MUNICIPALITY: 'municipality',
  WARD: 'ward'
} as const;

export default WarCouncilPermissions;
