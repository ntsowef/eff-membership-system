import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Devices as DevicesIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ProfileInformation from '../../components/profile/ProfileInformation';
import SecuritySettings from '../../components/profile/SecuritySettings';
import SessionManagement from '../../components/profile/SessionManagement';

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
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `profile-tab-${index}`,
    'aria-controls': `profile-tabpanel-${index}`,
  };
}

const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/admin/dashboard');
          }}
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <SettingsIcon sx={{ mr: 0.5 }} fontSize="small" />
          Profile & Settings
        </Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile & Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account information, security settings, and active sessions
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="profile settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<PersonIcon />}
              label="Profile Information"
              {...a11yProps(0)}
              sx={{ minHeight: 72 }}
            />
            <Tab
              icon={<SecurityIcon />}
              label="Security"
              {...a11yProps(1)}
              sx={{ minHeight: 72 }}
            />
            <Tab
              icon={<DevicesIcon />}
              label="Active Sessions"
              {...a11yProps(2)}
              sx={{ minHeight: 72 }}
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          <ProfileInformation />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <SecuritySettings />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <SessionManagement />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default ProfileSettingsPage;

