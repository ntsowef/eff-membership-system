import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Divider,

  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AdminPanelSettings as AdminIcon,

  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { useAuth } from '../../store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPut } from '../../lib/api';

interface ProfileFormData {
  name: string;
  email: string;
  // Note: phone is not editable here as it's not in users table
}

const ProfileInformation: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response: any = await apiPut('/user/me', data);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMessage('Profile updated successfully');
      setErrorMessage('');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to update profile');
      setSuccessMessage('');
    },
  });

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || ''
    });
    setIsEditing(false);
    setErrorMessage('');
  };

  const getAdminLevelDisplay = (level: string) => {
    const levels: Record<string, string> = {
      national: 'National Admin',
      province: 'Province Admin',
      district: 'Region Admin',
      municipality: 'Sub-Region Admin',
      ward: 'Ward Admin',
      none: 'No Admin Access',
    };
    return levels[level] || level;
  };

  const getAdminLevelColor = (level: string) => {
    const colors: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
      national: 'error',
      province: 'warning',
      district: 'info',
      municipality: 'info',
      ward: 'success',
      none: 'default',
    };
    return colors[level] || 'default';
  };

  if (!user) {
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

      {/* Profile Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                mr: 3,
                bgcolor: 'primary.main',
                fontSize: '2.5rem',
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" gutterBottom>
                {user.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<AdminIcon />}
                  label={getAdminLevelDisplay(user.admin_level)}
                  color={getAdminLevelColor(user.admin_level)}
                  size="small"
                />
                {user.role_name && (
                  <Chip
                    label={user.role_name.replace(/_/g, ' ').toUpperCase()}
                    variant="outlined"
                    size="small"
                  />
                )}
                {user.is_active && (
                  <Chip
                    icon={<VerifiedIcon />}
                    label="Active"
                    color="success"
                    size="small"
                  />
                )}
                {user.mfa_enabled && (
                  <Chip
                    label="MFA Enabled"
                    color="info"
                    size="small"
                  />
                )}
              </Box>
            </Box>
            {!isEditing && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Profile Information Form */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Personal Information
          </Typography>

          <Grid container spacing={3}>
            {/* Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing || updateProfileMutation.isPending}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing || updateProfileMutation.isPending}
                type="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Phone - Disabled: Not available in users table */}
            {/*
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={user?.phone || 'N/A'}
                disabled
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  ),
                }}
                helperText="Phone number is managed in member profile"
              />
            </Grid>
            */}

            {/* Admin Level (Read-only) */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Admin Level"
                value={getAdminLevelDisplay(user.admin_level)}
                disabled
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AdminIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Geographic Context (if applicable) */}
          {(user.province_code || user.district_code || user.municipal_code || user.ward_code) && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Geographic Assignment
              </Typography>
              <Grid container spacing={2}>
                {user.province_code && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Province
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {user.province_code}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {user.district_code && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Region
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {user.district_code}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {user.municipal_code && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Sub-Region
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {user.municipal_code}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {user.ward_code && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Ward
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {user.ward_code}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </>
          )}

          {/* Account Information */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Account Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Account Created
                </Typography>
                <Typography variant="body2">
                  {new Date(user.created_at).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
              </Box>
            </Grid>
            {user.last_login && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Last Login
                  </Typography>
                  <Typography variant="body2">
                    {new Date(user.last_login).toLocaleString('en-ZA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>

          {/* Action Buttons */}
          {isEditing && (
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={updateProfileMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={updateProfileMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfileInformation;

