import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  // Paper,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
} from '@mui/material';
import {
  AdminPanelSettings,
  People,
  Security,
  Assignment,
  Refresh,
  Add,
  CheckCircle,
  Cancel,
  Visibility,
  Settings,
  Shield,
  Group,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UserManagementAPI } from '../../lib/userManagementApi';
import PageHeader from '../../components/ui/PageHeader';


// Local type definitions to avoid import issues
interface User {
  id: number;
  name: string;
  email: string;
  admin_level: 'national' | 'province' | 'district' | 'municipality' | 'ward' | 'none';
  role_name: string;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login?: string;
  created_at: string;
}

interface UserCreationWorkflow {
  id: number;
  request_id: string;
  requested_by: number;
  user_data: any;
  admin_level: string;
  geographic_scope: any;
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  created_user_id?: number;
  created_at: string;
  updated_at: string;
}

interface UserStatistics {
  total_users: number;
  active_users: number;
  admin_users: number;
  national_admins: number;
  province_admins: number;
  district_admins: number;
  municipal_admins: number;
  ward_admins: number;
  mfa_enabled_users: number;
  active_last_30_days: number;
}

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminManagementDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<UserCreationWorkflow | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');


  const queryClient = useQueryClient();

  // Fetch admin users
  const { data: adminsData, isLoading: adminsLoading, error: adminsError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => UserManagementAPI.getAdmins({ limit: 100 }),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch user statistics
  const { data: statisticsData, isLoading: statsLoading } = useQuery({
    queryKey: ['user-statistics'],
    queryFn: () => UserManagementAPI.getUserStatistics(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch pending workflows
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['pending-workflows'],
    queryFn: () => UserManagementAPI.getPendingWorkflows(),
    staleTime: 1 * 60 * 1000,
  });

  // Fetch available roles
  const { data: rolesData } = useQuery({
    queryKey: ['available-roles'],
    queryFn: () => UserManagementAPI.getAvailableRoles(),
    staleTime: 10 * 60 * 1000,
  });

  // Review workflow mutation
  const reviewWorkflowMutation = useMutation({
    mutationFn: ({ workflowId, action, notes }: { workflowId: number; action: 'approve' | 'reject'; notes?: string }) =>
      UserManagementAPI.reviewWorkflow(workflowId, { action, review_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-statistics'] });
      setWorkflowDialogOpen(false);
      setSelectedWorkflow(null);
      setReviewNotes('');
    },
  });

  const admins = adminsData?.data?.users || [];
  const statistics = statisticsData?.data as UserStatistics;
  const workflows = workflowsData?.data || [];
  const roles = rolesData?.data?.roles || [];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleReviewWorkflow = (workflow: UserCreationWorkflow) => {
    setSelectedWorkflow(workflow);
    setWorkflowDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (selectedWorkflow) {
      reviewWorkflowMutation.mutate({
        workflowId: selectedWorkflow.id,
        action: reviewAction,
        notes: reviewNotes,
      });
    }
  };

  const getAdminLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'national': return 'primary';
      case 'province': return 'secondary';
      case 'district': return 'info';
      case 'municipality': return 'warning';
      case 'ward': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'error';
  };

  if (adminsError) {
    return (
      <Container>
        <Alert severity="error">
          Failed to load admin management data. This feature requires authentication.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <PageHeader
        title="Admin Management Dashboard"
        subtitle="Manage system administrators, user workflows, and access permissions"
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Admin Management' },
        ]}
        badge={{
          label: `${admins.length} Admins`,
          color: 'primary',
        }}
        actions={
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Group />}
              onClick={() => navigate('/admin/members')}
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'primary.light',
                }
              }}
            >
              Members
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                queryClient.invalidateQueries({ queryKey: ['user-statistics'] });
                queryClient.invalidateQueries({ queryKey: ['pending-workflows'] });
              }}
            >
              Refresh
            </Button>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => window.open('/admin/users', '_blank')}
            >
              Create Admin
            </Button>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Statistics Cards */}
        {statistics && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <People color="primary" />
                    <Box>
                      <Typography variant="h4">{statistics.total_users}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Users
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AdminPanelSettings color="secondary" />
                    <Box>
                      <Typography variant="h4">{statistics.admin_users}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Admin Users
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Security color="success" />
                    <Box>
                      <Typography variant="h4">{statistics.active_users}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Users
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Badge badgeContent={workflows.length} color="error">
                      <Assignment color="warning" />
                    </Badge>
                    <Box>
                      <Typography variant="h4">{workflows.length}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Approvals
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="Admin Users" icon={<People />} />
              <Tab 
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    Pending Workflows
                    {workflows.length > 0 && (
                      <Chip label={workflows.length} size="small" color="error" />
                    )}
                  </Box>
                } 
                icon={<Assignment />} 
              />
              <Tab label="Roles & Permissions" icon={<Shield />} />
              <Tab label="System Statistics" icon={<Settings />} />
            </Tabs>
          </Box>

          {/* Admin Users Tab */}
          <TabPanel value={currentTab} index={0}>
            {adminsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Admin Level</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Geographic Scope</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Login</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {admins.map((admin: User) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {admin.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={admin.admin_level}
                            size="small"
                            color={getAdminLevelColor(admin.admin_level) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={admin.role_name}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {admin.province_code && `Province: ${admin.province_code}`}
                            {admin.municipal_code && `, Municipality: ${admin.municipal_code}`}
                            {admin.ward_code && `, Ward: ${admin.ward_code}`}
                            {!admin.province_code && !admin.municipal_code && !admin.ward_code && 'Global'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={admin.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            color={getStatusColor(admin.is_active)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {admin.last_login 
                              ? new Date(admin.last_login).toLocaleDateString()
                              : 'Never'
                            }
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Pending Workflows Tab */}
          <TabPanel value={currentTab} index={1}>
            {workflowsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : workflows.length === 0 ? (
              <Alert severity="info">
                No pending admin creation workflows at this time.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Request ID</TableCell>
                      <TableCell>Requested User</TableCell>
                      <TableCell>Admin Level</TableCell>
                      <TableCell>Geographic Scope</TableCell>
                      <TableCell>Requested By</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {workflows.map((workflow: UserCreationWorkflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {workflow.request_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {workflow.user_data?.name}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {workflow.user_data?.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={workflow.admin_level}
                            size="small"
                            color={getAdminLevelColor(workflow.admin_level) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {workflow.geographic_scope?.province_code && `Province: ${workflow.geographic_scope.province_code}`}
                            {workflow.geographic_scope?.municipal_code && `, Municipality: ${workflow.geographic_scope.municipal_code}`}
                            {workflow.geographic_scope?.ward_code && `, Ward: ${workflow.geographic_scope.ward_code}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            User ID: {workflow.requested_by}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(workflow.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleReviewWorkflow(workflow)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Roles & Permissions Tab */}
          <TabPanel value={currentTab} index={2}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Available system roles and their permissions. Role management requires proper authentication.
            </Alert>
            <Grid container spacing={2}>
              {roles.map((role: any) => (
                <Grid item xs={12} md={6} key={role.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {role.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {role.description}
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {role.permissions?.map((permission: string, index: number) => (
                          <Chip
                            key={index}
                            label={permission}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* System Statistics Tab */}
          <TabPanel value={currentTab} index={3}>
            {statsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : statistics ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Admin Distribution by Level
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>National Admins:</Typography>
                          <Chip label={statistics.national_admins} color="primary" size="small" />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>Provincial Admins:</Typography>
                          <Chip label={statistics.province_admins} color="secondary" size="small" />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>District Admins:</Typography>
                          <Chip label={statistics.district_admins} color="info" size="small" />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>Municipal Admins:</Typography>
                          <Chip label={statistics.municipal_admins} color="warning" size="small" />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>Ward Admins:</Typography>
                          <Chip label={statistics.ward_admins} color="default" size="small" />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Security Statistics
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>MFA Enabled Users:</Typography>
                          <Chip label={statistics.mfa_enabled_users} color="success" size="small" />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>Active Last 30 Days:</Typography>
                          <Chip label={statistics.active_last_30_days} color="info" size="small" />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>Total Active Users:</Typography>
                          <Chip label={statistics.active_users} color="success" size="small" />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="info">
                Statistics data not available. This feature requires authentication.
              </Alert>
            )}
          </TabPanel>
        </Card>
      </Container>

      {/* Workflow Review Dialog */}
      <Dialog open={workflowDialogOpen} onClose={() => setWorkflowDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Review Admin Creation Request</DialogTitle>
        <DialogContent>
          {selectedWorkflow && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Requested User Details
                  </Typography>
                  <Typography variant="body2">
                    <strong>Name:</strong> {selectedWorkflow.user_data?.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Email:</strong> {selectedWorkflow.user_data?.email}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Admin Level:</strong> {selectedWorkflow.admin_level}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Geographic Scope
                  </Typography>
                  <Typography variant="body2">
                    {selectedWorkflow.geographic_scope?.province_code && `Province: ${selectedWorkflow.geographic_scope.province_code}`}
                    {selectedWorkflow.geographic_scope?.municipal_code && `, Municipality: ${selectedWorkflow.geographic_scope.municipal_code}`}
                    {selectedWorkflow.geographic_scope?.ward_code && `, Ward: ${selectedWorkflow.geographic_scope.ward_code}`}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Justification
                  </Typography>
                  <Typography variant="body2">
                    {selectedWorkflow.justification || 'No justification provided'}
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Review Action</InputLabel>
                  <Select
                    value={reviewAction}
                    label="Review Action"
                    onChange={(e) => setReviewAction(e.target.value as 'approve' | 'reject')}
                  >
                    <MenuItem value="approve">Approve</MenuItem>
                    <MenuItem value="reject">Reject</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Review Notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkflowDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitReview}
            disabled={reviewWorkflowMutation.isPending}
            startIcon={reviewAction === 'approve' ? <CheckCircle /> : <Cancel />}
            color={reviewAction === 'approve' ? 'success' : 'error'}
          >
            {reviewWorkflowMutation.isPending ? 'Processing...' : `${reviewAction === 'approve' ? 'Approve' : 'Reject'} Request`}
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default AdminManagementDashboard;
