/**
 * Upload History Tab Component
 * Displays paginated table of all bulk uploads with filters and actions
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
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
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
} from '@mui/material';
import {
  Visibility,
  GetApp,
  Refresh,
  Search,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
  Cancel,
} from '@mui/icons-material';
import { useRenewalBulkUpload } from '../../hooks/useRenewalBulkUpload';
import type { BulkUpload } from '../../types/renewalBulkUpload';

const UploadHistoryTab: React.FC = () => {
  const {
    recentUploads,
    fetchRecentUploads,
    downloadReportFile,
  } = useRenewalBulkUpload();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecentUploads();
  }, [fetchRecentUploads]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle />;
      case 'Processing':
        return <HourglassEmpty />;
      case 'Failed':
        return <ErrorIcon />;
      case 'Cancelled':
        return <Cancel />;
      default:
        return <HourglassEmpty />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'info' | 'error' | 'default' | 'warning' => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Processing':
        return 'info';
      case 'Failed':
        return 'error';
      case 'Cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  // Filter uploads
  const filteredUploads = recentUploads.filter((upload) => {
    const matchesStatus = statusFilter === 'all' || upload.upload_status === statusFilter;
    const matchesSearch = 
      upload.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      upload.uploaded_by_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Paginate uploads
  const paginatedUploads = filteredUploads.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          Upload History
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={fetchRecentUploads}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search by file name or uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Processing">Processing</MenuItem>
                <MenuItem value="Failed">Failed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total Records</TableCell>
              <TableCell align="right">Processed</TableCell>
              <TableCell align="right">Successful</TableCell>
              <TableCell align="right">Failed</TableCell>
              <TableCell align="right">Fraud Detected</TableCell>
              <TableCell>Uploaded At</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedUploads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No uploads found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedUploads.map((upload) => (
                <TableRow key={upload.upload_uuid} hover>
                  <TableCell>{upload.file_name}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(upload.upload_status)}
                      label={upload.upload_status}
                      color={getStatusColor(upload.upload_status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{upload.total_records}</TableCell>
                  <TableCell align="right">{upload.processed_records}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main">
                      {upload.successful_renewals}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="error.main">
                      {upload.failed_validations}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {upload.fraud_detected > 0 ? (
                      <Chip
                        label={upload.fraud_detected}
                        color="warning"
                        size="small"
                      />
                    ) : (
                      upload.fraud_detected
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(upload.uploaded_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{upload.uploaded_by_name}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {upload.upload_status === 'Completed' && (
                        <Tooltip title="Download Report">
                          <IconButton
                            size="small"
                            onClick={() => downloadReportFile(upload.upload_uuid, upload.file_name)}
                          >
                            <GetApp fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredUploads.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
};

export default UploadHistoryTab;

