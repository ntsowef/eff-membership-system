import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Devices as DevicesIcon,
  Assignment as AssignmentIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { Provider } from 'react-redux';
import { store } from '../../store/reduxStore';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import UserManagementDashboard from '../../components/user-management/UserManagementDashboard';
import AdminList from '../../components/user-management/AdminList';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-management-tabpanel-${index}`}
      aria-labelledby={`user-management-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `user-management-tab-${index}`,
    'aria-controls': `user-management-tabpanel-${index}`,
  };
}

const UserManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <ProtectedRoute requireUserManagement={false} developmentMode={true}>
      <Provider store={store}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center' }}
            color="inherit"
            href="/"
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center' }}
            color="inherit"
            href="/system"
          >
            System
          </Link>
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            <SecurityIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            User Management
          </Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Box mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            User Management System
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage admin users, permissions, security settings, and user workflows
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="user management tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                icon={<DashboardIcon />}
                label="Dashboard"
                {...a11yProps(0)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<PeopleIcon />}
                label="Admin Users"
                {...a11yProps(1)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<AssignmentIcon />}
                label="Pending Approvals"
                {...a11yProps(2)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<DevicesIcon />}
                label="Sessions"
                {...a11yProps(3)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<SecurityIcon />}
                label="Security"
                {...a11yProps(4)}
                sx={{ minHeight: 72 }}
              />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <TabPanel value={tabValue} index={0}>
            <UserManagementDashboard />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <AdminList />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Pending User Creation Approvals
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Review and approve pending admin user creation requests.
              </Typography>
              {/* TODO: Add PendingApprovals component */}
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Session Management
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Monitor and manage active user sessions across the system.
              </Typography>
              {/* TODO: Add SessionManagement component */}
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Security Settings
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Configure multi-factor authentication, password policies, and security settings.
              </Typography>
              {/* TODO: Add SecuritySettings component */}
            </Box>
          </TabPanel>
        </Paper>
        </Container>
      </Provider>
    </ProtectedRoute>
  );
};

export default UserManagement;
