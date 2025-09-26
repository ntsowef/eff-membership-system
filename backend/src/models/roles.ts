import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Role interfaces
export interface Role {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions?: number[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: number[];
}

// Role model class
export class RoleModel {
  // Get all roles
  static async getAllRoles(): Promise<Role[]> {
    try {
      const query = `
        SELECT id, name, description, created_at, updated_at
        FROM roles
        ORDER BY name
      `;
      
      return await executeQuery<Role>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch roles', error);
    }
  }

  // Get role by ID
  static async getRoleById(id: number): Promise<Role | null> {
    try {
      const query = `
        SELECT id, name, description, created_at, updated_at
        FROM roles
        WHERE id = ?
      `;
      
      return await executeQuerySingle<Role>(query, [id]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch role', error);
    }
  }

  // Get role by name
  static async getRoleByName(name: string): Promise<Role | null> {
    try {
      const query = `
        SELECT id, name, description, created_at, updated_at
        FROM roles
        WHERE name = ?
      `;
      
      return await executeQuerySingle<Role>(query, [name]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch role by name', error);
    }
  }

  // Get role with permissions
  static async getRoleWithPermissions(id: number): Promise<RoleWithPermissions | null> {
    try {
      const role = await this.getRoleById(id);
      if (!role) {
        return null;
      }

      const permissionsQuery = `
        SELECT p.id, p.name, p.description, p.resource, p.action, p.created_at, p.updated_at
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
        ORDER BY p.resource, p.action
      `;

      const permissions = await executeQuery<Permission>(permissionsQuery, [id]);

      return {
        ...role,
        permissions
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch role with permissions', error);
    }
  }

  // Create new role
  static async createRole(roleData: CreateRoleData): Promise<number> {
    try {
      const query = `
        INSERT INTO roles (name, description)
        VALUES (?, ?)
      `;
      
      const params = [
        roleData.name,
        roleData.description || null
      ];
      
      const result = await executeQuery(query, params);
      const roleId = result.insertId;

      // Add permissions if provided
      if (roleData.permissions && roleData.permissions.length > 0) {
        await this.assignPermissionsToRole(roleId, roleData.permissions);
      }

      return roleId;
    } catch (error) {
      throw createDatabaseError('Failed to create role', error);
    }
  }

  // Update role
  static async updateRole(id: number, roleData: UpdateRoleData): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      
      if (roleData.name !== undefined) {
        fields.push('name = ?');
        params.push(roleData.name);
      }
      
      if (roleData.description !== undefined) {
        fields.push('description = ?');
        params.push(roleData.description);
      }
      
      if (fields.length === 0 && !roleData.permissions) {
        return false;
      }
      
      // Update role basic info if there are fields to update
      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);
        
        const query = `UPDATE roles SET ${fields.join(', ')} WHERE id = ?`;
        await executeQuery(query, params);
      }

      // Update permissions if provided
      if (roleData.permissions !== undefined) {
        await this.updateRolePermissions(id, roleData.permissions);
      }
      
      return true;
    } catch (error) {
      throw createDatabaseError('Failed to update role', error);
    }
  }

  // Delete role
  static async deleteRole(id: number): Promise<boolean> {
    try {
      // First remove all role permissions
      await executeQuery('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      
      // Then delete the role
      const query = 'DELETE FROM roles WHERE id = ?';
      const result = await executeQuery(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete role', error);
    }
  }

  // Assign permissions to role
  static async assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<void> {
    try {
      if (permissionIds.length === 0) {
        return;
      }

      const values = permissionIds.map(permissionId => `(${roleId}, ${permissionId})`).join(', ');
      const query = `
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        VALUES ${values}
      `;

      await executeQuery(query);
    } catch (error) {
      throw createDatabaseError('Failed to assign permissions to role', error);
    }
  }

  // Remove permissions from role
  static async removePermissionsFromRole(roleId: number, permissionIds: number[]): Promise<void> {
    try {
      if (permissionIds.length === 0) {
        return;
      }

      const placeholders = permissionIds.map(() => '?').join(', ');
      const query = `
        DELETE FROM role_permissions 
        WHERE role_id = ? AND permission_id IN (${placeholders})
      `;

      await executeQuery(query, [roleId, ...permissionIds]);
    } catch (error) {
      throw createDatabaseError('Failed to remove permissions from role', error);
    }
  }

  // Update role permissions (replace all)
  static async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    try {
      // Remove all existing permissions
      await executeQuery('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

      // Add new permissions
      if (permissionIds.length > 0) {
        await this.assignPermissionsToRole(roleId, permissionIds);
      }
    } catch (error) {
      throw createDatabaseError('Failed to update role permissions', error);
    }
  }

  // Get all permissions
  static async getAllPermissions(): Promise<Permission[]> {
    try {
      const query = `
        SELECT id, name, description, resource, action, created_at, updated_at
        FROM permissions
        ORDER BY resource, action
      `;
      
      return await executeQuery<Permission>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch permissions', error);
    }
  }

  // Get permissions by resource
  static async getPermissionsByResource(resource: string): Promise<Permission[]> {
    try {
      const query = `
        SELECT id, name, description, resource, action, created_at, updated_at
        FROM permissions
        WHERE resource = ?
        ORDER BY action
      `;
      
      return await executeQuery<Permission>(query, [resource]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch permissions by resource', error);
    }
  }

  // Check if user has permission
  static async userHasPermission(userId: number, permissionName: string): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM users u
        INNER JOIN roles r ON u.role_id = r.id
        INNER JOIN role_permissions rp ON r.id = rp.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = ? AND p.name = ? AND u.is_active = TRUE
      `;

      const result = await executeQuerySingle<{ count: number }>(query, [userId, permissionName]);
      return (result?.count || 0) > 0;
    } catch (error) {
      throw createDatabaseError('Failed to check user permission', error);
    }
  }

  // Get user permissions
  static async getUserPermissions(userId: number): Promise<Permission[]> {
    try {
      const query = `
        SELECT DISTINCT p.id, p.name, p.description, p.resource, p.action, p.created_at, p.updated_at
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN roles r ON rp.role_id = r.id
        INNER JOIN users u ON r.id = u.role_id
        WHERE u.id = ? AND u.is_active = TRUE
        ORDER BY p.resource, p.action
      `;

      return await executeQuery<Permission>(query, [userId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch user permissions', error);
    }
  }
}
