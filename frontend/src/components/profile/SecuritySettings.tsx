import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,

  Paper,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  VpnKey as VpnKeyIcon,
  CheckCircle as CheckCircleIcon,

  QrCode2 as QrCodeIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import { useAuth } from '../../store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiGet } from '../../lib/api';

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface MFASetupData {
  secret: string;
  qr_code: string;
  backup_codes?: string[];
}

const SecuritySettings: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Password Change State
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // MFA State
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<MFASetupData | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [backupCodesDialogOpen, setBackupCodesDialogOpen] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Fetch security settings
  const { data: securitySettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['security-settings'],
    queryFn: async () => {
      const response: any = await apiGet('/security/settings');
      return response.data.data.settings;
    },
  });

  // Password Change Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response: any = await apiPost('/profile/me/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      return response.data;
    },
    onSuccess: () => {
      setPasswordSuccess('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setPasswordErrors({});
      setTimeout(() => setPasswordSuccess(''), 5000);
    },
    onError: (error: any) => {
      setPasswordErrors({
        general: error.response?.data?.message || 'Failed to change password',
      });
    },
  });

  // MFA Setup Mutation
  const setupMFAMutation = useMutation({
    mutationFn: async () => {
      const response: any = await apiPost('/mfa/setup');
      return response.data.data;
    },
    onSuccess: (data) => {
      setMfaSetupData(data);
      setMfaDialogOpen(true);
      setMfaError('');
    },
    onError: (error: any) => {
      setMfaError(error.response?.data?.message || 'Failed to setup MFA');
    },
  });

  // MFA Enable Mutation
  const enableMFAMutation = useMutation({
    mutationFn: async (token: string) => {
      const response: any = await apiPost('/mfa/enable', { token });
      return response.data.data;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backup_codes || []);
      setBackupCodesDialogOpen(true);
      setMfaDialogOpen(false);
      setMfaToken('');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
    },
    onError: (error: any) => {
      setMfaError(error.response?.data?.message || 'Invalid MFA token');
    },
  });

  // MFA Disable Mutation
  const disableMFAMutation = useMutation({
    mutationFn: async () => {
      const response: any = await apiPost('/mfa/disable');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
    },
    onError: (error: any) => {
      setMfaError(error.response?.data?.message || 'Failed to disable MFA');
    },
  });

  const handlePasswordChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.current_password) {
      errors.current_password = 'Current password is required';
    }

    if (!passwordData.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }

    if (!passwordData.confirm_password) {
      errors.confirm_password = 'Please confirm your new password';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = () => {
    if (validatePasswordForm()) {
      changePasswordMutation.mutate(passwordData);
    }
  };

  const handleMFASetup = () => {
    setupMFAMutation.mutate();
  };

  const handleMFAEnable = () => {
    if (mfaToken.length === 6) {
      enableMFAMutation.mutate(mfaToken);
    } else {
      setMfaError('Please enter a valid 6-digit code');
    }
  };

  const handleMFADisable = () => {
    if (window.confirm('Are you sure you want to disable Multi-Factor Authentication? This will make your account less secure.')) {
      disableMFAMutation.mutate();
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };
    if (password.length < 8) return { strength: 'Weak', color: 'error' };
    
    let score = 0;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { strength: 'Weak', color: 'error' };
    if (score === 2) return { strength: 'Fair', color: 'warning' };
    if (score === 3) return { strength: 'Good', color: 'info' };
    return { strength: 'Strong', color: 'success' };
  };

  const passwordStrength = getPasswordStrength(passwordData.new_password);

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Password Change Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <LockIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Change Password</Typography>
          </Box>

          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setPasswordSuccess('')}>
              {passwordSuccess}
            </Alert>
          )}

          {passwordErrors.general && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setPasswordErrors({})}>
              {passwordErrors.general}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Current Password */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                error={!!passwordErrors.current_password}
                helperText={passwordErrors.current_password}
                disabled={changePasswordMutation.isPending}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* New Password */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                error={!!passwordErrors.new_password}
                helperText={passwordErrors.new_password || (passwordStrength.strength && `Password strength: ${passwordStrength.strength}`)}
                disabled={changePasswordMutation.isPending}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Confirm Password */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirm_password}
                onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                error={!!passwordErrors.confirm_password}
                helperText={passwordErrors.confirm_password}
                disabled={changePasswordMutation.isPending}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handlePasswordSubmit}
              disabled={changePasswordMutation.isPending}
              startIcon={changePasswordMutation.isPending ? <CircularProgress size={20} /> : <LockIcon />}
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* MFA Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <ShieldIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Multi-Factor Authentication (MFA)</Typography>
          </Box>

          {mfaError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setMfaError('')}>
              {mfaError}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              Add an extra layer of security to your account by enabling Multi-Factor Authentication.
              You'll need to enter a code from your authenticator app in addition to your password when logging in.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <VpnKeyIcon sx={{ mr: 2, color: user.mfa_enabled ? 'success.main' : 'text.secondary' }} />
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  MFA Status: {user.mfa_enabled ? 'Enabled' : 'Disabled'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.mfa_enabled
                    ? 'Your account is protected with MFA'
                    : 'Enable MFA to secure your account'}
                </Typography>
              </Box>
            </Box>
            {user.mfa_enabled ? (
              <Button
                variant="outlined"
                color="error"
                onClick={handleMFADisable}
                disabled={disableMFAMutation.isPending}
              >
                {disableMFAMutation.isPending ? 'Disabling...' : 'Disable MFA'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleMFASetup}
                disabled={setupMFAMutation.isPending}
                startIcon={setupMFAMutation.isPending ? <CircularProgress size={20} /> : <SecurityIcon />}
              >
                {setupMFAMutation.isPending ? 'Setting up...' : 'Enable MFA'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Security Information */}
      {!settingsLoading && securitySettings && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6">Security Information</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Session Timeout
                  </Typography>
                  <Typography variant="h6">
                    {securitySettings.session_timeout_minutes || 30} minutes
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Max Failed Login Attempts
                  </Typography>
                  <Typography variant="h6">
                    {securitySettings.max_failed_attempts || 5} attempts
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Account Lockout Duration
                  </Typography>
                  <Typography variant="h6">
                    {securitySettings.lockout_duration_minutes || 15} minutes
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Password Expiry
                  </Typography>
                  <Typography variant="h6">
                    {securitySettings.password_expiry_days || 90} days
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* MFA Setup Dialog */}
      <Dialog open={mfaDialogOpen} onClose={() => setMfaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <QrCodeIcon sx={{ mr: 1 }} />
            Setup Multi-Factor Authentication
          </Box>
        </DialogTitle>
        <DialogContent>
          {mfaSetupData && (
            <Box>
              <Typography variant="body2" paragraph>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <img
                  src={mfaSetupData.qr_code}
                  alt="MFA QR Code"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  Manual Entry Code:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {mfaSetupData.secret}
                </Typography>
              </Alert>

              <TextField
                fullWidth
                label="Enter 6-digit code from your app"
                value={mfaToken}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setMfaToken(value);
                  setMfaError('');
                }}
                error={!!mfaError}
                helperText={mfaError || 'Enter the 6-digit code from your authenticator app'}
                inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setMfaDialogOpen(false);
            setMfaToken('');
            setMfaError('');
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleMFAEnable}
            disabled={enableMFAMutation.isPending || mfaToken.length !== 6}
          >
            {enableMFAMutation.isPending ? 'Verifying...' : 'Verify & Enable'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={backupCodesDialogOpen} onClose={() => setBackupCodesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
            MFA Enabled Successfully
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Save these backup codes in a secure location!
            </Typography>
            <Typography variant="body2">
              You can use these codes to access your account if you lose access to your authenticator app.
              Each code can only be used once.
            </Typography>
          </Alert>

          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <List dense>
              {backupCodes.map((code, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Typography variant="body2" color="text.secondary">
                      {index + 1}.
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                        {code}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setBackupCodesDialogOpen(false);
              setBackupCodes([]);
            }}
          >
            I've Saved My Backup Codes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecuritySettings;

