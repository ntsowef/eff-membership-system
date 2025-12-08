import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Pagination,
} from '@mui/material';
import {
  CloudUpload,
  Refresh,
  CheckCircle,
  Error,
  HourglassEmpty,
  Cancel,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';
import { SuperAdminAPI } from '../../lib/superAdminApi';
import { format } from 'date-fns';

const BulkUploadManagement: React.FC = () => {
  const theme = useTheme();

  const [uploadType, setUploadType] = useState<'all' | 'member_application' | 'renewal'>('all');
  const [status, setStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch uploads
  const { data: uploadsData, isLoading, error, refetch } = useQuery({
    queryKey: ['allUploads', uploadType, status, searchTerm, page],
    queryFn: () =>
      SuperAdminAPI.getAllUploads({
        uploadType: uploadType === 'all' ? undefined : uploadType,
        status: status === 'all' ? undefined : status,
        limit,
        offset: (page - 1) * limit,
      }),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch upload statistics
  const { data: statsData } = useQuery({
    queryKey: ['uploadStatistics'],
    queryFn: () => SuperAdminAPI.getUploadStatistics(),
    refetchInterval: 30000,
  });

  const uploads = uploadsData?.data?.uploads || [];
  const totalUploads = uploadsData?.data?.total || 0;
  const totalPages = Math.ceil(totalUploads / limit);
  const stats = statsData?.data || {};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ fontSize: 18 }} />;
      case 'failed':
        return <Error sx={{ fontSize: 18 }} />;
      case 'processing':
        return <HourglassEmpty sx={{ fontSize: 18 }} />;
      case 'cancelled':
        return <Cancel sx={{ fontSize: 18 }} />;
      default:
        return <HourglassEmpty sx={{ fontSize: 18 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'failed':
        return theme.palette.error.main;
      case 'processing':
        return theme.palette.info.main;
      case 'cancelled':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Box>
      <PageHeader
        title="Bulk Upload Management"
        subtitle="System-wide view of all bulk uploads"
        gradient
        actions={[
          <ActionButton key="refresh" icon={Refresh} onClick={() => refetch()} variant="outlined">
            Refresh
          </ActionButton>,
        ]}
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Total Uploads
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                {stats.total_uploads || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: theme.palette.success.main }}>
                {stats.completed || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Processing
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: theme.palette.info.main }}>
                {stats.processing || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.08)} 0%, ${alpha(theme.palette.error.main, 0.02)} 100%)`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Failed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: theme.palette.error.main }}>
                {stats.failed || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Upload Type</InputLabel>
          <Select
            value={uploadType}
            label="Upload Type"
            onChange={(e) => {
              setUploadType(e.target.value as any);
              setPage(1);
            }}
            sx={{ borderRadius: '50px' }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="member">Member Upload</MenuItem>
            <MenuItem value="renewal">Renewal</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            label="Status"
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            sx={{ borderRadius: '50px' }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Search by filename or user"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          sx={{
            minWidth: 300,
            '& .MuiOutlinedInput-root': {
              borderRadius: '50px',
            },
          }}
        />
      </Box>

      {/* Uploads Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load uploads. Please try again.</Alert>
      ) : uploads.length === 0 ? (
        <Alert severity="info">No uploads found matching the selected filters.</Alert>
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
                  <TableCell sx={{ fontWeight: 600 }}>File Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Uploaded By</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Upload Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Records
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uploads.map((upload: any) => (
                  <TableRow
                    key={upload.upload_uuid}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                      },
                    }}
                  >
                    <TableCell>{upload.file_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={upload.upload_type}
                        size="small"
                        sx={{
                          borderRadius: '50px',
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell>{upload.uploaded_by_name || 'N/A'}</TableCell>
                    <TableCell>{upload.upload_date ? format(new Date(upload.upload_date), 'MMM dd, yyyy HH:mm') : 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(upload.status)}
                        label={upload.status}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getStatusColor(upload.status), 0.1),
                          color: getStatusColor(upload.status),
                          fontWeight: 600,
                          borderRadius: '50px',
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {upload.successful_records || 0} / {upload.total_records || 0}
                      </Typography>
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

export default BulkUploadManagement;

