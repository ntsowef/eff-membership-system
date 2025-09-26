import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Container,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipExpirationApi } from '../../services/membershipExpirationApi';
import { useMembershipExpirationStore } from '../../store/membershipExpirationStore';
import EnhancedMembershipOverview from '../dashboard/EnhancedMembershipOverview';
import ExpiringSoonMembers from './ExpiringSoonMembers';
import ExpiredMembers from './ExpiredMembers';
import type { ExpiringSoonFilters, ExpiredMembersFilters } from '../../types/membershipExpiration';

interface TabPanelProps {
  children?: React.ReactNode;
  index: string;
  value: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`expiration-tabpanel-${index}`}
      aria-labelledby={`expiration-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MembershipExpirationDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const {
    activeTab,
    selectedExpiringSoonMembers,
    selectedExpiredMembers,
    showSMSDialog,
    showRenewalDialog,
    smsNotificationType,
    setActiveTab,
    setShowSMSDialog,
    setShowRenewalDialog,
    setSMSNotificationType,
    clearSelectedMembers
  } = useMembershipExpirationStore();

  // Local state for dialogs
  const [customMessage, setCustomMessage] = useState('');
  const [renewalPeriodMonths, setRenewalPeriodMonths] = useState(12);
  const [sendConfirmationSms, setSendConfirmationSms] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // SMS Notification Mutation
  const smsNotificationMutation = useMutation({
    mutationFn: (data: {
      notification_type: '30_day_reminder' | '7_day_urgent' | 'expired_today' | '7_day_grace';
      member_ids?: string[];
      custom_message?: string;
      send_immediately?: boolean;
    }) => membershipExpirationApi.sendSMSNotifications(data),
    onSuccess: (data) => {
      setSnackbar({
        open: true,
        message: `SMS notifications sent successfully to ${data.data.sent_count} members`,
        severity: 'success'
      });
      setShowSMSDialog(false);
      clearSelectedMembers();
      setCustomMessage('');
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Failed to send SMS notifications: ${error.message}`,
        severity: 'error'
      });
    }
  });

  // Bulk Renewal Mutation
  const bulkRenewalMutation = useMutation({
    mutationFn: (data: {
      member_ids: string[];
      renewal_period_months: number;
      send_confirmation_sms: boolean;
    }) => membershipExpirationApi.bulkRenewal(data),
    onSuccess: (data) => {
      setSnackbar({
        open: true,
        message: `Successfully renewed ${data.data.renewed_count} memberships`,
        severity: 'success'
      });
      setShowRenewalDialog(false);
      clearSelectedMembers();
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['enhanced-membership-overview'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-soon-members'] });
      queryClient.invalidateQueries({ queryKey: ['expired-members'] });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Failed to renew memberships: ${error.message}`,
        severity: 'error'
      });
    }
  });

  // Export PDF Mutation
  const exportPDFMutation = useMutation({
    mutationFn: (filters: any) => membershipExpirationApi.exportToPDF(filters),
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `membership-expiration-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSnackbar({
        open: true,
        message: 'Report exported successfully',
        severity: 'success'
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Failed to export report: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    const tabValues = ['overview', 'expiring-soon', 'expired'];
    setActiveTab(tabValues[newValue] as 'overview' | 'expiring-soon' | 'expired');
  };

  const getTabIndex = (activeTab: string): number => {
    const tabValues = ['overview', 'expiring-soon', 'expired'];
    return tabValues.indexOf(activeTab);
  };

  const handleViewDetails = (type: 'expiring-soon' | 'expired', filter?: string) => {
    if (type === 'expiring-soon') {
      setActiveTab('expiring-soon');
      // Apply filter if provided
      if (filter) {
        // This would update the filters in the store
      }
    } else {
      setActiveTab('expired');
      // Apply filter if provided
      if (filter) {
        // This would update the filters in the store
      }
    }
  };

  const handleSendSMS = (_memberIds: number[], notificationType: string) => {
    setSMSNotificationType(notificationType as any);
    setShowSMSDialog(true);
  };

  const handleBulkRenewal = (_memberIds: number[]) => {
    setShowRenewalDialog(true);
  };

  const handleSendNotifications = (type: '30_day_reminder' | '7_day_urgent' | 'expired_today') => {
    setSMSNotificationType(type);
    setShowSMSDialog(true);
  };

  const handleExportPDF = (filters: ExpiringSoonFilters | ExpiredMembersFilters) => {
    exportPDFMutation.mutate({
      ...filters,
      title: `Membership Expiration Report - ${new Date().toLocaleDateString()}`,
      include_contact_details: true
    });
  };

  const handleSendSMSConfirm = () => {
    const memberIds = activeTab === 'expiring-soon' 
      ? selectedExpiringSoonMembers 
      : selectedExpiredMembers;

    smsNotificationMutation.mutate({
      notification_type: smsNotificationType,
      member_ids: memberIds.map(id => id.toString()),
      custom_message: customMessage || undefined,
      send_immediately: true
    });
  };

  const handleBulkRenewalConfirm = () => {
    const memberIds = activeTab === 'expiring-soon' 
      ? selectedExpiringSoonMembers 
      : selectedExpiredMembers;

    bulkRenewalMutation.mutate({
      member_ids: memberIds.map(id => id.toString()),
      renewal_period_months: renewalPeriodMonths,
      send_confirmation_sms: sendConfirmationSms
    });
  };

  const getSMSNotificationTypeLabel = (type: string) => {
    switch (type) {
      case '30_day_reminder': return '30 Day Reminder';
      case '7_day_urgent': return '7 Day Urgent';
      case 'expired_today': return 'Expired Today';
      case '7_day_grace': return '7 Day Grace Period';
      default: return type;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Membership Expiration Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Enhanced dashboard powered by optimized database views
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={getTabIndex(activeTab)} onChange={handleTabChange} aria-label="membership expiration tabs">
          <Tab label="Overview" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Expiring Soon
                {selectedExpiringSoonMembers.length > 0 && (
                  <Chip
                    label={selectedExpiringSoonMembers.length}
                    size="small"
                    color="warning"
                  />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Expired
                {selectedExpiredMembers.length > 0 && (
                  <Chip
                    label={selectedExpiredMembers.length}
                    size="small"
                    color="error"
                  />
                )}
              </Box>
            }
          />

        </Tabs>
      </Box>

      <TabPanel value={activeTab} index="overview">
        <EnhancedMembershipOverview
          onViewDetails={handleViewDetails}
          onSendNotifications={handleSendNotifications}
        />
      </TabPanel>

      <TabPanel value={activeTab} index="expiring-soon">
        <ExpiringSoonMembers
          onSendSMS={handleSendSMS}
          onBulkRenewal={handleBulkRenewal}
          onExportPDF={handleExportPDF}
        />
      </TabPanel>

      <TabPanel value={activeTab} index="expired">
        <ExpiredMembers
          onSendSMS={handleSendSMS}
          onBulkRenewal={handleBulkRenewal}
          onExportPDF={handleExportPDF}
        />
      </TabPanel>



      {/* SMS Dialog */}
      <Dialog open={showSMSDialog} onClose={() => setShowSMSDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send SMS Notifications</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Sending {getSMSNotificationTypeLabel(smsNotificationType)} to{' '}
              {activeTab === 'expiring-soon' 
                ? selectedExpiringSoonMembers.length 
                : selectedExpiredMembers.length} selected members
            </Alert>
            
            <TextField
              label="Custom Message (Optional)"
              multiline
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Leave empty to use default template message"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSMSDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSendSMSConfirm} 
            variant="contained"
            disabled={smsNotificationMutation.isPending}
          >
            {smsNotificationMutation.isPending ? 'Sending...' : 'Send SMS'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Renewal Dialog */}
      <Dialog open={showRenewalDialog} onClose={() => setShowRenewalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Membership Renewal</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="warning">
              Renewing memberships for{' '}
              {activeTab === 'expiring-soon' 
                ? selectedExpiringSoonMembers.length 
                : selectedExpiredMembers.length} selected members
            </Alert>
            
            <FormControl fullWidth>
              <InputLabel>Renewal Period</InputLabel>
              <Select
                value={renewalPeriodMonths}
                label="Renewal Period"
                onChange={(e) => setRenewalPeriodMonths(e.target.value as number)}
              >
                <MenuItem value={6}>6 Months</MenuItem>
                <MenuItem value={12}>12 Months</MenuItem>
                <MenuItem value={24}>24 Months</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Send Confirmation SMS</InputLabel>
              <Select
                value={sendConfirmationSms.toString()}
                label="Send Confirmation SMS"
                onChange={(e) => setSendConfirmationSms(e.target.value === 'true')}
              >
                <MenuItem value="true">Yes, send confirmation SMS</MenuItem>
                <MenuItem value="false">No, don't send SMS</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRenewalDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkRenewalConfirm} 
            variant="contained"
            disabled={bulkRenewalMutation.isPending}
          >
            {bulkRenewalMutation.isPending ? 'Processing...' : 'Renew Memberships'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MembershipExpirationDashboard;
