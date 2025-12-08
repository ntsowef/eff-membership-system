import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  // FormControl,
  // InputLabel,
  // Select,
  // MenuItem,
  Paper,
  // Table,
  // TableBody,
  // TableCell,
  // TableContainer,
  // TableHead,
  // TableRow,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link,
  // Avatar,
  // List,
  // ListItem,
  // ListItemIcon,
  // ListItemText,
  // ListItemSecondaryAction
} from '@mui/material';
import {
  Assignment,
  Person,
  LocationOn,
  Email,
  Phone,
  // CalendarToday,
  CheckCircle,
  Cancel,
  Pending,
  // Edit,
  // Visibility,
  ArrowBack,
  Payment,
  // Receipt,
  Gavel,
  History,
  // Warning,
  Info,
  Home,
  // Business,
  AccountBalance,
  VerifiedUser,
  Language,
  Work,
  School,
  // Flag,
  // Create,
  Delete,
  TrendingUp
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, twoTierApprovalApi } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../store';
import FinancialReviewPanel from '../../components/applications/FinancialReviewPanel';
import RenewalFinancialReviewPanel from '../../components/renewals/RenewalFinancialReviewPanel';
import FinalReviewPanel from '../../components/applications/FinalReviewPanel';
import { format } from 'date-fns';

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
      id={`application-tabpanel-${index}`}
      aria-labelledby={`application-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ApplicationDetailPage: React.FC = () => {
  const { id, type } = useParams<{ id: string; type?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  // Determine if we're viewing a renewal or application
  const isRenewalView = type === 'renewal';
  const entityType = isRenewalView ? 'renewal' : 'application';

  // Get current user info from Zustand auth store
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role_name || (currentUser as any)?.role || '';
  const userId = currentUser?.id || 0;
  const adminLevel = currentUser?.admin_level || '';

  // Role-based access control
  const isNationalAdmin = adminLevel === 'national';
  const isFinancialReviewer = userRole === 'financial_reviewer' || userRole === 'financial.approver';
  const isMembershipApprover = userRole === 'membership_approver' || userRole === 'membership.approver';
  const isSuperAdmin = userRole === 'super_admin';

  // National Admin has full access to all applications
  const canAccessApplication = isNationalAdmin || isFinancialReviewer || isMembershipApprover || isSuperAdmin;

  const [activeTab, setActiveTab] = useState(0);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | null;
  }>({ open: false, action: null });

  const [deleteDialog, setDeleteDialog] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    status: 'Approved' as 'Approved' | 'Rejected',
    rejection_reason: '',
    admin_notes: '',
    send_notification: true
  });

  // Fetch entity details (application or renewal) with role-based access
  const { data: entity, isLoading, error } = useQuery({
    queryKey: [entityType, id],
    queryFn: async () => {
      if (!id) throw new Error(`${entityType} ID is required`);

      if (isRenewalView) {
        // Fetch renewal details
        if (isNationalAdmin || isFinancialReviewer || isMembershipApprover) {
          const response = await twoTierApprovalApi.getRenewalDetails(id);
          return response.data.renewal;
        } else {
          // For now, use the same endpoint - can be extended later
          const response = await twoTierApprovalApi.getRenewalDetails(id);
          return response.data.renewal;
        }
      } else {
        // Fetch application details
        if (isNationalAdmin || isFinancialReviewer || isMembershipApprover) {
          try {
            const response = await twoTierApprovalApi.getApplicationWithRoleAccess(id);
            return response.data.application;
          } catch (error) {
            // Fallback to regular endpoint if role-based fails
            const response = await applicationsApi.getApplication(id);
            return response.data.application;
          }
        } else {
          const response = await applicationsApi.getApplication(id);
          return response.data.application;
        }
      }
    },
    enabled: !!id && canAccessApplication,
  });

  // For backward compatibility, keep 'application' reference
  const application = entity;

  // Fetch payment information for entity (application or renewal)
  const { data: payments } = useQuery({
    queryKey: [entityType, 'payments', id],
    queryFn: async () => {
      if (!id) return [];
      try {
        if (isRenewalView) {
          // For renewals, we might need a different endpoint in the future
          // For now, use the application endpoint as it might work for both
          const response = await applicationsApi.getApplicationPayments(id);
          return response.data || [];
        } else {
          const response = await applicationsApi.getApplicationPayments(id);
          return response.data || [];
        }
      } catch (error) {
        console.log(`No payment data available for ${entityType}`);
        return [];
      }
    },
    enabled: !!id,
  });

  // Fetch approval status for entity (application or renewal)
  const { data: approvalStatus } = useQuery({
    queryKey: [entityType, 'approval-status', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        if (isRenewalView) {
          // For renewals, use the same endpoint for now
          const response = await applicationsApi.getApprovalStatus(id);
          return response.data;
        } else {
          const response = await applicationsApi.getApprovalStatus(id);
          return response.data;
        }
      } catch (error) {
        console.log(`No approval status available for ${entityType}`);
        return null;
      }
    },
    enabled: !!id,
  });

  // Review application mutation
  const reviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      if (!id) throw new Error('Application ID is required');
      return applicationsApi.reviewApplication(id, reviewData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      showNotification('Application reviewed successfully', 'success');
      setReviewDialog({ open: false, action: null });
      setReviewForm({
        status: 'Approved',
        rejection_reason: '',
        admin_notes: '',
        send_notification: true
      });
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to review application', 'error');
    },
  });

  // Submit application mutation (Draft -> Submitted)
  const submitApplicationMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Application ID is required');
      return applicationsApi.submitApplication(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      showNotification('Application submitted successfully', 'success');
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to submit application', 'error');
    },
  });

  // Set under review mutation
  const setUnderReviewMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Application ID is required');
      return applicationsApi.setUnderReview(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      showNotification('Application set under review', 'success');
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to set application under review', 'error');
    },
  });

  // Delete application mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Application ID is required');
      return applicationsApi.deleteApplication(id);
    },
    onSuccess: () => {
      showNotification('Application deleted successfully', 'success');
      setDeleteDialog(false);
      // Navigate back to applications list
      navigate('/admin/applications');
    },
    onError: (error: any) => {
      showNotification(error.message || 'Failed to delete application', 'error');
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleReviewAction = (action: 'approve' | 'reject') => {
    setReviewForm(prev => ({
      ...prev,
      status: action === 'approve' ? 'Approved' : 'Rejected'
    }));
    setReviewDialog({ open: true, action });
  };

  const handleSubmitReview = () => {
    reviewMutation.mutate(reviewForm);
  };

  const handleDeleteApplication = () => {
    deleteMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      case 'Under Review': return 'warning';
      case 'Submitted': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle />;
      case 'Rejected': return <Cancel />;
      case 'Under Review': return <Pending />;
      case 'Submitted': return <Assignment />;
      default: return <Info />;
    }
  };

  // Access control check
  if (!canAccessApplication) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Access denied. You don't have permission to view applications.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/admin')}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !application) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || `${isRenewalView ? 'Renewal' : 'Application'} not found`}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(isRenewalView ? '/admin/renewal-management' : '/admin/applications')}
        >
          Back to {isRenewalView ? 'Renewals' : 'Applications'}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body1"
            onClick={() => navigate('/admin/dashboard')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Home fontSize="small" />
            Dashboard
          </Link>
          <Link
            component="button"
            variant="body1"
            onClick={() => navigate(isRenewalView ? '/admin/renewal-management' : '/admin/applications')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            {isRenewalView ? <TrendingUp fontSize="small" /> : <Assignment fontSize="small" />}
            {isRenewalView ? 'Renewals' : 'Applications'}
          </Link>
          <Typography color="text.primary">
            {isRenewalView ? 'Renewal' : 'Application'} #{application.id}
          </Typography>
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {isRenewalView ? 'Renewal Review' : 'Application Review'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {application.first_name} {application.last_name} • {isRenewalView ? (application.renewal_number || `Renewal #${application.id}`) : application.application_number}
            </Typography>
          </Box>

          <Box display="flex" gap={2} alignItems="center">
            <Chip
              icon={getStatusIcon(application.status)}
              label={application.status}
              color={getStatusColor(application.status) as any}
              size="medium"
            />

            {/* Submit button for Draft applications */}
            {application.status === 'Draft' && (isNationalAdmin || isSuperAdmin) && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Assignment />}
                onClick={() => submitApplicationMutation.mutate()}
                disabled={submitApplicationMutation.isPending}
              >
                {submitApplicationMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}

            {application.status === 'Submitted' && (
              <Button
                variant="outlined"
                onClick={() => setUnderReviewMutation.mutate()}
                disabled={setUnderReviewMutation.isPending}
              >
                Set Under Review
              </Button>
            )}

            {(application.status === 'Submitted' || application.status === 'Under Review') && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => handleReviewAction('approve')}
                  disabled={reviewMutation.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => handleReviewAction('reject')}
                  disabled={reviewMutation.isPending}
                >
                  Reject
                </Button>
              </>
            )}

            {/* Delete button - only for National Admin and Super Admin */}
            {(isNationalAdmin || isSuperAdmin) && application.status !== 'Approved' && (
              <Tooltip title="Delete Application">
                <IconButton
                  color="error"
                  onClick={() => setDeleteDialog(true)}
                  disabled={deleteMutation.isPending}
                  sx={{ ml: 1 }}
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      {/* Approval Status Alert */}
      {approvalStatus && !approvalStatus.can_approve && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Application Not Ready for Approval
          </Typography>
          <Typography variant="body2">
            Blocking Issues: {approvalStatus.blocking_issues?.join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Main Content */}
      <Paper sx={{ mb: 3 }}>
        {/* Render different Tabs based on user role to avoid conditional rendering issues */}
        {isFinancialReviewer ? (
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Payment Information" icon={<Payment />} iconPosition="start" />
            <Tab label="Financial Review" icon={<AccountBalance />} iconPosition="start" />
          </Tabs>
        ) : isMembershipApprover || isNationalAdmin || isSuperAdmin ? (
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Personal Information" icon={<Person />} iconPosition="start" />
            <Tab label="Contact & Location" icon={<LocationOn />} iconPosition="start" />
            <Tab label="Payment Information" icon={<Payment />} iconPosition="start" />
            <Tab label="Financial Review" icon={<AccountBalance />} iconPosition="start" />
            <Tab label="Final Review" icon={<Gavel />} iconPosition="start" />
            <Tab label="Review & History" icon={<History />} iconPosition="start" />
          </Tabs>
        ) : (
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Personal Information" icon={<Person />} iconPosition="start" />
            <Tab label="Contact & Location" icon={<LocationOn />} iconPosition="start" />
            <Tab label="Payment Information" icon={<Payment />} iconPosition="start" />
            <Tab label="Review & History" icon={<History />} iconPosition="start" />
          </Tabs>
        )}

        {/* Role-based TabPanel Content */}
        {isFinancialReviewer ? (
          <>
            {/* Financial Reviewer - Payment Information Tab */}
            <TabPanel value={activeTab} index={0}>
              <Grid container spacing={3}>
                {/* Payment Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Payment color="primary" />
                        Payment Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Payment Method:
                            </Typography>
                            <Typography variant="body1">
                              {application.payment_method || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Amount:
                            </Typography>
                            <Typography variant="body1">
                              {application.payment_amount ? `R${application.payment_amount}` : 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Reference:
                            </Typography>
                            <Typography variant="body1">
                              {application.payment_reference || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Date:
                            </Typography>
                            <Typography variant="body1">
                              {application.payment_date ? format(new Date(application.payment_date), 'PPP') : 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Application Basic Info for Context */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person color="primary" />
                        Applicant Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Full Name:
                            </Typography>
                            <Typography variant="body1">
                              {application.first_name} {application.last_name}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              ID Number:
                            </Typography>
                            <Typography variant="body1" fontFamily="monospace">
                              {application.id_number}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Email:
                            </Typography>
                            <Typography variant="body1">
                              {application.email}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Phone:
                            </Typography>
                            <Typography variant="body1">
                              {application.cell_number}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Financial Reviewer - Financial Review Tab */}
            <TabPanel value={activeTab} index={1}>
              {isRenewalView ? (
                <RenewalFinancialReviewPanel
                  renewal={application}
                  payments={payments || []}
                  approvalStatus={approvalStatus}
                  canReview={isNationalAdmin || isFinancialReviewer}
                />
              ) : (
                <FinancialReviewPanel
                  application={application}
                  payments={payments || []}
                  approvalStatus={approvalStatus}
                  canReview={isNationalAdmin || isFinancialReviewer}
                />
              )}
            </TabPanel>
          </>
        ) : isMembershipApprover || isNationalAdmin || isSuperAdmin ? (
          <>
            {/* Membership Approver / National Admin / Super Admin - Personal Information Tab */}
            <TabPanel value={activeTab} index={0}>
              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person color="primary" />
                        Basic Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Full Name:
                            </Typography>
                            <Typography variant="body1">
                              {application.first_name} {application.last_name}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              ID Number:
                            </Typography>
                            <Typography variant="body1" fontFamily="monospace">
                              {application.id_number}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Date of Birth:
                            </Typography>
                            <Typography variant="body1">
                              {application.date_of_birth ? format(new Date(application.date_of_birth), 'PPP') : 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Gender:
                            </Typography>
                            <Typography variant="body1">
                              {application.gender}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Additional Details */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VerifiedUser color="primary" />
                        Additional Details
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Language fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Language:
                            </Typography>
                            <Typography variant="body1">
                              {application.language_name || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Work fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Occupation:
                            </Typography>
                            <Typography variant="body1">
                              {application.occupation_name || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <School fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Qualification:
                            </Typography>
                            <Typography variant="body1">
                              {application.qualification_name || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Membership Approver - Contact & Location Tab */}
            <TabPanel value={activeTab} index={1}>
              <Grid container spacing={3}>
                {/* Contact Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email color="primary" />
                        Contact Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Email fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Email:
                            </Typography>
                            <Typography variant="body1">
                              {application.email}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Phone fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Cell Number:
                            </Typography>
                            <Typography variant="body1">
                              {application.cell_number}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Home fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Address:
                            </Typography>
                            <Typography variant="body1">
                              {application.residential_address}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Geographic Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn color="primary" />
                        Geographic Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Province:
                            </Typography>
                            <Typography variant="body1">
                              {application.province_name || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              District:
                            </Typography>
                            <Typography variant="body1">
                              {application.district_name || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Municipality:
                            </Typography>
                            <Typography variant="body1">
                              {application.municipality_name || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Ward:
                            </Typography>
                            <Typography variant="body1">
                              {application.ward_name || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Membership Approver - Payment Information Tab */}
            <TabPanel value={activeTab} index={2}>
              <Grid container spacing={3}>
                {/* Payment Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Payment color="primary" />
                        Payment Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Payment Method:
                            </Typography>
                            <Typography variant="body1">
                              {application.payment_method || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Amount:
                            </Typography>
                            <Typography variant="body1">
                              {application.payment_amount ? `R${application.payment_amount}` : 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Reference:
                            </Typography>
                            <Typography variant="body1">
                              {application.payment_reference || 'Not specified'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Financial Status:
                            </Typography>
                            <Chip
                              label={application.financial_status || 'Pending'}
                              color={application.financial_status === 'Approved' ? 'success' : application.financial_status === 'Rejected' ? 'error' : 'default'}
                              size="small"
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Financial Review Summary */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalance color="primary" />
                        Financial Review Summary
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        {application.financial_reviewed_at && (
                          <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                                Reviewed Date:
                              </Typography>
                              <Typography variant="body1">
                                {format(new Date(application.financial_reviewed_at), 'PPpp')}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                        {application.financial_reviewer_name && (
                          <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                                Reviewed By:
                              </Typography>
                              <Typography variant="body1">
                                {application.financial_reviewer_name}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                        {application.financial_admin_notes && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Financial Notes:
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                              <Typography variant="body2">
                                {application.financial_admin_notes}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* National Admin / Membership Approver - Financial Review Tab */}
            <TabPanel value={activeTab} index={3}>
              {isRenewalView ? (
                <RenewalFinancialReviewPanel
                  renewal={application}
                  payments={payments || []}
                  approvalStatus={approvalStatus}
                  canReview={isNationalAdmin || isFinancialReviewer}
                />
              ) : (
                <FinancialReviewPanel
                  application={application}
                  payments={payments || []}
                  approvalStatus={approvalStatus}
                  canReview={isNationalAdmin || isFinancialReviewer}
                />
              )}
            </TabPanel>

            {/* Membership Approver - Final Review Tab */}
            <TabPanel value={activeTab} index={4}>
              <FinalReviewPanel
                application={application}
                canReview={isNationalAdmin || isMembershipApprover}
                currentUserId={userId}
              />
            </TabPanel>

            {/* Membership Approver - Review & History Tab */}
            <TabPanel value={activeTab} index={5}>
              <Grid container spacing={3}>
                {/* Application Timeline */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <History color="primary" />
                        Application Timeline
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Submitted:
                            </Typography>
                            <Typography variant="body1">
                              {application.submitted_at ? format(new Date(application.submitted_at), 'PPpp') : 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Current Status:
                            </Typography>
                            <Chip
                              label={application.status}
                              color={getStatusColor(application.status)}
                              icon={getStatusIcon(application.status)}
                              size="small"
                            />
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                              Workflow Stage:
                            </Typography>
                            <Chip
                              label={application.workflow_stage || 'Submitted'}
                              color="info"
                              size="small"
                            />
                          </Box>
                        </Grid>

                        {application.reviewed_at && (
                          <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                                Last Reviewed:
                              </Typography>
                              <Typography variant="body1">
                                {format(new Date(application.reviewed_at), 'PPpp')}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Admin Notes */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment color="primary" />
                        Admin Notes & Comments
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      {application.admin_notes ? (
                        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                          <Typography variant="body2">
                            {application.admin_notes}
                          </Typography>
                        </Paper>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          No admin notes available
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </>
        ) : null}
      </Paper>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialog.open}
        onClose={() => setReviewDialog({ open: false, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewDialog.action === 'approve' ? 'Approve Application' : 'Reject Application'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity={reviewDialog.action === 'approve' ? 'success' : 'warning'} sx={{ mb: 3 }}>
              You are about to {reviewDialog.action} the application for {application.first_name} {application.last_name}.
              This action cannot be undone.
            </Alert>

            {reviewDialog.action === 'reject' && (
              <TextField
                fullWidth
                label="Rejection Reason"
                multiline
                rows={3}
                value={reviewForm.rejection_reason}
                onChange={(e) => setReviewForm(prev => ({ ...prev, rejection_reason: e.target.value }))}
                required
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              fullWidth
              label="Admin Notes (Optional)"
              multiline
              rows={3}
              value={reviewForm.admin_notes}
              onChange={(e) => setReviewForm(prev => ({ ...prev, admin_notes: e.target.value }))}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog({ open: false, action: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            color={reviewDialog.action === 'approve' ? 'success' : 'error'}
            disabled={reviewMutation.isPending || (reviewDialog.action === 'reject' && !reviewForm.rejection_reason)}
          >
            {reviewMutation.isPending ? 'Processing...' : `${reviewDialog.action === 'approve' ? 'Approve' : 'Reject'} Application`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Delete color="error" />
            Delete Application
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Warning: This action cannot be undone!
            </Typography>
            <Typography variant="body2">
              You are about to delete the application for <strong>{application.first_name} {application.last_name}</strong> (Application #{application.application_number}).
            </Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            The application will be marked as "Rejected" and will no longer be accessible for review or approval.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteApplication}
            variant="contained"
            color="error"
            startIcon={<Delete />}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Application'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicationDetailPage;
