import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Sms as SmsIcon,
  HowToVote as ElectionIcon,
  SupervisorAccount as UserIcon,
  Settings as SystemIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useAuth } from '../../store';
import { usePermissionCheck } from '../../hooks/useRolePermissions';

export const PermissionDemo: React.FC = () => {
  const { user } = useAuth();
  const { permissions, getAdminLevelDisplay, getAccessScope } = usePermissionCheck();

  const permissionItems = [
    {
      label: 'SMS Communication',
      icon: <SmsIcon />,
      hasPermission: permissions.canAccessSMS,
      description: 'Send SMS messages and manage SMS campaigns (National Admin only)'
    },
    {
      label: 'Election Management',
      icon: <ElectionIcon />,
      hasPermission: permissions.canAccessElectionManagement,
      description: 'Create and manage elections (National & Provincial Admin only)'
    },
    {
      label: 'User Management',
      icon: <UserIcon />,
      hasPermission: permissions.canManageUsers,
      description: 'Manage user accounts and permissions (National & Provincial Admin)'
    },
    {
      label: 'System Settings',
      icon: <SystemIcon />,
      hasPermission: permissions.canViewSystemSettings,
      description: 'Access system configuration and settings (National Admin only)'
    },
    {
      label: 'Admin Management',
      icon: <AdminIcon />,
      hasPermission: permissions.canAccessNationalFeatures,
      description: 'Manage admin users and roles (National Admin only)'
    }
  ];

  if (!user) {
    return (
      <Alert severity="warning">
        Please log in to view permission information.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Permission System Demo
      </Typography>
      
      <Grid container spacing={3}>
        {/* User Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current User Information
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Email: {user.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Name: {user.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Admin Level: {getAdminLevelDisplay()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Access Scope: {getAccessScope()}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={user.admin_level || 'No Level'} 
                  color="primary" 
                  size="small" 
                />
                {user.role_name && (
                  <Chip 
                    label={user.role_name} 
                    color="secondary" 
                    size="small" 
                  />
                )}
                {user.province_code && (
                  <Chip 
                    label={`Province: ${user.province_code}`} 
                    color="info" 
                    size="small" 
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Permission Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Feature Access Permissions
              </Typography>
              
              <List dense>
                {permissionItems.map((item, index) => (
                  <React.Fragment key={item.label}>
                    <ListItem>
                      <ListItemIcon>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {item.label}
                            </Typography>
                            {item.hasPermission ? (
                              <CheckIcon color="success" fontSize="small" />
                            ) : (
                              <CancelIcon color="error" fontSize="small" />
                            )}
                          </Box>
                        }
                        secondary={item.description}
                      />
                    </ListItem>
                    {index < permissionItems.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar Visibility Info */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sidebar Menu Visibility
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Based on your current permissions, certain menu items in the sidebar will be hidden:
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      SMS Communication
                    </Typography>
                    <Chip 
                      label={permissions.canAccessSMS ? 'Visible' : 'Hidden'} 
                      color={permissions.canAccessSMS ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Elections
                    </Typography>
                    <Chip 
                      label={permissions.canAccessElectionManagement ? 'Visible' : 'Hidden'} 
                      color={permissions.canAccessElectionManagement ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      User Management
                    </Typography>
                    <Chip 
                      label={permissions.canManageUsers ? 'Visible' : 'Hidden'} 
                      color={permissions.canManageUsers ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      System Settings
                    </Typography>
                    <Chip 
                      label={permissions.canViewSystemSettings ? 'Visible' : 'Hidden'} 
                      color={permissions.canViewSystemSettings ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PermissionDemo;
