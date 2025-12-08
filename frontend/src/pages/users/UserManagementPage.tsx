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
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Person,
  AdminPanelSettings,
  Security,
  Group,
  People,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
// import { apiGet } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import CreateUserDialog from '../../components/users/CreateUserDialog';
import EditUserDialog from '../../components/users/EditUserDialog';
import { UserManagementAPI } from '../../lib/userManagementApi';
import { useUI } from '../../store';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  admin_level: string;
  role_name: string;
  is_active: boolean;
  mfa_enabled?: boolean;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useUI();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch users from real API
  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => UserManagementAPI.getAdmins(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user statistics
  const { data: statisticsData, isLoading: statisticsLoading } = useQuery({
    queryKey: ['user-statistics'],
    queryFn: () => UserManagementAPI.getUserStatistics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const users = usersData?.data?.users || [];
  const statistics = statisticsData?.data || statisticsData || null;

  // Mutation for creating admin users
  const createAdminMutation = useMutation({
    mutationFn: (userData: any) => UserManagementAPI.createAdmin(userData),
    onSuccess: (response) => {
      addNotification({
        type: 'success',
        message: response.message || 'Admin user created successfully!',
      });
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create admin user',
      });
    },
  });

  // Mutation for resetting user password
  const resetPasswordMutation = useMutation({
    mutationFn: (userData: any) => UserManagementAPI.resetUserPassword(userData.id, userData.new_password),
    onSuccess: (response) => {
      addNotification({
        type: 'success',
        message: response.message || 'Password reset successfully!',
      });
      setEditDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-statistics'] });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || 'Failed to reset password',
      });
    },
  });

  const handleCreateUser = () => {
    setCreateDialogOpen(true);
  };

  const handleUserCreated = (userData: any) => {
    console.log('Creating user with data:', userData);

    // Map frontend admin levels to backend expected values
    const adminLevelMapping: Record<string, string> = {
      'National': 'national',
      'Provincial': 'province',
      'Regional': 'district',
      'Municipal': 'municipality',
      'Ward': 'ward'
    };

    // Map frontend role names to database role names
    const roleNameMapping: Record<string, string> = {
      'Super Admin': 'super_admin',
      'Provincial Admin': 'provincial_admin',
      'Regional Admin': 'regional_admin',
      'Municipal Admin': 'municipal_admin',
      'Ward Admin': 'ward_admin'
    };

    // Transform the form data to match the API expected format
    const apiData = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      admin_level: adminLevelMapping[userData.admin_level] || userData.admin_level.toLowerCase(),
      role_name: roleNameMapping[userData.role_name] || userData.role_name.toLowerCase().replace(' ', '_'),
      province_code: userData.selected_province_code || userData.province_code,
      district_code: userData.district_code,
      municipal_code: userData.municipal_code, // ✅ FIXED: Use correct field name
      ward_code: userData.ward_code,
      justification: `Admin user created via user management interface`,
      // Include member promotion data if applicable
      ...(userData.is_existing_user_promotion && userData.selected_member && {
        member_id: userData.selected_member.member_id,
        promote_existing_member: true,
      }),
    };

    createAdminMutation.mutate(apiData);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleUpdateUser = (userData: any) => {
    resetPasswordMutation.mutate(userData);
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete user "${user.name}"?`)) {
      console.log('Delete user:', user.id);
      // TODO: Implement delete functionality
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'error';
  };

  const getAdminLevelColor = (level: string) => {
    switch (level) {
      case 'National': return 'primary';
      case 'Provincial': return 'secondary';
      case 'Regional': return 'info';
      case 'Municipal': return 'warning';
      case 'Ward': return 'default';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">
          Failed to load users. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <PageHeader
        title="User Management"
        subtitle="Manage system users, administrators, and access permissions"
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'User Management' },
        ]}
        badge={{
          label: `${users.length} Users`,
          color: 'primary',
        }}
        actions={
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<People />}
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
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateUser}
            >
              Add User
            </Button>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Person color="primary" />
                  <Box>
                    <Typography variant="h4">
                      {statisticsLoading ? '...' : (
                        statistics?.adminLevelStats?.reduce((sum: number, stat: any) => sum + stat.count, 0) || users.length
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Admin Users
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
                    <Typography variant="h4">
                      {statisticsLoading ? '...' : (
                        statistics?.adminLevelStats?.find((stat: any) => stat.admin_level === 'national')?.count ||
                        users.filter((u: User) => u.admin_level === 'national').length
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      National Admins
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
                    <Typography variant="h4">
                      {statisticsLoading ? '...' : (
                        statistics?.adminLevelStats?.reduce((sum: number, stat: any) => sum + stat.active_count, 0) ||
                        users.filter((u: User) => u.is_active).length
                      )}
                    </Typography>
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
                  <Group color="info" />
                  <Box>
                    <Typography variant="h4">
                      {new Set(users.map((u: User) => u.role_name)).size}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      User Roles
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Users Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Users
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Admin Level</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {user.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role_name}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.admin_level}
                          size="small"
                          color={getAdminLevelColor(user.admin_level) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={getStatusColor(user.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreateUser={handleUserCreated}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        open={editDialogOpen}
        user={selectedUser}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleUpdateUser}
        loading={resetPasswordMutation.isPending}
      />
    </Box>
  );
};

export default UserManagementPage;
