import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  LinearProgress,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { CloudUpload, Refresh, Info, Download, Delete } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  uploadBulkFile,
  getUploadHistory,
  deleteUploadHistory,
  checkRateLimitStatus,
  type UploadedFile,
} from '../../services/selfDataManagementApi';
import { useBulkUploadWebSocket } from '../../hooks/useBulkUploadWebSocket';
import { format } from 'date-fns';

// Stage-based color mapping for progress indicator
const getStageColor = (stage?: string): 'info' | 'warning' | 'success' | 'error' => {
  switch (stage) {
    case 'initialization':
    case 'file_reading':
      return 'info'; // Blue - Initial stages
    case 'validation':
      return 'info'; // Blue - Validation
    case 'iec_verification':
      return 'warning'; // Yellow/Orange - IEC verification
    case 'database_operations':
      return 'success'; // Green - Database operations
    case 'report_generation':
      return 'success'; // Green - Report generation
    case 'completion':
      return 'success'; // Green - Complete
    case 'error':
      return 'error'; // Red - Error
    default:
      return 'info'; // Default blue
  }
};

// Stage display names for user-friendly messages
const getStageDisplayName = (stage?: string): string => {
  switch (stage) {
    case 'initialization':
      return '🚀 Initializing...';
    case 'file_reading':
      return '📖 Reading Excel file...';
    case 'validation':
      return '🔍 Validating records...';
    case 'iec_verification':
      return '🗳️ Verifying with IEC...';
    case 'database_operations':
      return '💾 Processing database operations...';
    case 'report_generation':
      return '📊 Generating report...';
    case 'completion':
      return '✅ Processing complete!';
    case 'error':
      return '❌ Processing failed';
    default:
      return '⏳ Processing...';
  }
};

const BulkFileUploadTab: React.FC = () => {
	const queryClient = useQueryClient();
	const [uploadProgress, setUploadProgress] = useState<{
		file_id?: number;
		progress: number;
		message?: string;
		stage?: string;
	} | null>(null);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: 'success' | 'error' | 'info' | 'warning';
	}>({ open: false, message: '', severity: 'info' });
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [fileToDelete, setFileToDelete] = useState<number | null>(null);
	const [rateLimitStatus, setRateLimitStatus] = useState<{
		isLimited: boolean;
		message: string;
		resetTime?: number;
		currentCount?: number;
		maxLimit?: number;
	}>({ isLimited: false, message: '' });

	// Helper: update a single file row in the upload history cache based on WebSocket events
	const updateHistoryRow = (fileId: number, patch: Partial<UploadedFile>) => {
		queryClient.setQueryData<{ files: UploadedFile[]; total: number }>(
			['uploadHistory'],
			(oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					files: oldData.files.map((file) =>
						file.file_id === fileId ? { ...file, ...patch } : file,
					),
				};
			},
		);
	};

	// Fetch upload history
	const { data: historyData, isLoading, refetch } = useQuery({
		queryKey: ['uploadHistory'],
		queryFn: () => getUploadHistory({ limit: 50 }),
	});

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadBulkFile,
    retry: false, // IMPORTANT: Disable retries to prevent duplicate database entries
    onSuccess: (data) => {
      setSnackbar({
        open: true,
        message: `File uploaded successfully! Processing will begin shortly.`,
        severity: 'success',
      });
      setUploadProgress({ file_id: data.file_id, progress: 0, message: 'Waiting to start...' });
      queryClient.invalidateQueries({ queryKey: ['uploadHistory'] });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to upload file',
        severity: 'error',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUploadHistory,
    onSuccess: () => {
      setSnackbar({
        open: true,
        message: 'Upload history deleted successfully',
        severity: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['uploadHistory'] });
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to delete upload history',
        severity: 'error',
      });
    },
  });

  // WebSocket for real-time updates
  useBulkUploadWebSocket({
    onProgress: (data) => {
      setUploadProgress({
        file_id: data.file_id,
        progress: data.progress,
        message: data.message || `Processing: ${data.rows_processed}/${data.rows_total} rows`,
				stage: data.stage, // Include stage for color coding
			});

			// Update the corresponding row in upload history in real-time
			updateHistoryRow(data.file_id, {
				status: data.status as UploadedFile['status'],
				progress_percentage: data.progress,
				rows_processed: data.rows_processed,
				rows_total: data.rows_total,
			});
    },
    onComplete: (data) => {
      setSnackbar({
        open: true,
        message: `Processing complete! ${data.rows_success} successful, ${data.rows_failed} failed`,
        severity: data.rows_failed > 0 ? 'info' : 'success',
      });
			setUploadProgress(null);

			// Update history row immediately with final stats
			updateHistoryRow(data.file_id, {
				status: 'completed',
				progress_percentage: 100,
				rows_processed: data.rows_total,
				rows_total: data.rows_total,
				rows_success: data.rows_success,
				rows_failed: data.rows_failed,
			});

			// Also refetch from backend to sync any additional fields (e.g. report path)
			queryClient.invalidateQueries({ queryKey: ['uploadHistory'] });
    },
    onError: (data) => {
      setSnackbar({
        open: true,
        message: `Processing failed: ${data.error}`,
        severity: 'error',
      });
			setUploadProgress(null);

			// Mark row as failed
			updateHistoryRow(data.file_id, {
				status: 'failed',
				error_message: data.error,
			});
			queryClient.invalidateQueries({ queryKey: ['uploadHistory'] });
    },
    onRateLimitWarning: (data) => {
      setSnackbar({
        open: true,
	        message: `⚠️ System approaching IEC verification rate limit: ${data.current_count}/${data.max_limit} requests used (${data.remaining} remaining). All uploads may be temporarily paused soon.`,
        severity: 'warning',
      });
    },
    onRateLimitExceeded: (data) => {
      const resetDate = new Date(data.reset_time);
      const resetTimeStr = format(resetDate, 'HH:mm:ss');

      setRateLimitStatus({
        isLimited: true,
        message: data.message,
        resetTime: data.reset_time,
        currentCount: data.current_count,
        maxLimit: data.max_limit,
      });

      setSnackbar({
        open: true,
	        message: `🚫 System has reached IEC verification rate limit. All bulk uploads are temporarily paused until ${resetTimeStr}. Your upload processed ${data.rows_processed}/${data.rows_total} records before pausing.`,
        severity: 'error',
      });

      setUploadProgress(null);

				// Reflect partial progress in history table as well
				const computedProgress = data.rows_total > 0
					? Math.round((data.rows_processed / data.rows_total) * 100)
					: undefined;
				updateHistoryRow(data.file_id, {
					status: 'processing',
					rows_processed: data.rows_processed,
					rows_total: data.rows_total,
					...(computedProgress !== undefined ? { progress_percentage: computedProgress } : {}),
				});
    },
  });

  // Dropzone configuration
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
          setSnackbar({
            open: true,
            message: 'File size exceeds 50MB limit',
            severity: 'error',
          });
          return;
        }

        // CHECK RATE LIMIT BEFORE UPLOAD - Block uploads when IEC API rate limit is exceeded
        try {
          const rateLimitCheck = await checkRateLimitStatus();

          if (rateLimitCheck.is_limited) {
            const resetDate = new Date(rateLimitCheck.reset_time);
            const resetTimeStr = format(resetDate, 'HH:mm:ss');

            setRateLimitStatus({
              isLimited: true,
              message: rateLimitCheck.message,
              resetTime: rateLimitCheck.reset_time,
              currentCount: rateLimitCheck.current_count,
              maxLimit: rateLimitCheck.max_limit,
            });

            setSnackbar({
              open: true,
              message: `🚫 Upload blocked: IEC API rate limit exceeded (${rateLimitCheck.current_count}/${rateLimitCheck.max_limit}). Resets at ${resetTimeStr}.`,
              severity: 'error',
            });
            return; // DO NOT PROCEED WITH UPLOAD
          }
        } catch (error) {
          console.warn('Rate limit check failed, proceeding with upload:', error);
          // If rate limit check fails, allow upload (fail open)
        }

        uploadMutation.mutate(file);
      }
    },
    [uploadMutation]
  );

  // Disable dropzone when uploading OR when rate limited
  const isUploadDisabled = uploadMutation.isPending || rateLimitStatus.isLimited;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    disabled: isUploadDisabled,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      case 'rate_limited':
        return 'error';
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

	  return (
	    <Box sx={{ px: 3 }}>
	      {/* System-wide IEC rate limit banner */}
	      {rateLimitStatus.isLimited && (
	        <Alert
	          severity="error"
	          sx={{
	            mb: 3,
	            backgroundColor: 'rgba(211, 47, 47, 0.1)',
	            border: '2px solid',
	            borderColor: 'error.main',
	          }}
	        >
	          <Typography variant="body1" fontWeight="bold" gutterBottom>
	            ⚠️ IEC Verification Service Unavailable - System rate limit reached
	          </Typography>
	          {rateLimitStatus.resetTime && (
	            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
	              Uploads will resume at: {format(new Date(rateLimitStatus.resetTime), 'HH:mm:ss')}
	            </Typography>
	          )}
	        </Alert>
	      )}

      {/* Upload Section */}
      <Box sx={{ position: 'relative' }}>
        {/* Red Overlay when rate limited */}
        {rateLimitStatus.isLimited && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(211, 47, 47, 0.15)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
              pointerEvents: 'none',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'error.main',
                fontWeight: 'bold',
                textAlign: 'center',
                px: 2,
              }}
            >
              Upload Disabled - Rate Limit Exceeded
            </Typography>
          </Box>
        )}

        <Paper
          {...getRootProps()}
          sx={{
            p: 4,
            mb: 4,
            border: '2px dashed',
            borderColor: rateLimitStatus.isLimited
              ? 'error.main'
              : isDragActive
                ? 'primary.main'
                : 'grey.300',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            cursor: (uploadMutation.isPending || rateLimitStatus.isLimited) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            opacity: rateLimitStatus.isLimited ? 0.6 : 1,
            '&:hover': {
              borderColor: rateLimitStatus.isLimited ? 'error.main' : 'primary.main',
              bgcolor: rateLimitStatus.isLimited ? 'background.paper' : 'action.hover',
            },
          }}
        >
          <input {...getInputProps()} disabled={rateLimitStatus.isLimited} />
          <Box sx={{ textAlign: 'center' }}>
            <CloudUpload sx={{ fontSize: 64, color: rateLimitStatus.isLimited ? 'error.main' : 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the file here' : 'Drag & drop Excel file here'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              or click to select file
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: .xlsx, .xls (Max size: 50MB)
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Upload Progress with Stage-Based Colors */}
      {uploadProgress && (
        <Alert
          severity={getStageColor(uploadProgress.stage)}
          sx={{
            mb: 4,
            '& .MuiAlert-icon': {
              alignItems: 'center'
            }
          }}
        >
          <Typography variant="body1" fontWeight="medium" gutterBottom>
            {getStageDisplayName(uploadProgress.stage)}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {uploadProgress.message}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={uploadProgress.progress}
            color={getStageColor(uploadProgress.stage) === 'info' ? 'primary' : getStageColor(uploadProgress.stage)}
            sx={{
              mt: 1,
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0,0,0,0.1)'
            }}
          />
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
            {uploadProgress.progress}% complete
          </Typography>
        </Alert>
      )}

      {/* Upload History */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Upload History</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()} disabled={isLoading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Rows</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography>Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : historyData?.files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">No files uploaded yet</Typography>
                </TableCell>
              </TableRow>
            ) : (
              historyData?.files.map((file: UploadedFile) => (
                <TableRow key={file.file_id}>
                  <TableCell>{file.original_filename}</TableCell>
                  <TableCell>{formatFileSize(file.file_size)}</TableCell>
                  <TableCell>
                    <Chip
                      label={file.status.toUpperCase()}
                      color={getStatusColor(file.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {file.status === 'processing' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={file.progress_percentage}
                          sx={{ flexGrow: 1, minWidth: 100 }}
                        />
                        <Typography variant="caption">{file.progress_percentage}%</Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption">{file.progress_percentage}%</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {file.status === 'completed' ? (
                      <Typography variant="caption">
                        {file.rows_success} / {file.rows_total}
                        {file.rows_failed > 0 && (
                          <span style={{ color: 'red' }}> ({file.rows_failed} failed)</span>
                        )}
                      </Typography>
                    ) : file.rows_total > 0 ? (
                      <Typography variant="caption">
                        {file.rows_processed} / {file.rows_total}
                      </Typography>
                    ) : (
                      <Typography variant="caption">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {format(new Date(file.upload_timestamp), 'MMM dd, yyyy HH:mm')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {file.error_message && (
                        <Tooltip title={file.error_message}>
                          <IconButton size="small" color="error">
                            <Info />
                          </IconButton>
                        </Tooltip>
                      )}
                      {file.report_file_path && file.status === 'completed' && (
                        <Tooltip title="Download Report">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('auth-storage');
                                const authData = token ? JSON.parse(token) : null;
                                const accessToken = authData?.state?.token;

                                const response = await fetch(
                                  `/api/v1/self-data-management/bulk-upload/download-report/${file.file_id}`,
                                  {
                                    headers: {
                                      Authorization: `Bearer ${accessToken}`,
                                    },
                                  }
                                );

                                if (!response.ok) {
                                  throw new Error('Failed to download report');
                                }

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `report_${file.file_id}.xlsx`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error('Error downloading report:', error);
                                setSnackbar({
                                  open: true,
                                  message: 'Failed to download report',
                                  severity: 'error',
                                });
                              }
                            }}
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setFileToDelete(file.file_id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Delete />
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Upload History</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this upload history record? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (fileToDelete) {
                deleteMutation.mutate(fileToDelete);
              }
            }}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BulkFileUploadTab;

