import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  alpha,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Pagination,
} from '@mui/material';
import {
  History,
  Search,
  CloudDownload,
} from '@mui/icons-material';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';
import { format } from 'date-fns';

const AuditLogsViewer: React.FC = () => {
  const theme = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Mock data - Replace with actual API call
  const mockLogs = [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      user_email: 'superadmin@eff.org',
      action: 'LOGIN',
      resource: 'Authentication',
      details: 'User logged in successfully',
      ip_address: '192.168.1.1',
      status: 'success',
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      user_email: 'superadmin@eff.org',
      action: 'UPDATE_CONFIG',
      resource: 'System Configuration',
      details: 'Updated rate limit settings',
      ip_address: '192.168.1.1',
      status: 'success',
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      user_email: 'admin@eff.org',
      action: 'BULK_UPLOAD',
      resource: 'Member Upload',
      details: 'Uploaded 500 member records',
      ip_address: '192.168.1.5',
      status: 'success',
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      user_email: 'admin@eff.org',
      action: 'DELETE_USER',
      resource: 'User Management',
      details: 'Attempted to delete protected user',
      ip_address: '192.168.1.5',
      status: 'failed',
    },
  ];

  const logs = mockLogs;
  const totalLogs = mockLogs.length;
  const totalPages = Math.ceil(totalLogs / limit);

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      LOGIN: theme.palette.info.main,
      LOGOUT: theme.palette.info.main,
      CREATE: theme.palette.success.main,
      UPDATE: theme.palette.warning.main,
      UPDATE_CONFIG: theme.palette.warning.main,
      DELETE: theme.palette.error.main,
      DELETE_USER: theme.palette.error.main,
      BULK_UPLOAD: theme.palette.primary.main,
      EXPORT: theme.palette.secondary.main,
    };
    return colors[action] || theme.palette.grey[500];
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? theme.palette.success.main : theme.palette.error.main;
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Details', 'IP Address', 'Status'];
    const csvContent = [
      headers.join(','),
      ...logs.map((log) =>
        [
          format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          log.user_email,
          log.action,
          log.resource,
          `"${log.details}"`,
          log.ip_address,
          log.status,
        ].join(',')
      ),
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Box>
      <PageHeader
        title="Audit & Logs"
        subtitle="View system audit logs and user activities"
        gradient
        actions={[
          <ActionButton key="export" icon={CloudDownload} onClick={handleExport} variant="outlined">
            Export Logs
          </ActionButton>,
        ]}
      />

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 4, borderRadius: '12px' }}>
        <Typography variant="body2">
          <strong>Note:</strong> This is a preview with mock data. Full audit logging implementation is pending backend
          integration.
        </Typography>
      </Alert>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <TextField
          label="Search logs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by user, action, or details..."
          sx={{
            minWidth: 300,
            '& .MuiOutlinedInput-root': {
              borderRadius: '50px',
            },
          }}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Action Type</InputLabel>
          <Select
            value={actionFilter}
            label="Action Type"
            onChange={(e) => setActionFilter(e.target.value)}
            sx={{ borderRadius: '50px' }}
          >
            <MenuItem value="all">All Actions</MenuItem>
            <MenuItem value="LOGIN">Login/Logout</MenuItem>
            <MenuItem value="CREATE">Create</MenuItem>
            <MenuItem value="UPDATE">Update</MenuItem>
            <MenuItem value="DELETE">Delete</MenuItem>
            <MenuItem value="BULK_UPLOAD">Bulk Upload</MenuItem>
            <MenuItem value="EXPORT">Export</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Logs Table */}
      {logs.length === 0 ? (
        <Alert severity="info">No audit logs found matching the selected filters.</Alert>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: '16px',
              boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
              mb: 4,
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.02) }}>
                  <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Resource</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                      },
                    }}
                  >
                    <TableCell>{format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}</TableCell>
                    <TableCell>{log.user_email}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getActionColor(log.action), 0.1),
                          color: getActionColor(log.action),
                          fontWeight: 600,
                          borderRadius: '50px',
                        }}
                      />
                    </TableCell>
                    <TableCell>{log.resource}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300 }}>
                        {log.details}
                      </Typography>
                    </TableCell>
                    <TableCell>{log.ip_address}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.status}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getStatusColor(log.status), 0.1),
                          color: getStatusColor(log.status),
                          fontWeight: 600,
                          borderRadius: '50px',
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_e, value) => setPage(value)}
                color="primary"
                size="large"
                sx={{
                  '& .MuiPaginationItem-root': {
                    borderRadius: '50px',
                  },
                }}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default AuditLogsViewer;

