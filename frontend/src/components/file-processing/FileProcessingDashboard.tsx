import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Paper,
  Divider
} from '@mui/material';
import {
  CloudUpload,
  Download,
  Cancel,
  Refresh,
  CheckCircle,
  Error,
  Schedule,
  PlayArrow,
  Stop
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { FileProcessingService } from '../../services/fileProcessingService';
import type { FileProcessingJob, QueueStatus } from '../../types/fileProcessing';
import { useAuth } from '../../store';
import { useNotification } from '../../hooks/useNotification';

const FileProcessingDashboard: React.FC = () => {
  const { token } = useAuth();
  const { showNotification } = useNotification();
  const [fileProcessingService] = useState(() => FileProcessingService.getInstance());
  
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [jobHistory, setJobHistory] = useState<FileProcessingJob[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [_selectedWardNumber, _setSelectedWardNumber] = useState<number | undefined>();
  const [_uploadDialogOpen, _setUploadDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (token) {
      fileProcessingService.connect(token);
      
      // Set up event listeners
      fileProcessingService.on('connected', () => {
        setIsConnected(true);
        showNotification('Connected to file processing service', 'success');
        refreshData();
      });

      fileProcessingService.on('disconnected', () => {
        setIsConnected(false);
        showNotification('Disconnected from file processing service', 'warning');
      });

      fileProcessingService.on('connection_error', (data: any) => {
        showNotification(`Connection error: ${data.error}`, 'error');
      });

      fileProcessingService.on('file_queued', (data: any) => {
        showNotification(`File queued: ${data.fileName}`, 'info');
        refreshData();
      });

      fileProcessingService.on('job_started', (data: any) => {
        showNotification(`Processing started: ${data.fileName}`, 'info');
        refreshData();
      });

      fileProcessingService.on('job_progress', (data: any) => {
        // Update progress in real-time
        setJobHistory(prev => prev.map(job => 
          job.id === data.jobId 
            ? { ...job, progress: data.progress }
            : job
        ));
      });

      fileProcessingService.on('job_completed', (data: any) => {
        showNotification(`Processing completed: ${data.fileName}`, 'success');
        refreshData();
      });

      fileProcessingService.on('job_failed', (data: any) => {
        showNotification(`Processing failed: ${data.fileName} - ${data.error}`, 'error');
        refreshData();
      });

      fileProcessingService.on('job_cancelled', (data: any) => {
        showNotification(`Job cancelled: ${data.jobId}`, 'info');
        refreshData();
      });

      fileProcessingService.on('queue_status', (data: QueueStatus) => {
        setQueueStatus(data);
      });

      fileProcessingService.on('job_history', (data: FileProcessingJob[]) => {
        setJobHistory(data);
      });

      return () => {
        fileProcessingService.disconnect();
      };
    }
  }, [token, fileProcessingService, showNotification]);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [status, history] = await Promise.all([
        fileProcessingService.getQueueStatus(),
        fileProcessingService.getJobHistory(20)
      ]);
      setQueueStatus(status);
      setJobHistory(history);
    } catch (error) {
      console.error('Error refreshing data:', error);
      showNotification('Failed to refresh data', 'error');
    } finally {
      setLoading(false);
    }
  }, [fileProcessingService, showNotification]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validation = FileProcessingService.validateExcelFile(file);
    if (!validation.valid) {
      showNotification(validation.error!, 'error');
      return;
    }

    // Extract ward number from filename
    const extractedWard = FileProcessingService.extractWardNumber(file.name);
    _setSelectedWardNumber(extractedWard || undefined);
    _setUploadDialogOpen(true);
  }, [showNotification]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  // Upload handler (currently unused but kept for future use)
  // const handleUpload = async (file: File) => {
  //   try {
  //     setLoading(true);
  //     await fileProcessingService.uploadFile(file, selectedWardNumber);
  //     showNotification('File uploaded successfully', 'success');
  //     setUploadDialogOpen(false);
  //     refreshData();
  //   } catch (error) {
  //     console.error('Upload error:', error);
  //     showNotification('Failed to upload file', 'error');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleCancelJob = async (jobId: string) => {
    try {
      await fileProcessingService.cancelJob(jobId);
      showNotification('Job cancelled successfully', 'success');
      refreshData();
    } catch (error) {
      console.error('Cancel error:', error);
      showNotification('Failed to cancel job', 'error');
    }
  };

  const handleDownload = (jobId: string, fileName: string) => {
    try {
      fileProcessingService.downloadFile(jobId, fileName);
    } catch (error) {
      console.error('Download error:', error);
      showNotification('Failed to download file', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'primary';
      case 'queued': return 'default';
      case 'cancelled': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'failed': return <Error />;
      case 'processing': return <PlayArrow />;
      case 'queued': return <Schedule />;
      case 'cancelled': return <Stop />;
      default: return <Schedule />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        File Processing Dashboard
      </Typography>

      {/* Connection Status */}
      <Alert 
        severity={isConnected ? 'success' : 'warning'} 
        sx={{ mb: 3 }}
        action={
          <Button color="inherit" size="small" onClick={refreshData} disabled={loading}>
            <Refresh />
          </Button>
        }
      >
        {isConnected ? 'Connected to processing service' : 'Disconnected from processing service'}
      </Alert>

      <Grid container spacing={3}>
        {/* Upload Area */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Excel File
              </Typography>
              <Paper
                {...getRootProps()}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  {isDragActive
                    ? 'Drop the Excel file here...'
                    : 'Drag & drop an Excel file here, or click to select'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: .xlsx, .xls (Max 50MB)
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Queue Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Queue Status
              </Typography>
              {queueStatus ? (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Queue Length: <strong>{queueStatus.queueLength}</strong>
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Status: <strong>{queueStatus.isProcessing ? 'Processing' : 'Idle'}</strong>
                  </Typography>
                  {queueStatus.currentJob && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Current Job: <strong>{queueStatus.currentJob.fileName}</strong>
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={queueStatus.currentJob.progress} 
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {queueStatus.currentJob.progress}% complete
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography color="text.secondary">Loading...</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Job History */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Recent Jobs
            </Typography>
            <Button onClick={refreshData} disabled={loading}>
              <Refresh />
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List>
            {jobHistory.map((job) => (
              <ListItem key={job.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(job.status)}
                      <Typography variant="subtitle1">
                        {job.fileName}
                      </Typography>
                      <Chip 
                        label={job.status} 
                        color={getStatusColor(job.status) as any}
                        size="small"
                      />
                      {job.wardNumber && (
                        <Chip 
                          label={`Ward ${job.wardNumber}`} 
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Created: {new Date(job.createdAt).toLocaleString()}
                      </Typography>
                      {job.status === 'processing' && (
                        <LinearProgress 
                          variant="determinate" 
                          value={job.progress} 
                          sx={{ mt: 1, width: '200px' }}
                        />
                      )}
                      {job.error && (
                        <Typography variant="body2" color="error">
                          Error: {job.error}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {job.status === 'queued' && (
                      <Tooltip title="Cancel Job">
                        <IconButton onClick={() => handleCancelJob(job.id)}>
                          <Cancel />
                        </IconButton>
                      </Tooltip>
                    )}
                    {job.status === 'completed' && job.result?.output_files && (
                      <Tooltip title="Download Results">
                        <IconButton 
                          onClick={() => handleDownload(job.id, `${job.fileName}_processed.xlsx`)}
                        >
                          <Download />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {jobHistory.length === 0 && (
              <ListItem>
                <ListItemText 
                  primary="No jobs found"
                  secondary="Upload an Excel file to start processing"
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FileProcessingDashboard;
