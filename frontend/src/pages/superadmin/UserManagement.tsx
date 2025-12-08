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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import {
  SupervisorAccount,
  Refresh,
  Block,
  CheckCircle,
  AccessTime,
  ExitToApp,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/ui/PageHeader';
import ActionButton from '../../components/ui/ActionButton';
import { SuperAdminAPI } from '../../lib/superAdminApi';
import { useNotification } from '../../hooks/useNotification';
import { format } from 'date-fns';

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

const UserManagement: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [tabValue, setTabValue] = useState(0);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fetch active sessions
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: () => SuperAdminAPI.getActiveSessions(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const sessions = sessionsData?.data || [];

  // Terminate session mutation
  const terminateMutation = useMutation({
    mutationFn: (sessionId: string) => SuperAdminAPI.terminateSession(sessionId),
    onSuccess: () => {
      showSuccess('Session terminated successfully');
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      setTerminateDialogOpen(false);
      setSelectedSessionId(null);
    },
    onError: () => {
      showError('Failed to terminate session');
    },
  });

  const handleTerminateClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setTerminateDialogOpen(true);
  };

  const handleTerminateConfirm = () => {
    if (selectedSessionId) {
      terminateMutation.mutate(selectedSessionId);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: theme.palette.error.main,
      national: theme.palette.primary.main,
      province: theme.palette.info.main,
      district: theme.palette.success.main,
      municipality: theme.palette.warning.main,
      ward: theme.palette.secondary.main,
    };
    return colors[role] || theme.palette.grey[500];
  };

  return (
    <Box>
      <PageHeader
        title="User Management"
        subtitle="Manage users and active sessions"
        gradient
        actions={[
          <ActionButton
            key="refresh"
            icon={Refresh}
            onClick={() => refetchSessions()}
            variant="outlined"
          >
            Refresh
          </ActionButton>,
        ]}
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Active Sessions
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                    {sessions.length}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '16px',
                    background: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SupervisorAccount sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
          <Tab label="Active Sessions" />
        </Tabs>
      </Box>

      {/* Active Sessions Tab */}
      <TabPanel value={tabValue} index={0}>
        {sessionsLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : sessions.length === 0 ? (
          <Alert severity="info">No active sessions found.</Alert>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: '16px',
              boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.02) }}>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Login Time</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Last Activity</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session: any) => (
                  <TableRow
                    key={session.session_id}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                      },
                    }}
                  >
                    <TableCell>
                      {session.first_name} {session.last_name}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={session.role_name}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getRoleColor(session.role_name), 0.1),
                          color: getRoleColor(session.role_name),
                          fontWeight: 600,
                          borderRadius: '50px',
                        }}
                      />
                    </TableCell>
                    <TableCell>{session.email}</TableCell>
                    <TableCell>
                      {session.login_time ? format(new Date(session.login_time), 'MMM dd, HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {session.last_activity ? format(new Date(session.last_activity), 'MMM dd, HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell>{session.ip_address || 'N/A'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Terminate Session">
                        <IconButton
                          size="small"
                          onClick={() => handleTerminateClick(session.session_id)}
                          sx={{
                            color: theme.palette.error.main,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.error.main, 0.1),
                            },
                          }}
                        >
                          <ExitToApp />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Terminate Confirmation Dialog */}
      <Dialog open={terminateDialogOpen} onClose={() => setTerminateDialogOpen(false)}>
        <DialogTitle>Terminate Session</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to terminate this user session? The user will be logged out immediately.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTerminateConfirm} color="error" variant="contained" disabled={terminateMutation.isPending}>
            Terminate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;

