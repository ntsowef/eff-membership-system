import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,

  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  Devices as DevicesIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  Computer as ComputerIcon,
  PhoneAndroid as PhoneIcon,
  Tablet as TabletIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActiveIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete, apiPost } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { showDangerConfirm } from '../../utils/sweetAlert';

interface Session {
  session_id: string;
  user_id: number;
  ip_address: string;
  user_agent: string;
  device_type?: string;
  browser?: string;
  os?: string;
  location?: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_current?: boolean;
}

const SessionManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [terminateAllDialogOpen, setTerminateAllDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch active sessions
  const { data: sessionsData, isLoading, refetch } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const response: any = await apiGet('/session/active');
      return response.data.data.sessions;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const sessions: Session[] = sessionsData || [];

  // Terminate single session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response: any = await apiDelete(`/session/${sessionId}`);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMessage('Session terminated successfully');
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to terminate session');
      setSuccessMessage('');
    },
  });

  // Terminate all other sessions mutation
  const terminateAllMutation = useMutation({
    mutationFn: async () => {
      const response: any = await apiPost('/session/terminate-others');
      return response.data;
    },
    onSuccess: (data) => {
      setSuccessMessage(`Terminated ${data.data.terminated} other sessions successfully`);
      setErrorMessage('');
      setTerminateAllDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to terminate sessions');
      setSuccessMessage('');
      setTerminateAllDialogOpen(false);
    },
  });

  const handleTerminateSession = async (sessionId: string) => {
    const confirmed = await showDangerConfirm(
      'This will immediately end this session and log out the user on that device.',
      'Terminate Session?',
      'Yes, terminate'
    );
    if (confirmed) {
      terminateSessionMutation.mutate(sessionId);
    }
  };

  const handleTerminateAll = () => {
    terminateAllMutation.mutate();
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <PhoneIcon />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <TabletIcon />;
    }
    return <ComputerIcon />;
  };

  const parseUserAgent = (userAgent: string) => {
    // Simple user agent parsing
    let browser = 'Unknown';
    let os = 'Unknown';

    // Browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return { browser, os };
  };

  const getSessionStatus = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 0) {
      return { label: 'Expired', color: 'error' as const };
    } else if (hoursUntilExpiry < 1) {
      return { label: 'Expiring Soon', color: 'warning' as const };
    } else {
      return { label: 'Active', color: 'success' as const };
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <DevicesIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6">Active Sessions</Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage devices and locations where you're currently logged in
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh sessions">
                <IconButton onClick={() => refetch()} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {sessions.length > 1 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={() => setTerminateAllDialogOpen(true)}
                  disabled={terminateAllMutation.isPending}
                >
                  Terminate All Others
                </Button>
              )}
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              You have <strong>{sessions.length}</strong> active session{sessions.length !== 1 ? 's' : ''}.
              For security, terminate any sessions you don't recognize.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Last Activity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      No active sessions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => {
                  const { browser, os } = parseUserAgent(session.user_agent);
                  const status = getSessionStatus(session.expires_at);

                  return (
                    <TableRow key={session.session_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getDeviceIcon(session.user_agent)}
                          <Box sx={{ ml: 2 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {browser} on {os}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.user_agent.substring(0, 50)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {session.ip_address}
                        </Typography>
                        {session.location && (
                          <Typography variant="caption" color="text.secondary">
                            {session.location}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                            icon={<ActiveIcon />}
                          />
                          {session.is_current && (
                            <Chip
                              label="Current"
                              color="primary"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {!session.is_current && (
                          <Tooltip title="Terminate this session">
                            <IconButton
                              color="error"
                              onClick={() => handleTerminateSession(session.session_id)}
                              disabled={terminateSessionMutation.isPending}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Terminate All Dialog */}
      <Dialog open={terminateAllDialogOpen} onClose={() => setTerminateAllDialogOpen(false)}>
        <DialogTitle>Terminate All Other Sessions?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will log you out from all other devices and locations. You will remain logged in on this device.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. Other devices will need to log in again.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateAllDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleTerminateAll}
            disabled={terminateAllMutation.isPending}
          >
            {terminateAllMutation.isPending ? 'Terminating...' : 'Terminate All Others'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionManagement;

