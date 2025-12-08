import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert,
  AlertTitle,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Schedule,
  PlayArrow,
  Download,
  Refresh,
  Close,
  Assessment,
  People,
  HowToVote,
  Cancel
} from '@mui/icons-material';
import { useFileProcessing } from '../../hooks/useFileProcessing';
import type { FileProcessingJob } from '../../types/fileProcessing';
import CogLoader from '../common/CogLoader';

interface FileProcessingStatusModalProps {
  open: boolean;
  onClose: () => void;
  wardCode: string;
  wardName: string;
  initialJobData?: {
    filename: string;
    member_count: number;
    ward_info: any;
  };
}

const FileProcessingStatusModal: React.FC<FileProcessingStatusModalProps> = ({
  open,
  onClose,
  wardCode,
  wardName,
  initialJobData: _initialJobData
}) => {
  const {
    jobs = [],
    currentJob: _currentJob,
    queueStatus,
    connectWebSocket,
    disconnectWebSocket,
    downloadProcessedFile,
    cancelJob,
    refreshData
  } = useFileProcessing();

  const [currentWardJob, setCurrentWardJob] = useState<FileProcessingJob | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [initialQueueLength, setInitialQueueLength] = useState<number>(0);

  useEffect(() => {
    if (open) {
      connectWebSocket();

      // Refresh data when modal opens to get latest job information
      refreshData().catch(console.error);

      // Track initial queue length when modal opens
      if (queueStatus && initialQueueLength === 0) {
        const totalJobs = queueStatus.queueLength + (queueStatus.isProcessing ? 1 : 0);
        if (totalJobs > 0) {
          setInitialQueueLength(totalJobs);
        }
      }
    } else {
      disconnectWebSocket();
    }
  }, [open, connectWebSocket, disconnectWebSocket, refreshData, queueStatus, initialQueueLength]);

  // Separate effect to find ward job when jobs data changes
  useEffect(() => {
    if (open && jobs.length > 0) {
      // Find the current ward's job with more flexible matching
      const wardJob = jobs.find(job => {
        if (!job || !job.fileName) return false;

        // Try multiple matching patterns
        const fileName = job.fileName.toLowerCase();
        const wardCodeLower = wardCode.toLowerCase();

        return (
          // Standard pattern: WARD_42004013_Ward_13_...
          fileName.includes(`ward_${wardCodeLower}`) ||
          // Alternative pattern: just the ward code
          fileName.includes(wardCodeLower) ||
          // Ward number match
          (job.wardNumber && job.wardNumber.toString() === wardCode) ||
          // Audit file pattern
          (fileName.includes('audit') && fileName.includes(wardCodeLower))
        );
      });

      if (wardJob) {
        setCurrentWardJob(wardJob);
        if (wardJob.status === 'completed') {
          setShowResults(true);
        }
      }
    }

    return () => {
      disconnectWebSocket();
    };
  }, [open, wardCode, jobs, queueStatus, initialQueueLength, connectWebSocket, disconnectWebSocket]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'primary';
      case 'queued': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'failed': return <Error />;
      case 'processing': return <PlayArrow />;
      case 'queued': return <Schedule />;
      default: return <Schedule />;
    }
  };

  const handleDownload = async () => {
    if (currentWardJob && currentWardJob.status === 'completed') {
      try {
        await downloadProcessedFile(currentWardJob.id);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  const handleCancel = async () => {
    if (currentWardJob && (currentWardJob.status === 'queued' || currentWardJob.status === 'processing')) {
      try {
        await cancelJob(currentWardJob.id);
      } catch (error) {
        console.error('Cancel failed:', error);
      }
    }
  };

  const renderGlobalQueueProgress = () => {
    if (!queueStatus) return null;

    // Handle empty queue state
    if (queueStatus.isEmpty) {
      return (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment color="success" />
            Queue Status
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            <AlertTitle>Queue Empty</AlertTitle>
            All file processing jobs have been completed. The system is ready for new files.
          </Alert>
        </Box>
      );
    }

    const currentJobs = queueStatus.queueLength + (queueStatus.isProcessing ? 1 : 0);
    const totalJobs = Math.max(initialQueueLength, currentJobs);
    const completedJobs = totalJobs - currentJobs;
    const progressPercentage = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          Global Queue Status
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Queue Progress: {progressPercentage}% Complete
          {queueStatus.queueLength > 0 && ` (${queueStatus.queueLength} jobs remaining)`}
          {queueStatus.isProcessing && ' - Currently Processing'}
        </Typography>

        {/* Show CogLoader when processing is active */}
        {queueStatus.isProcessing && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CogLoader
              size="medium"
              text="Processing Audit Data"
              colors={{
                primary: '#1976d2',
                secondary: '#2196f3',
                tertiary: '#64b5f6'
              }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              flexGrow: 1,
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0,0,0,0.1)'
            }}
            color="primary"
          />
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 'fit-content', fontWeight: 'bold' }}>
            {progressPercentage}%
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {completedJobs} of {totalJobs} jobs completed
          {queueStatus.isProcessing && ' • Processing in progress...'}
          {queueStatus.currentJob && ` • Current: ${queueStatus.currentJob.fileName?.substring(0, 50)}...`}
        </Typography>
      </Box>
    );
  };

  const renderProcessingStatus = () => {
    if (!currentWardJob) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Looking for processing job for Ward {wardCode}...
          </Typography>
          {queueStatus?.isProcessing && (
            <>
              <Typography variant="body2" sx={{ mt: 1 }}>
                The system is currently processing other jobs. Your ward's job may be queued or completed.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
                <CogLoader
                  size="small"
                  text="Searching..."
                  colors={{
                    primary: '#ff9800',
                    secondary: '#ffb74d',
                    tertiary: '#ffcc02'
                  }}
                />
              </Box>
            </>
          )}

          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={() => refreshData().catch(console.error)}
            >
              Refresh Job Data
            </Button>
          </Box>
        </Alert>
      );
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Chip
            icon={getStatusIcon(currentWardJob.status)}
            label={currentWardJob.status.toUpperCase()}
            color={getStatusColor(currentWardJob.status) as any}
            variant="filled"
          />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {currentWardJob.fileName}
          </Typography>
          {(currentWardJob.status === 'queued' || currentWardJob.status === 'processing') && (
            <Tooltip title="Cancel Processing">
              <IconButton onClick={handleCancel} color="error" size="small">
                <Cancel />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Queue progress is already shown above */}

        {currentWardJob.status === 'processing' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlayArrow color="primary" />
              Ward {wardCode} Processing
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Processing Progress: {currentWardJob.progress}%
            </Typography>

            {/* Ward-specific CogLoader */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <CogLoader
                size="small"
                text={`Ward ${wardCode}`}
                colors={{
                  primary: '#4caf50',
                  secondary: '#66bb6a',
                  tertiary: '#81c784'
                }}
              />
            </Box>

            <LinearProgress
              variant="determinate"
              value={currentWardJob.progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">File Size</Typography>
              <Typography variant="body1">{(currentWardJob.fileSize / 1024).toFixed(1)} KB</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Ward Number</Typography>
              <Typography variant="body1">{currentWardJob.wardNumber || wardCode}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Created</Typography>
              <Typography variant="body1">
                {new Date(currentWardJob.createdAt).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                {currentWardJob.status}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {currentWardJob.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Error:</strong> {currentWardJob.error}
            </Typography>
          </Alert>
        )}
      </Box>
    );
  };

  const renderResults = () => {
    if (!currentWardJob || !currentWardJob.result || currentWardJob.status !== 'completed') {
      return null;
    }

    const result = currentWardJob.result;
    const stats = result.statistics;

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          Voter Verification Results
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <People color="primary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h4" color="primary">{stats.total_members}</Typography>
              <Typography variant="body2" color="text.secondary">Total Members</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <HowToVote color="success" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h4" color="success.main">{stats.registered_voters}</Typography>
              <Typography variant="body2" color="text.secondary">Registered Voters</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Error color="warning" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h4" color="warning.main">{stats.not_registered}</Typography>
              <Typography variant="body2" color="text.secondary">Not Registered</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Cancel color="error" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h4" color="error.main">{stats.deceased || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Deceased</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Registration Rate:</strong> {((stats.registered_voters / stats.total_members) * 100).toFixed(1)}%
          </Typography>
          <Typography variant="body2">
            <strong>Processing Time:</strong> {(stats.processing_time / 1000).toFixed(1)} seconds
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>Output Files Generated:</strong>
        </Typography>
        <List dense>
          {result.output_files?.map((file: string, index: number) => (
            <ListItem key={index}>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText 
                primary={file.split('\\').pop() || file.split('/').pop()}
                secondary={file}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment color="primary" />
            Ward {wardCode} Audit Processing
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {wardName ? `Processing audit data for ${wardName}` : `Processing audit data for Ward ${wardCode}`}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Always show global queue progress first */}
        {renderGlobalQueueProgress()}

        {/* Then show ward-specific status */}
        {renderProcessingStatus()}

        {showResults && (
          <>
            <Divider sx={{ my: 2 }} />
            {renderResults()}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        {currentWardJob?.status === 'completed' && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownload}
            color="primary"
          >
            Download Package
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileProcessingStatusModal;
