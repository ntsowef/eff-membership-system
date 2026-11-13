import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Breadcrumbs,
  Link,
  Chip,
} from '@mui/material';
import {
  Dashboard,
  Receipt,
  GroupAdd,
  Refresh,
  Home,
  Business,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import RenewalDashboard from '../../components/renewal/RenewalDashboard';
import RenewalTransactionsTab from '../../components/renewal/RenewalTransactionsTab';
import BulkRenewalProcessor from '../../components/renewal/BulkRenewalProcessor';

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
      id={`renewal-tabpanel-${index}`}
      aria-labelledby={`renewal-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `renewal-tab-${index}`,
    'aria-controls': `renewal-tabpanel-${index}`,
  };
}

const RenewalManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [showBulkProcessor, setShowBulkProcessor] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleProcessRenewal = (memberId: string) => {
    setSelectedMembers([{ member_id: memberId }]);
    setShowBulkProcessor(true);
  };

  const handleSendReminder = async (memberId: string) => {
    try {
      alert(`Renewal reminder sent to member ${memberId}`);
    } catch (error) {
      console.error('Failed to send reminder:', error);
      alert('Failed to send reminder. Please try again.');
    }
  };

  const handleBulkProcessorComplete = (result: any) => {
    console.log('Bulk renewal completed:', result);
    setShowBulkProcessor(false);
    setSelectedMembers([]);
    alert(`Bulk renewal completed: ${result.successful_renewals} successful, ${result.failed_renewals} failed`);
  };

  const handleBulkProcessorCancel = () => {
    setShowBulkProcessor(false);
    setSelectedMembers([]);
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              color="inherit"
              onClick={() => navigate('/admin/dashboard')}
            >
              <Home sx={{ mr: 0.5 }} fontSize="inherit" />
              Dashboard
            </Link>
            <Link
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              color="inherit"
              onClick={() => navigate('/admin')}
            >
              <Business sx={{ mr: 0.5 }} fontSize="inherit" />
              Administration
            </Link>
            <Typography
              sx={{ display: 'flex', alignItems: 'center' }}
              color="text.primary"
            >
              <TrendingUp sx={{ mr: 0.5 }} fontSize="inherit" />
              Renewal Management
            </Typography>
          </Breadcrumbs>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Membership Renewal Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Overview of membership renewals, revenue metrics, and real-time transaction records
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<GroupAdd />}
              onClick={() => setShowBulkProcessor(true)}
            >
              Bulk Renewal
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Refresh Data
            </Button>
          </Box>
        </Box>

        {/* System Status Chips */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label="Real Data Integration: Active"
            color="success"
            variant="outlined"
            size="small"
          />
          <Chip
            label="9 Provinces"
            color="info"
            variant="outlined"
            size="small"
          />
          <Chip
            label="Direct & Self-Service Renewals"
            color="primary"
            variant="outlined"
            size="small"
          />
          <Chip
            label="Proof of Payment Verification"
            color="secondary"
            variant="outlined"
            size="small"
          />
        </Box>
      </Paper>

      {/* Main Content */}
      <Paper sx={{ mx: 3, mb: 3 }}>
        {/* Simplified Tabs: Dashboard & Transactions */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="renewal management tabs"
          >
            <Tab
              label="Dashboard"
              icon={<Dashboard />}
              iconPosition="start"
              {...a11yProps(0)}
            />
            <Tab
              label="Transactions"
              icon={<Receipt />}
              iconPosition="start"
              {...a11yProps(1)}
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <RenewalDashboard
            onProcessRenewal={handleProcessRenewal}
            onSendReminder={handleSendReminder}
            onViewTransactions={() => setActiveTab(1)}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <RenewalTransactionsTab />
        </TabPanel>
      </Paper>

      {/* Bulk Renewal Processor Dialog */}
      <Dialog 
        open={showBulkProcessor} 
        onClose={handleBulkProcessorCancel}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          Bulk Renewal Processing
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <BulkRenewalProcessor
            selectedMembers={selectedMembers}
            onComplete={handleBulkProcessorComplete}
            onCancel={handleBulkProcessorCancel}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default RenewalManagement;
