import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Chip,
  Box,
  Collapse
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  Devices as DevicesIcon,
  ExpandLess,
  ExpandMore,
  PersonAdd as PersonAddIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import { useAuth } from '../../store';
import { usePermissionCheck } from '../../hooks/useRolePermissions';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string;
  adminLevel?: 'national' | 'province' | 'district' | 'municipality' | 'ward';
  requireUserManagement?: boolean;
  requireSMS?: boolean;
  requireElectionManagement?: boolean;
  adminLevels?: ('national' | 'province' | 'district' | 'municipality' | 'ward')[];
  children?: NavigationItem[];
}

const AdminNavigation: React.FC = () => {
  const { user, hasPermission, hasAdminLevel, canAccessUserManagement } = useAuth();
  const { permissions } = usePermissionCheck();
  const navigate = useNavigate();
  const location = useLocation();
  const [openSections, setOpenSections] = React.useState<string[]>(['user-management']);

  const handleToggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard'
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: <AdminIcon />,
      requireUserManagement: true,
      children: [
        {
          id: 'user-dashboard',
          label: 'Overview',
          icon: <DashboardIcon />,
          path: '/system/user-management',
          requireUserManagement: true
        },
        {
          id: 'admin-users',
          label: 'Admin Users',
          icon: <PeopleIcon />,
          path: '/system/user-management?tab=1',
          requireUserManagement: true
        },
        {
          id: 'pending-approvals',
          label: 'Pending Approvals',
          icon: <AssignmentIcon />,
          path: '/system/user-management?tab=2',
          requireUserManagement: true
        },
        {
          id: 'sessions',
          label: 'Sessions',
          icon: <DevicesIcon />,
          path: '/system/user-management?tab=3',
          requireUserManagement: true
        },
        {
          id: 'security-settings',
          label: 'Security',
          icon: <SecurityIcon />,
          path: '/system/user-management?tab=4',
          requireUserManagement: true
        }
      ]
    },
    {
      id: 'members',
      label: 'Members',
      icon: <GroupIcon />,
      permission: 'members.read',
      children: [
        {
          id: 'member-list',
          label: 'Member Directory',
          icon: <PeopleIcon />,
          path: '/members',
          permission: 'members.read'
        },
        {
          id: 'add-member',
          label: 'Add Member',
          icon: <PersonAddIcon />,
          path: '/members/add',
          permission: 'members.create'
        }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <AnalyticsIcon />,
      permission: 'analytics.view',
      children: [
        {
          id: 'dashboard-analytics',
          label: 'Dashboard',
          icon: <DashboardIcon />,
          path: '/analytics/dashboard',
          permission: 'analytics.view'
        },
        {
          id: 'membership-analytics',
          label: 'Membership',
          icon: <GroupIcon />,
          path: '/analytics/membership',
          permission: 'analytics.view'
        }
      ]
    },
    {
      id: 'system',
      label: 'System',
      icon: <SettingsIcon />,
      adminLevel: 'province',
      children: [
        {
          id: 'system-health',
          label: 'System Health',
          icon: <ShieldIcon />,
          path: '/system/health',
          adminLevel: 'province'
        },
        {
          id: 'system-settings',
          label: 'Settings',
          icon: <SettingsIcon />,
          path: '/system/settings',
          adminLevel: 'national'
        }
      ]
    }
  ];

  const isItemVisible = (item: NavigationItem): boolean => {
    if (item.requireUserManagement && !canAccessUserManagement()) {
      return false;
    }
    
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    
    if (item.adminLevel && !hasAdminLevel(item.adminLevel)) {
      return false;
    }
    
    return true;
  };

  const isItemActive = (item: NavigationItem): boolean => {
    if (!item.path) return false;
    return location.pathname === item.path || location.pathname.startsWith(item.path);
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    if (!isItemVisible(item)) {
      return null;
    }

    const hasChildren = item.children && item.children.some(child => isItemVisible(child));
    const isOpen = openSections.includes(item.id);
    const isActive = isItemActive(item);

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ pl: level * 2 }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleToggleSection(item.id);
              } else if (item.path) {
                navigate(item.path);
              }
            }}
            selected={isActive}
            sx={{
              borderRadius: 1,
              mx: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText'
                }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                variant: level === 0 ? 'subtitle2' : 'body2',
                fontWeight: level === 0 ? 'medium' : 'normal'
              }}
            />
            {hasChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <Box>
      {/* User Info */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>
          {user.name || `${user.firstname} ${user.surname}`.trim()}
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip 
            label={user.admin_level} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
          {user.role_name && (
            <Chip 
              label={user.role_name} 
              size="small" 
              color="secondary" 
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ py: 1 }}>
        {navigationItems.map(item => renderNavigationItem(item))}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* Admin Level Info */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="textSecondary" gutterBottom display="block">
          Access Level: {user.admin_level}
        </Typography>
        {user.province_code && (
          <Typography variant="caption" color="textSecondary" display="block">
            Province: {user.province_code}
          </Typography>
        )}
        {user.district_code && (
          <Typography variant="caption" color="textSecondary" display="block">
            District: {user.district_code}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AdminNavigation;
