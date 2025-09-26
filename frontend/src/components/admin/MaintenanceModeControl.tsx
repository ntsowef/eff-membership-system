import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Box,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Build as BuildIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface MaintenanceStatus {
  is_enabled: boolean;
  status: 'active' | 'scheduled' | 'should_be_active' | 'inactive';
  maintenance_message: string;
  maintenance_level: string;
  minutes_until_start?: number | null;
  minutes_until_end?: number | null;
  enabled_by_name?: string | null;
  enabled_by_email?: string | null;
}

interface MaintenanceModeControlProps {
  onStatusChange?: (status: MaintenanceStatus) => void;
}

const MaintenanceModeControl: React.FC<MaintenanceModeControlProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState('full_system');
  const [scheduledStart, setScheduledStart] = useState<Date | null>(null);
  const [scheduledEnd, setScheduledEnd] = useState<Date | null>(null);
  
  // Dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/maintenance/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setMessage(data.data.maintenance_message || '');
        setLevel(data.data.maintenance_level || 'full_system');
        onStatusChange?.(data.data);
      } else {
        setError('Failed to fetch maintenance status');
      }
    } catch (err) {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const toggleMaintenance = async (enabled: boolean) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/maintenance/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled,
          message: message || 'The system is currently under maintenance. Please check back shortly.',
          level
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setSuccess(enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
        onStatusChange?.(data.data);
      } else {
        setError(data.error?.message || 'Failed to toggle maintenance mode');
      }
    } catch (err) {
      setError('Unable to connect to server');
    } finally {
      setUpdating(false);
    }
  };

  const scheduleMaintenance = async () => {
    if (!scheduledStart || !scheduledEnd) {
      setError('Please select both start and end times');
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/maintenance/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          message: message || 'The system is currently under maintenance. Please check back shortly.',
          level
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setSuccess('Maintenance scheduled successfully');
        setScheduleDialogOpen(false);
        setScheduledStart(null);
        setScheduledEnd(null);
        onStatusChange?.(data.data);
      } else {
        setError(data.error?.message || 'Failed to schedule maintenance');
      }
    } catch (err) {
      setError('Unable to connect to server');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'error';
      case 'scheduled': return 'warning';
      case 'should_be_active': return 'warning';
      case 'inactive': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'scheduled': return 'Scheduled';
      case 'should_be_active': return 'Should be Active';
      case 'inactive': return 'Inactive';
      default: return status;
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'full_system': return 'Full System';
      case 'api_only': return 'API Only';
      case 'frontend_only': return 'Frontend Only';
      case 'specific_modules': return 'Specific Modules';
      default: return level;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardHeader
          avatar={<BuildIcon />}
          title="Maintenance Mode Control"
          subheader="Manage system maintenance settings"
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Current Status */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Current Status
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Chip
                label={getStatusText(status?.status || 'inactive')}
                color={getStatusColor(status?.status || 'inactive') as any}
                icon={status?.is_enabled ? <WarningIcon /> : <CheckCircleIcon />}
              />
              <Chip
                label={getLevelText(status?.maintenance_level || 'full_system')}
                variant="outlined"
              />
            </Box>
            
            {status?.enabled_by_name && (
              <Typography variant="body2" color="text.secondary">
                Last modified by: {status.enabled_by_name}
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Toggle Control */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={status?.is_enabled || false}
                  onChange={(e) => toggleMaintenance(e.target.checked)}
                  disabled={updating}
                />
              }
              label={
                <Typography variant="h6">
                  {status?.is_enabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
                </Typography>
              }
            />
          </Box>

          {/* Configuration */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configuration
            </Typography>
            
            <TextField
              fullWidth
              label="Maintenance Message"
              multiline
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="The system is currently under maintenance. Please check back shortly."
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Maintenance Level</InputLabel>
              <Select
                value={level}
                label="Maintenance Level"
                onChange={(e) => setLevel(e.target.value)}
              >
                <MenuItem value="full_system">Full System</MenuItem>
                <MenuItem value="api_only">API Only</MenuItem>
                <MenuItem value="frontend_only">Frontend Only</MenuItem>
                <MenuItem value="specific_modules">Specific Modules</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Scheduling */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Schedule Maintenance
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={() => setScheduleDialogOpen(true)}
              disabled={updating}
            >
              Schedule Maintenance
            </Button>
          </Box>

          {/* Actions */}
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color={status?.is_enabled ? 'error' : 'warning'}
              onClick={() => toggleMaintenance(!status?.is_enabled)}
              disabled={updating}
              startIcon={updating ? <CircularProgress size={20} /> : <BuildIcon />}
            >
              {updating ? 'Updating...' : (status?.is_enabled ? 'Disable Now' : 'Enable Now')}
            </Button>
            
            <Button
              variant="outlined"
              onClick={fetchStatus}
              disabled={updating}
            >
              Refresh Status
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Maintenance</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <DateTimePicker
              label="Start Time"
              value={scheduledStart}
              onChange={setScheduledStart}
              slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
              minDateTime={new Date()}
            />

            <DateTimePicker
              label="End Time"
              value={scheduledEnd}
              onChange={setScheduledEnd}
              slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
              minDateTime={scheduledStart || new Date()}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={scheduleMaintenance}
            variant="contained"
            disabled={!scheduledStart || !scheduledEnd || updating}
          >
            {updating ? 'Scheduling...' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default MaintenanceModeControl;
