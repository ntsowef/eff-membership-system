import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Collapse,
  useTheme,
  alpha,
} from '@mui/material';
import effLogo from '../../assets/images/EFF_Reglogo.png';
import {
  Dashboard,
  People,
  PersonAdd,
  HowToVote,
  Event,
  Sms,
  Settings,
  ExpandLess,
  ExpandMore,
  Assignment,
  SupervisorAccount,
  AdminPanelSettings,
  BarChart,
  Assessment,
  Analytics,
  Schedule,
  Warning,
  TrendingUp,
  Search,
  LocationOn,
  HowToReg,
  Place,
  AccountBalance,
  History,
  AccountCircle,
  AccountTree,
  CloudUpload,
  Groups,
  WhatsApp,
  Security,
  AccountBalanceWallet,
  CreditCard as CardIcon,
  PersonOff as PersonOffIcon,
} from '@mui/icons-material';
import { useAuth } from '../../store';
import LogoutButton from '../auth/LogoutButton';
import { usePermissionCheck } from '../../hooks/useRolePermissions';

interface SidebarProps {
  onClose?: () => void;
}

// ─── Shared Menu Types & Data ──────────────────────────────────────────────────
export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  path?: string;
  children?: MenuItem[];
  requireSMS?: boolean;
  requireElectionManagement?: boolean;
  requireDelegatesManagement?: boolean;
  adminLevels?: ('national' | 'province' | 'district' | 'municipality' | 'ward')[];
  permissions?: string[];
}

/**
 * Reorganised menu items – elections removed, grouped logically:
 * Dashboards → Membership → Search → Leadership & Meetings →
 * Communication → Finance → Analytics → Audit & Compliance → Administration → Profile
 */
export const menuItems: MenuItem[] = [
  // ── Dashboards ──
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Dashboard />,
    path: '/admin/dashboard',
  },
  {
    id: 'hierarchical-dashboard',
    label: 'Hierarchical Dashboard',
    icon: <AccountTree />,
    path: '/admin/dashboard/hierarchical',
    adminLevels: ['national', 'province', 'municipality'],
  },

  // ── Membership ──
  {
    id: 'members',
    label: 'Members',
    icon: <People />,
    children: [
      {
        id: 'members-list',
        label: 'All Members',
        icon: <People />,
        path: '/admin/members',
      },
      {
        id: 'members-new',
        label: 'Add Member',
        icon: <PersonAdd />,
        path: '/admin/members/new',
      },
      {
        id: 'members-bulk-upload',
        label: 'Bulk Upload',
        icon: <CloudUpload />,
        path: '/admin/members/bulk-upload',
      },
      {
        id: 'membership-expiration',
        label: 'Expiration Management',
        icon: <Schedule />,
        path: '/admin/membership-expiration',
      },
      {
        id: 'renewal-management',
        label: 'Renewal Management',
        icon: <TrendingUp />,
        path: '/admin/renewal-management',
        adminLevels: ['national'],
      },
      {
        id: 'digital-cards',
        label: 'Digital Membership Cards',
        icon: <CardIcon />,
        path: '/admin/digital-cards',
      },
    ],
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: <Assignment />,
    path: '/admin/applications',
    adminLevels: ['national'],
  },

  // ── Search & Lookup ──
  {
    id: 'search',
    label: 'Search & Lookup',
    icon: <Search />,
    children: [
      {
        id: 'search-members',
        label: 'Member Search',
        icon: <People />,
        path: '/admin/search/members',
      },
      {
        id: 'search-geographic',
        label: 'Geographic Search',
        icon: <LocationOn />,
        path: '/admin/search/geographic',
      },
      {
        id: 'search-voting-districts',
        label: 'Voting Districts',
        icon: <HowToReg />,
        path: '/admin/search/voting-districts',
      },
      {
        id: 'search-voting-stations',
        label: 'Voting Stations',
        icon: <Place />,
        path: '/admin/search/voting-stations',
      },
    ],
  },

  // ── Leadership & Meetings ──
  {
    id: 'leadership',
    label: 'Leadership',
    icon: <SupervisorAccount />,
    path: '/admin/leadership',
    adminLevels: ['national', 'province'],
  },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: <Event />,
    children: [
      {
        id: 'meetings-list',
        label: 'All Meetings',
        icon: <Event />,
        path: '/admin/meetings',
      },
      {
        id: 'meetings-hierarchical',
        label: 'Hierarchical Meetings',
        icon: <AccountTree />,
        path: '/admin/meetings/hierarchical',
      },
      {
        id: 'meetings-new',
        label: 'Schedule Meeting',
        icon: <Event />,
        path: '/admin/meetings/new',
      },
      {
        id: 'meetings-hierarchical-new',
        label: 'Schedule Hierarchical Meeting',
        icon: <AccountTree />,
        path: '/admin/meetings/hierarchical/new',
      },
    ],
  },

  // ── Communication ──
  {
    id: 'sms',
    label: 'SMS Communication',
    icon: <Sms />,
    requireSMS: true,
    children: [
      {
        id: 'sms-management',
        label: 'SMS Management',
        icon: <Sms />,
        path: '/admin/sms',
      },
      {
        id: 'voter-registration-sms',
        label: 'Voter Registration SMS',
        icon: <HowToVote />,
        path: '/admin/voter-registration-sms',
      },
      {
        id: 'membership-renewal-sms',
        label: 'Membership Renewal SMS',
        icon: <Schedule />,
        path: '/admin/membership-renewal-sms',
      },
      {
        id: 'sms-credits',
        label: 'SMS Credits',
        icon: <AccountBalanceWallet />,
        path: '/admin/sms-credits',
      },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Communication',
    icon: <WhatsApp />,
    path: '/admin/whatsapp',
    requireSMS: true,
  },

  // ── Finance ──
  {
    id: 'financial-dashboard',
    label: 'Financial Dashboard',
    icon: <AccountBalance />,
    path: '/admin/financial-dashboard',
    adminLevels: ['national'],
  },
  {
    id: 'financial-transactions',
    label: 'Transaction History',
    icon: <History />,
    path: '/admin/financial-transactions',
    adminLevels: ['national'],
  },

  // ── Analytics & Reports ──
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <Analytics />,
    children: [
      {
        id: 'analytics-dashboard',
        label: 'Dashboard',
        icon: <BarChart />,
        path: '/admin/analytics',
      },
      {
        id: 'business-intelligence',
        label: 'Business Intelligence',
        icon: <Assessment />,
        path: '/admin/business-intelligence',
        adminLevels: ['national'],
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: <Assignment />,
        path: '/admin/reports',
      },
    ],
  },

  // ── Audit & Compliance ──
  {
    id: 'lge2026',
    label: 'LGE2026',
    icon: <HowToVote />,
    children: [
      {
        id: 'lge2026-ward-audits',
        label: 'Ward Audits',
        icon: <Assessment />,
        path: '/admin/ward-audit',
      },
      {
        id: 'lge2026-candidates-list',
        label: 'Ward Candidates List',
        icon: <People />,
        path: '/admin/lge2026/candidates',
      },
      {
        id: 'lge2026-candidate-selection',
        label: 'Ward Candidate Selection',
        icon: <HowToReg />,
        path: '/admin/lge2026/candidate-selection',
      },
    ],
    adminLevels: ['national', 'province'],
  },
  {
    id: 'ward-audit',
    label: 'Ward Audit System',
    icon: <HowToReg />,
    children: [
      {
        id: 'ward-audit-dashboard',
        label: 'Ward Compliance',
        icon: <Assessment />,
        path: '/admin/ward-audit',
      },
      {
        id: 'srpa-delegate-setter',
        label: 'SRPA Delegate Setter',
        icon: <Settings />,
        path: '/admin/srpa-delegate-setter',
      },
    ],
    adminLevels: ['national', 'province'],
  },
  {
    id: 'delegates-management',
    label: 'Delegates Management',
    icon: <Groups />,
    path: '/admin/delegates-management',
    requireDelegatesManagement: true,
  },
  {
    id: 'self-data-management',
    label: 'Self Data Management',
    icon: <CloudUpload />,
    path: '/admin/self-data-management',
    adminLevels: ['national', 'province'],
  },
  {
    id: 'audit',
    label: 'Member Audit',
    icon: <Warning />,
    children: [
      {
        id: 'audit-dashboard',
        label: 'Audit Dashboard',
        icon: <Assessment />,
        path: '/admin/audit',
      },
      {
        id: 'audit-members',
        label: 'Member Audit Report',
        icon: <People />,
        path: '/admin/audit/members',
      },
      {
        id: 'audit-wards',
        label: 'Ward Audit Report',
        icon: <Dashboard />,
        path: '/admin/audit/wards',
      },
      {
        id: 'audit-municipalities',
        label: 'Municipality Report',
        icon: <BarChart />,
        path: '/admin/audit/municipalities',
      },
      {
        id: 'ward-membership-audit',
        label: 'Ward Membership Audit',
        icon: <Assessment />,
        path: '/admin/audit/ward-membership',
      },
    ],
  },

  // ── Administration ──
  {
    id: 'users',
    label: 'User Management',
    icon: <SupervisorAccount />,
    path: '/admin/users',
    adminLevels: ['national', 'province'],
  },
  {
    id: 'admin-management',
    label: 'Admin Management',
    icon: <AdminPanelSettings />,
    path: '/admin/admin-management',
    adminLevels: ['national'],
  },
  {
    id: 'mfa-emergency-access',
    label: 'MFA Emergency Access',
    icon: <Security />,
    path: '/admin/mfa-emergency-access',
    adminLevels: ['national'],
  },
  {
    id: 'deceased-purge',
    label: 'Deceased Member Purge',
    icon: <PersonOffIcon />,
    path: '/admin/deceased-purge',
    adminLevels: ['national'],
  },
  {
    id: 'super-admin',
    label: 'Super Admin',
    icon: <AdminPanelSettings />,
    children: [
      {
        id: 'super-admin-dashboard',
        label: 'Dashboard',
        icon: <Dashboard />,
        path: '/admin/super-admin/dashboard',
      },
      {
        id: 'super-admin-system-monitoring',
        label: 'System Monitoring',
        icon: <Assessment />,
        path: '/admin/super-admin/system-monitoring',
      },
      {
        id: 'super-admin-queue-management',
        label: 'Queue Management',
        icon: <CloudUpload />,
        path: '/admin/super-admin/queue-management',
      },
      {
        id: 'super-admin-user-management',
        label: 'User Management',
        icon: <SupervisorAccount />,
        path: '/admin/super-admin/user-management',
      },
      {
        id: 'super-admin-bulk-uploads',
        label: 'Bulk Upload Management',
        icon: <CloudUpload />,
        path: '/admin/super-admin/bulk-uploads',
      },
      {
        id: 'super-admin-audit-logs',
        label: 'Audit & Logs',
        icon: <History />,
        path: '/admin/super-admin/audit-logs',
      },
      {
        id: 'super-admin-configuration',
        label: 'Configuration',
        icon: <Settings />,
        path: '/admin/super-admin/configuration',
      },
      {
        id: 'super-admin-lookup-data',
        label: 'Lookup Data',
        icon: <Assignment />,
        path: '/admin/super-admin/lookup-data',
      },
    ],
    permissions: ['super_admin_only'],
  },
  {
    id: 'system',
    label: 'System',
    icon: <Settings />,
    path: '/admin/system',
    adminLevels: ['national'],
  },

  // ── Profile ──
  {
    id: 'profile',
    label: 'Profile & Settings',
    icon: <AccountCircle />,
    path: '/admin/profile',
  },
];

// ─── Shared permission helpers (used by both Sidebar and HorizontalNav) ──────
export function isMenuItemVisible(
  item: MenuItem,
  permissions: { canAccessSMSManagement: boolean; canAccessElectionManagement: boolean; canAccessDelegatesManagement: boolean },
  user: { admin_level?: string; role?: string } | null,
): boolean {
  if (item.requireSMS && !permissions.canAccessSMSManagement) return false;
  if (item.requireElectionManagement && !permissions.canAccessElectionManagement) return false;
  if (item.requireDelegatesManagement && !permissions.canAccessDelegatesManagement) return false;

  if (item.adminLevels && item.adminLevels.length > 0) {
    const userAdminLevel = user?.admin_level;
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    if (isSuperAdmin) return true;
    if (!userAdminLevel || userAdminLevel === 'none' || !item.adminLevels.includes(userAdminLevel as any)) return false;
  }

  if (item.permissions && item.permissions.length > 0) {
    const isFinancialReviewer = user?.role === 'FINANCIAL_REVIEWER' || user?.role === 'FINANCIAL_APPROVER';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isMembershipApprover = user?.role === 'MEMBERSHIP_APPROVER';
    const isNationalAdmin = user?.admin_level === 'national';
    const isProvincialAdmin = user?.admin_level === 'province';

    if (item.permissions.includes('super_admin_only')) return isSuperAdmin;
    if (item.permissions.some(p => p.startsWith('financial.'))) {
      return isFinancialReviewer || isSuperAdmin || isMembershipApprover || isNationalAdmin || isProvincialAdmin;
    }
    return true;
  }

  return true;
}

export function getVisibleMenuItems(
  items: MenuItem[],
  permissions: { canAccessSMSManagement: boolean; canAccessElectionManagement: boolean; canAccessDelegatesManagement: boolean },
  user: { admin_level?: string; role?: string } | null,
): MenuItem[] {
  return items
    .filter(item => isMenuItemVisible(item, permissions, user))
    .map(item => ({
      ...item,
      children: item.children ? getVisibleMenuItems(item.children, permissions, user) : undefined,
    }))
    .filter(item => !item.children || item.children.length > 0);
}

// ─── Sidebar Component ──────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { permissions } = usePermissionCheck();
  const [openItems, setOpenItems] = React.useState<string[]>([]);

  const visibleMenuItems = getVisibleMenuItems(menuItems, permissions, user);

  const handleItemClick = (item: MenuItem) => {
    if (item.children) {
      setOpenItems(prev =>
        prev.includes(item.id)
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      );
    } else if (item.path) {
      navigate(item.path);
      onClose?.();
    }
  };

  const isItemActive = (path: string) => location.pathname === path;

  const isParentActive = (item: MenuItem): boolean => {
    if (item.path && isItemActive(item.path)) return true;
    if (item.children) return item.children.some(child => child.path && isItemActive(child.path));
    return false;
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openItems.includes(item.id);
    const isActive = isParentActive(item);

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            selected={isActive}
            sx={{
              pl: 2 + level * 2,
              borderRadius: level === 0 ? '12px' : '8px',
              mx: level === 0 ? 1 : 0.5,
              my: 0.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: '#055305',
                color: '#FFFFFF',
                transform: 'translateX(4px)',
                '& .MuiListItemIcon-root': {
                  color: '#FFFFFF',
                },
              },
              '&.Mui-selected': {
                backgroundColor: '#FFAB00',
                color: '#000000',
                fontWeight: 600,
                boxShadow: '0px 4px 12px rgba(255, 171, 0, 0.3)',
                '&:hover': {
                  backgroundColor: '#FF8F00',
                  color: '#000000',
                },
                '& .MuiListItemIcon-root': {
                  color: '#000000',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: isActive ? 'inherit' : alpha('#FFFFFF', 0.8),
                transition: 'color 0.3s ease',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: level > 0 ? '0.875rem' : '1rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'inherit' : alpha('#FFFFFF', 0.9),
              }}
            />
            {hasChildren && (
              isOpen ?
                <ExpandLess sx={{ color: isActive ? 'inherit' : alpha('#FFFFFF', 0.8) }} /> :
                <ExpandMore sx={{ color: isActive ? 'inherit' : alpha('#FFFFFF', 0.8) }} />
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.9)} 100%)`,
        color: '#FFFFFF',
      }}
    >
      <Toolbar
        sx={{
          background: '#FFFFFF',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          minHeight: '80px !important',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: `3px solid ${theme.palette.primary.main}`,
        }}
      >
        <Box
          component="img"
          src={effLogo}
          alt="EFF Logo"
          sx={{
            width: 48,
            height: 48,
            objectFit: 'contain'
          }}
        />
        <Box>
          <Typography
            variant="h5"
            noWrap
            component="div"
            sx={{
              fontWeight: 700,
              fontSize: '1.5rem',
              color: theme.palette.primary.main,
              textShadow: 'none',
            }}
          >
            EFF
          </Typography>
          <Typography
            variant="caption"
            noWrap
            component="div"
            sx={{
              fontWeight: 500,
              fontSize: '0.75rem',
              color: theme.palette.text.secondary,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Membership Portal
          </Typography>
        </Box>
      </Toolbar>

      <Divider sx={{ borderColor: alpha('#FFFFFF', 0.2) }} />

      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          px: 1,
          py: 2,
        }}
      >
        <List sx={{ '& .MuiListItem-root': { px: 0 } }}>
          {visibleMenuItems.map(item => renderMenuItem(item))}
        </List>
      </Box>

      <Divider sx={{ borderColor: alpha('#FFFFFF', 0.2) }} />

      {/* User Information and Logout Section */}
      <Box
        sx={{
          p: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.7)} 100%)`,
        }}
      >
        {/* User Info */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            background: alpha('#FFFFFF', 0.1),
            border: `1px solid ${alpha('#FFFFFF', 0.2)}`,
          }}
        >
          <AccountCircle
            sx={{
              fontSize: 32,
              color: alpha('#FFFFFF', 0.9),
              mr: 1.5,
            }}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name || 'User'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: alpha('#FFFFFF', 0.8),
                fontSize: '0.75rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {user?.email || 'user@example.com'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: alpha('#FFFFFF', 0.7),
                fontSize: '0.7rem',
                textTransform: 'capitalize',
                fontWeight: 500,
              }}
            >
              {user?.admin_level || 'User'} Admin
            </Typography>
          </Box>
        </Box>

        {/* Logout Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <LogoutButton variant="button" />
        </Box>

        {/* System Version */}
        <Box sx={{ textAlign: 'center', mt: 2, pt: 1.5, borderTop: `1px solid ${alpha('#FFFFFF', 0.2)}` }}>
          <Typography
            variant="caption"
            sx={{
              color: alpha('#FFFFFF', 0.6),
              fontSize: '0.7rem',
            }}
          >
            EFF Membership System v1.0.0
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;
