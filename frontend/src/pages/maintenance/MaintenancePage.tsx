import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Build as BuildIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

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

const MaintenancePage: React.FC = () => {
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchMaintenanceStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/maintenance/status');
      const data = await response.json();
      
      if (data.success) {
        setMaintenanceStatus(data.data);
        
        // Set countdown if maintenance will end soon
        if (data.data.minutes_until_end && data.data.minutes_until_end > 0) {
          setCountdown(data.data.minutes_until_end * 60); // Convert to seconds
        }
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
    fetchMaintenanceStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMaintenanceStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Maintenance should be ending, refresh status
          fetchMaintenanceStatus();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getMaintenanceLevelColor = (level: string) => {
    switch (level) {
      case 'full_system': return 'error';
      case 'api_only': return 'warning';
      case 'frontend_only': return 'info';
      case 'specific_modules': return 'secondary';
      default: return 'default';
    }
  };

  const getMaintenanceLevelText = (level: string) => {
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
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchMaintenanceStatus}
            >
              Try Again
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // If maintenance is not active, redirect to home
  if (!maintenanceStatus?.is_enabled) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              System is Online
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              The system is currently operational and not under maintenance.
            </Typography>
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
            >
              Go to Dashboard
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      minHeight="100vh"
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Maintenance Icon */}
          <Box sx={{ mb: 3 }}>
            <BuildIcon sx={{ fontSize: 80, color: 'warning.main' }} />
          </Box>

          {/* Title */}
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            System Under Maintenance
          </Typography>

          {/* Maintenance Level Chip */}
          <Box sx={{ mb: 3 }}>
            <Chip
              label={getMaintenanceLevelText(maintenanceStatus.maintenance_level)}
              color={getMaintenanceLevelColor(maintenanceStatus.maintenance_level) as any}
              size="medium"
              sx={{ fontSize: '1rem', px: 2, py: 1 }}
            />
          </Box>

          {/* Maintenance Message */}
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 4, lineHeight: 1.6 }}
          >
            {maintenanceStatus.maintenance_message}
          </Typography>

          {/* Countdown Timer */}
          {countdown !== null && countdown > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                <ScheduleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Estimated completion in:
              </Typography>
              <Typography
                variant="h4"
                color="primary"
                sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
              >
                {formatTime(countdown)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={100 - (countdown / (maintenanceStatus.minutes_until_end! * 60)) * 100}
                sx={{ mt: 2, height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {/* Maintenance Details */}
          {maintenanceStatus.enabled_by_name && (
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Initiated by:</strong> {maintenanceStatus.enabled_by_name}
                {maintenanceStatus.enabled_by_email && (
                  <> ({maintenanceStatus.enabled_by_email})</>
                )}
              </Typography>
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchMaintenanceStatus}
              size="large"
            >
              Check Again
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              size="large"
            >
              Try Dashboard
            </Button>
          </Box>

          {/* Auto-refresh Notice */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 3, display: 'block' }}
          >
            This page automatically refreshes every 30 seconds
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default MaintenancePage;
