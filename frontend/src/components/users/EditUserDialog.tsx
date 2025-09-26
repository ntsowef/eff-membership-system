import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  AdminPanelSettings,
  LocationOn,
  Security,
  Edit,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { UserManagementAPI } from '../../lib/userManagementApi';
// Local User interface to match the data structure from the API
interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  admin_level: string;
  role_name: string;
  is_active: boolean;
  mfa_enabled?: boolean;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

interface EditUserDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (userData: any) => void;
  loading?: boolean;
}

interface EditUserFormData {
  name: string;
  email: string;
  admin_level: string;
  role_name: string;
  province_code: string;
  district_code: string;
  municipal_code: string;
  ward_code: string;
  is_active: boolean;
  new_password: string;
  confirm_password: string;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  user,
  onClose,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState<EditUserFormData>({
    name: '',
    email: '',
    admin_level: '',
    role_name: '',
    province_code: '',
    district_code: '',
    municipal_code: '',
    ward_code: '',
    is_active: true,
    new_password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch available roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => UserManagementAPI.getAvailableRoles(),
    enabled: open,
  });

  const roles = rolesData?.data?.roles || [];

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        admin_level: user.admin_level || '',
        role_name: user.role_name || '',
        province_code: user.province_code || '',
        district_code: user.district_code || '',
        municipal_code: user.municipal_code || '',
        ward_code: user.ward_code || '',
        is_active: user.is_active ?? true,
        new_password: '',
        confirm_password: '',
      });
      setErrors({});
    }
  }, [user]);

  const handleInputChange = (field: keyof EditUserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Only validate password fields since other fields are disabled
    if (!formData.new_password.trim()) {
      newErrors.new_password = 'New password is required';
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirm_password.trim()) {
      newErrors.confirm_password = 'Please confirm the password';
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    // Only send password reset data
    const updateData = {
      id: user?.id,
      new_password: formData.new_password,
    };

    onSave(updateData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      admin_level: '',
      role_name: '',
      province_code: '',
      district_code: '',
      municipal_code: '',
      ward_code: '',
      is_active: true,
      new_password: '',
      confirm_password: '',
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const getAdminLevelColor = (level: string) => {
    switch (level) {
      case 'national': return 'primary';
      case 'province': return 'secondary';
      case 'district': return 'info';
      case 'municipality': return 'warning';
      case 'ward': return 'default';
      default: return 'default';
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Security color="primary" />
          <Typography variant="h6">Reset User Password</Typography>
          <Chip
            label={user.admin_level}
            color={getAdminLevelColor(user.admin_level) as any}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* User Information */}
          <Typography variant="h6" gutterBottom>
            <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
            User Information
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                disabled
                InputProps={{
                  startAdornment: <Person color="disabled" sx={{ mr: 1 }} />,
                }}
                helperText="User information cannot be changed"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                disabled
                InputProps={{
                  startAdornment: <Email color="disabled" sx={{ mr: 1 }} />,
                }}
                helperText="User information cannot be changed"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    disabled
                    color="primary"
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Security color="disabled" />
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </Box>
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Administrative Information - Disabled */}
          <Typography variant="h6" gutterBottom>
            <AdminPanelSettings sx={{ mr: 1, verticalAlign: 'middle' }} />
            Administrative Information (Read-Only)
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled>
                <InputLabel>Admin Level</InputLabel>
                <Select
                  value={formData.admin_level}
                  label="Admin Level"
                >
                  <MenuItem value="national">National</MenuItem>
                  <MenuItem value="province">Provincial</MenuItem>
                  <MenuItem value="district">District</MenuItem>
                  <MenuItem value="municipality">Municipal</MenuItem>
                  <MenuItem value="ward">Ward</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role_name}
                  label="Role"
                >
                  {roles.map((role: any) => (
                    <MenuItem key={role.id} value={role.name}>
                      {role.name} - {role.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Geographic Assignment - Disabled */}
          <Typography variant="h6" gutterBottom>
            <LocationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
            Geographic Assignment (Read-Only)
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Province Code"
                value={formData.province_code}
                disabled
                helperText="Geographic assignments cannot be changed"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="District Code"
                value={formData.district_code}
                disabled
                helperText="Geographic assignments cannot be changed"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Municipal Code"
                value={formData.municipal_code}
                disabled
                helperText="Geographic assignments cannot be changed"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ward Code"
                value={formData.ward_code}
                disabled
                helperText="Geographic assignments cannot be changed"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Password Reset Section */}
          <Typography variant="h6" gutterBottom>
            <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
            Password Reset
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.new_password}
                onChange={(e) => handleInputChange('new_password', e.target.value)}
                error={!!errors.new_password}
                helperText={errors.new_password || 'Enter a new password (minimum 8 characters)'}
                InputProps={{
                  startAdornment: <Security color="action" sx={{ mr: 1 }} />,
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                error={!!errors.confirm_password}
                helperText={errors.confirm_password || 'Confirm the new password'}
                InputProps={{
                  startAdornment: <Security color="action" sx={{ mr: 1 }} />,
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Info Alert */}
          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Password Reset:</strong> Only the password can be changed in this dialog.
              All other user information is read-only. The user will need to log in with the new password
              after it is reset.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Security />}
        >
          {loading ? 'Resetting Password...' : 'Reset Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
