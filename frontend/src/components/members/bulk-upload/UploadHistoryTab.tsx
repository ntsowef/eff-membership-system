import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Alert,
  TablePagination,
} from '@mui/material';
import { Visibility, Refresh } from '@mui/icons-material';
import { format } from 'date-fns';
import { memberApplicationBulkUploadApi } from '../../../services/api';

interface Upload {
  upload_id: number;
  upload_uuid: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by_name: string;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  status: string;
  created_at: string;
  processing_completed_at?: string;
}

const UploadHistoryTab: React.FC = () => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await memberApplicationBulkUploadApi.getRecentUploads(100);
      setUploads(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load upload history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Processing':
        return 'info';
      case 'Failed':
        return 'error';
      case 'Pending':
        return 'warning';
      case 'Cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (uploads.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No uploads found. Upload your first file to get started!</Alert>
      </Box>
    );
  }

  const paginatedUploads = uploads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Upload History</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={loadUploads}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell align="center">Total</TableCell>
              <TableCell align="center">Success</TableCell>
              <TableCell align="center">Failed</TableCell>
              <TableCell align="center">Duplicates</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedUploads.map((upload) => (
              <TableRow key={upload.upload_id} hover>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {upload.file_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={upload.file_type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{formatFileSize(upload.file_size)}</TableCell>
                <TableCell>{upload.uploaded_by_name || 'Unknown'}</TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="bold">
                    {upload.total_records}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {upload.successful_records}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color="error.main" fontWeight="bold">
                    {upload.failed_records}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color="warning.main" fontWeight="bold">
                    {upload.duplicate_records}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={upload.status}
                    color={getStatusColor(upload.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap>
                    {formatDate(upload.created_at)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton size="small">
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={uploads.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default UploadHistoryTab;

