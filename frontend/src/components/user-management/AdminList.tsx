import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Toolbar,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/reduxStore';
import { fetchAdmins, setFilters, toggleUserSelection, clearUserSelection } from '../../store/userManagementSlice';
import { User } from '../../lib/userManagementApi';

const AdminList: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    admins,
    adminsPagination,
    adminsLoading,
    adminsError,
    selectedUsers,
    filters
  } = useAppSelector(state => state.userManagement);

  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    dispatch(fetchAdmins({ ...filters, page: adminsPagination.page, limit: adminsPagination.limit }));
  }, [dispatch, filters, adminsPagination.page, adminsPagination.limit]);

  const handlePageChange = (event: unknown, newPage: number) => {
    dispatch(fetchAdmins({ ...filters, page: newPage + 1, limit: adminsPagination.limit }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    dispatch(fetchAdmins({ ...filters, page: 1, limit: newLimit }));
  };

  const handleFilterChange = (field: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    dispatch(setFilters(localFilters));
    setShowFilters(false);
  };

  const clearFilters = () => {
    setLocalFilters({});
    dispatch(setFilters({}));
    setShowFilters(false);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = admins.map(admin => admin.id);
      dispatch(clearUserSelection());
      allIds.forEach(id => dispatch(toggleUserSelection(id)));
    } else {
      dispatch(clearUserSelection());
    }
  };

  const handleSelectUser = (userId: number) => {
    dispatch(toggleUserSelection(userId));
  };

  const getAdminLevelColor = (level: string) => {
    const colors = {
      national: 'error',
      province: 'warning',
      district: 'info',
      municipality: 'primary',
      ward: 'secondary'
    } as const;
    return colors[level as keyof typeof colors] || 'default';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'default';
  };

  if (adminsError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {adminsError}
      </Alert>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="h2">
              Admin Users
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => dispatch(fetchAdmins(filters))}
                disabled={adminsLoading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                color="primary"
              >
                Add Admin
              </Button>
            </Box>
          </Box>

          {/* Filters */}
          {showFilters && (
            <Box mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>
                Filter Admin Users
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Admin Level</InputLabel>
                  <Select
                    value={localFilters.admin_level || ''}
                    label="Admin Level"
                    onChange={(e) => handleFilterChange('admin_level', e.target.value)}
                  >
                    <MenuItem value="">All Levels</MenuItem>
                    <MenuItem value="national">National</MenuItem>
                    <MenuItem value="province">Province</MenuItem>
                    <MenuItem value="district">District</MenuItem>
                    <MenuItem value="municipality">Municipality</MenuItem>
                    <MenuItem value="ward">Ward</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label="Province Code"
                  value={localFilters.province_code || ''}
                  onChange={(e) => handleFilterChange('province_code', e.target.value)}
                  sx={{ minWidth: 120 }}
                />

                <TextField
                  size="small"
                  label="District Code"
                  value={localFilters.district_code || ''}
                  onChange={(e) => handleFilterChange('district_code', e.target.value)}
                  sx={{ minWidth: 120 }}
                />

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={localFilters.is_active || ''}
                    label="Status"
                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Active</MenuItem>
                    <MenuItem value="false">Inactive</MenuItem>
                  </Select>
                </FormControl>

                <Box display="flex" gap={1}>
                  <Button variant="contained" size="small" onClick={applyFilters}>
                    Apply
                  </Button>
                  <Button variant="outlined" size="small" onClick={clearFilters}>
                    Clear
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          {/* Selection Toolbar */}
          {selectedUsers.length > 0 && (
            <Toolbar sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', mb: 2, borderRadius: 1 }}>
              <Typography variant="subtitle1" component="div" sx={{ flex: '1 1 100%' }}>
                {selectedUsers.length} selected
              </Typography>
              <Button color="inherit" size="small">
                Bulk Actions
              </Button>
            </Toolbar>
          )}

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < admins.length}
                      checked={admins.length > 0 && selectedUsers.length === admins.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Admin Level</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Geographic Scope</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>MFA</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adminsLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUsers.includes(admin.id)}
                          onChange={() => handleSelectUser(admin.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {admin.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={admin.admin_level}
                          color={getAdminLevelColor(admin.admin_level)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{admin.role_name}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {admin.province_code && `P: ${admin.province_code}`}
                          {admin.district_code && `, D: ${admin.district_code}`}
                          {admin.municipal_code && `, M: ${admin.municipal_code}`}
                          {admin.ward_code && `, W: ${admin.ward_code}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={admin.is_active ? 'Active' : 'Inactive'}
                          color={getStatusColor(admin.is_active)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {admin.mfa_enabled ? (
                          <Tooltip title="MFA Enabled">
                            <SecurityIcon color="success" fontSize="small" />
                          </Tooltip>
                        ) : (
                          <Tooltip title="MFA Disabled">
                            <SecurityIcon color="disabled" fontSize="small" />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={adminsPagination.total}
            rowsPerPage={adminsPagination.limit}
            page={adminsPagination.page - 1}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminList;
