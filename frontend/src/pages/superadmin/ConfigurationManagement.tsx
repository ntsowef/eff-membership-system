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
  TextField,
  Button,
  Tabs,
  Tab,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Settings,
  Save,
  Refresh,
  Speed,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';
import { SuperAdminAPI } from '../../lib/superAdminApi';
import { useNotification } from '../../hooks/useNotification';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const ConfigurationManagement: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [tabValue, setTabValue] = useState(0);

  // Rate limit form state
  const [rateLimitConfig, setRateLimitConfig] = useState({
    global_max_requests: 100,
    global_window_minutes: 15,
    upload_max_requests: 10,
    upload_window_minutes: 60,
  });

  // Queue config form state
  const [queueConfig, setQueueConfig] = useState({
    concurrency: 5,
    max_retries: 3,
    retry_delay_ms: 5000,
  });

  // Fetch system configuration
  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['systemConfiguration'],
    queryFn: () => SuperAdminAPI.getSystemConfiguration(),
  });

  // Fetch rate limit statistics
  const { data: rateLimitStatsData, isLoading: statsLoading } = useQuery({
    queryKey: ['rateLimitStatistics'],
    queryFn: () => SuperAdminAPI.getRateLimitStatistics(),
    refetchInterval: 10000,
  });

  const config = configData?.data || {};
  const rateLimitStats = Array.isArray(rateLimitStatsData?.data)
    ? rateLimitStatsData.data
    : [];

  // Update rate limit config mutation
  const updateRateLimitMutation = useMutation({
    mutationFn: (config: any) => SuperAdminAPI.updateRateLimitConfig(config),
    onSuccess: () => {
      showSuccess('Rate limit configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: ['systemConfiguration'] });
    },
    onError: () => {
      showError('Failed to update rate limit configuration');
    },
  });

  // Update queue config mutation
  const updateQueueMutation = useMutation({
    mutationFn: (config: any) => SuperAdminAPI.updateQueueConfig(config),
    onSuccess: () => {
      showSuccess('Queue configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: ['systemConfiguration'] });
    },
    onError: () => {
      showError('Failed to update queue configuration');
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRateLimitSubmit = () => {
    updateRateLimitMutation.mutate(rateLimitConfig);
  };

  const handleQueueSubmit = () => {
    updateQueueMutation.mutate(queueConfig);
  };

  return (
    <Box>
      <PageHeader
        title="Configuration Management"
        subtitle="Manage system settings and configurations"
        gradient
        actions={[
          <ActionButton key="refresh" icon={Refresh} onClick={() => refetchConfig()} variant="outlined">
            Refresh
          </ActionButton>,
        ]}
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9375rem',
            },
          }}
        >
          <Tab icon={<Speed />} iconPosition="start" label="Rate Limits" />
          <Tab icon={<Settings />} iconPosition="start" label="Queue Settings" />
        </Tabs>
      </Box>

      {/* Rate Limits Tab */}
      <TabPanel value={tabValue} index={0}>
        {configLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Rate Limit Configuration
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Global Max Requests"
                      type="number"
                      value={rateLimitConfig.global_max_requests}
                      onChange={(e) =>
                        setRateLimitConfig({ ...rateLimitConfig, global_max_requests: parseInt(e.target.value) })
                      }
                      fullWidth
                      helperText="Maximum requests per window (global)"
                    />

                    <TextField
                      label="Global Window (minutes)"
                      type="number"
                      value={rateLimitConfig.global_window_minutes}
                      onChange={(e) =>
                        setRateLimitConfig({ ...rateLimitConfig, global_window_minutes: parseInt(e.target.value) })
                      }
                      fullWidth
                      helperText="Time window for global rate limit"
                    />

                    <TextField
                      label="Upload Max Requests"
                      type="number"
                      value={rateLimitConfig.upload_max_requests}
                      onChange={(e) =>
                        setRateLimitConfig({ ...rateLimitConfig, upload_max_requests: parseInt(e.target.value) })
                      }
                      fullWidth
                      helperText="Maximum upload requests per window"
                    />

                    <TextField
                      label="Upload Window (minutes)"
                      type="number"
                      value={rateLimitConfig.upload_window_minutes}
                      onChange={(e) =>
                        setRateLimitConfig({ ...rateLimitConfig, upload_window_minutes: parseInt(e.target.value) })
                      }
                      fullWidth
                      helperText="Time window for upload rate limit"
                    />

                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleRateLimitSubmit}
                      disabled={updateRateLimitMutation.isPending}
                      sx={{ borderRadius: '50px', mt: 2 }}
                    >
                      Save Rate Limit Settings
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Rate Limit Statistics
                  </Typography>

                  {statsLoading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : rateLimitStats.length === 0 ? (
                    <Alert severity="info">No rate limit statistics available.</Alert>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="right">
                              Requests
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rateLimitStats.map((stat: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{stat.user_email || 'Unknown'}</TableCell>
                              <TableCell align="right">{stat.request_count || 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Queue Settings Tab */}
      <TabPanel value={tabValue} index={1}>
        {configLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Queue Configuration
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label="Concurrency"
                      type="number"
                      value={queueConfig.concurrency}
                      onChange={(e) => setQueueConfig({ ...queueConfig, concurrency: parseInt(e.target.value) })}
                      fullWidth
                      helperText="Number of concurrent jobs to process"
                    />

                    <TextField
                      label="Max Retries"
                      type="number"
                      value={queueConfig.max_retries}
                      onChange={(e) => setQueueConfig({ ...queueConfig, max_retries: parseInt(e.target.value) })}
                      fullWidth
                      helperText="Maximum retry attempts for failed jobs"
                    />

                    <TextField
                      label="Retry Delay (ms)"
                      type="number"
                      value={queueConfig.retry_delay_ms}
                      onChange={(e) => setQueueConfig({ ...queueConfig, retry_delay_ms: parseInt(e.target.value) })}
                      fullWidth
                      helperText="Delay between retry attempts"
                    />

                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleQueueSubmit}
                      disabled={updateQueueMutation.isPending}
                      sx={{ borderRadius: '50px', mt: 2 }}
                    >
                      Save Queue Settings
                    </Button>

                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Note: Queue configuration changes require a server restart to take effect.
                    </Alert>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>
    </Box>
  );
};

export default ConfigurationManagement;

