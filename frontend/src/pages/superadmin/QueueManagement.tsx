import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Pagination,
} from '@mui/material';
import {
  CloudQueue,
  Refresh,
  Pause,
  PlayArrow,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';
import QueueJobCard from '../../components/superadmin/QueueJobCard';
import { SuperAdminAPI } from '../../lib/superAdminApi';
import { useNotification } from '../../hooks/useNotification';

const QueueManagement: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const [queueType, setQueueType] = useState<'all' | 'upload' | 'renewal'>('all');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Fetch queue jobs
  const { data: jobsData, isLoading, error, refetch } = useQuery({
    queryKey: ['queueJobs', queueType, status, page],
    queryFn: () =>
      SuperAdminAPI.getQueueJobs({
        queueType,
        status: status === 'all' ? undefined : status,
        limit,
        offset: (page - 1) * limit,
      }),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const jobs = jobsData?.data?.jobs || [];
  const totalJobs = jobsData?.data?.total || 0;
  const totalPages = Math.ceil(totalJobs / limit);

  // Retry job mutation
  const retryMutation = useMutation({
    mutationFn: ({ jobId, queueType }: { jobId: string; queueType: 'upload' | 'renewal' }) =>
      SuperAdminAPI.retryJob(jobId, queueType),
    onSuccess: () => {
      showSuccess('Job retry initiated successfully');
      queryClient.invalidateQueries({ queryKey: ['queueJobs'] });
    },
    onError: () => {
      showError('Failed to retry job');
    },
  });

  // Cancel job mutation
  const cancelMutation = useMutation({
    mutationFn: ({ jobId, queueType }: { jobId: string; queueType: 'upload' | 'renewal' }) =>
      SuperAdminAPI.cancelJob(jobId, queueType),
    onSuccess: () => {
      showSuccess('Job cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['queueJobs'] });
    },
    onError: () => {
      showError('Failed to cancel job');
    },
  });

  const handleRetry = (jobId: string, jobQueueType: 'upload' | 'renewal') => {
    retryMutation.mutate({ jobId, queueType: jobQueueType });
  };

  const handleCancel = (jobId: string, jobQueueType: 'upload' | 'renewal') => {
    cancelMutation.mutate({ jobId, queueType: jobQueueType });
  };

  return (
    <Box>
      <PageHeader
        title="Queue Management"
        subtitle="Monitor and manage upload queue jobs"
        gradient
        actions={[
          <ActionButton key="refresh" icon={Refresh} onClick={() => refetch()} variant="outlined">
            Refresh
          </ActionButton>,
        ]}
      />

      {/* Filters */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 4,
          flexWrap: 'wrap',
        }}
      >
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Queue Type</InputLabel>
          <Select
            value={queueType}
            label="Queue Type"
            onChange={(e) => {
              setQueueType(e.target.value as any);
              setPage(1);
            }}
            sx={{ borderRadius: '50px' }}
          >
            <MenuItem value="all">All Queues</MenuItem>
            <MenuItem value="upload">Member Upload</MenuItem>
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
            <MenuItem value="waiting">Waiting</MenuItem>
            <MenuItem value="active">Processing</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="delayed">Delayed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Jobs Grid */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load queue jobs. Please try again.</Alert>
      ) : jobs.length === 0 ? (
        <Alert severity="info">No jobs found matching the selected filters.</Alert>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {jobs.map((job: any) => (
              <Grid item xs={12} md={6} lg={4} key={job.id}>
                <QueueJobCard
                  jobId={job.id}
                  queueType={job.queue_type}
                  status={job.status}
                  progress={job.progress}
                  fileName={job.file_name}
                  uploadedBy={job.uploaded_by}
                  createdAt={job.created_at}
                  processedAt={job.processed_at}
                  failedReason={job.failed_reason}
                  onRetry={(jobId) => handleRetry(jobId, job.queue_type)}
                  onCancel={(jobId) => handleCancel(jobId, job.queue_type)}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
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

export default QueueManagement;

