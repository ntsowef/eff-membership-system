/**
 * Step 2: Review & Update Information
 * Displays all member information and allows updates to editable fields
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  Grid,
  Divider,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Edit,
  CheckCircle,
  Warning,
  CalendarToday,
  LocationOn,
  Person,
  Email,
  Phone,
  Home,
} from '@mui/icons-material';
import { useRenewalStore } from '../../../store/renewalStore';
import { formatDate, calculateDaysUntilExpiry, isMembershipExpired } from '../../../services/renewalApi';

const ReviewUpdateInfoStep: React.FC = () => {
  const { memberData, updateFormData, setCurrentStep, goToPreviousStep } = useRenewalStore();

  const [editableData, setEditableData] = useState({
    email: memberData?.email || '',
    cell_number: memberData?.cell_number || '',
    landline_number: memberData?.landline_number || '',
    residential_address: memberData?.residential_address || '',
    postal_address: memberData?.postal_address || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (memberData) {
      setEditableData({
        email: memberData.email || '',
        cell_number: memberData.cell_number || '',
        landline_number: memberData.landline_number || '',
        residential_address: memberData.residential_address || '',
        postal_address: memberData.postal_address || '',
      });
    }
  }, [memberData]);

  if (!memberData) {
    return (
      <Alert severity="error">
        No member data found. Please go back and enter your ID number.
      </Alert>
    );
  }

  const daysUntilExpiry = memberData.expiry_date ? calculateDaysUntilExpiry(memberData.expiry_date) : 0;
  const isExpired = memberData.expiry_date ? isMembershipExpired(memberData.expiry_date) : false;

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditableData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    // Validate email
    if (editableData.email && !validateEmail(editableData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate cell number
    if (editableData.cell_number && !validatePhone(editableData.cell_number)) {
      newErrors.cell_number = 'Please enter a valid 10-digit phone number';
    }

    // Validate landline
    if (editableData.landline_number && !validatePhone(editableData.landline_number)) {
      newErrors.landline_number = 'Please enter a valid 10-digit phone number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Update form data with any changes
    updateFormData({
      email: editableData.email,
      cell_number: editableData.cell_number,
      landline_number: editableData.landline_number,
      residential_address: editableData.residential_address,
      postal_address: editableData.postal_address,
    });

    // Move to payment step
    setCurrentStep('payment');
  };

  return (
    <Box>
      {/* Membership Status Card */}
      <Card sx={{ mb: 3, bgcolor: isExpired ? 'error.light' : 'success.light' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isExpired ? (
              <Warning sx={{ fontSize: 40, color: 'error.dark' }} />
            ) : (
              <CheckCircle sx={{ fontSize: 40, color: 'success.dark' }} />
            )}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Membership Status: {memberData.membership_status_name || 'Unknown'}
              </Typography>
              <Typography variant="body2">
                {isExpired ? (
                  <>Your membership expired {Math.abs(daysUntilExpiry)} days ago</>
                ) : (
                  <>Your membership expires in {daysUntilExpiry} days</>
                )}
              </Typography>
              {memberData.expiry_date && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Expiry Date:</strong> {formatDate(memberData.expiry_date)}
                </Typography>
              )}
            </Box>
            <Chip
              label={isExpired ? 'EXPIRED' : 'ACTIVE'}
              color={isExpired ? 'error' : 'success'}
              size="medium"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Personal Information (Read-Only) */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Person color="primary" />
          <Typography variant="h6">Personal Information</Typography>
          <Chip label="Read-Only" size="small" sx={{ ml: 'auto' }} />
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              First Name
            </Typography>
            <Typography variant="body1">{memberData.firstname}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Surname
            </Typography>
            <Typography variant="body1">{memberData.surname || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Middle Name
            </Typography>
            <Typography variant="body1">{memberData.middle_name || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              ID Number
            </Typography>
            <Typography variant="body1">{memberData.id_number}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Date of Birth
            </Typography>
            <Typography variant="body1">
              {memberData.date_of_birth ? formatDate(memberData.date_of_birth) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Age
            </Typography>
            <Typography variant="body1">{memberData.age || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Gender
            </Typography>
            <Typography variant="body1">{memberData.gender_name || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Language
            </Typography>
            <Typography variant="body1">{memberData.language_name || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Membership Number
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {memberData.membership_number || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Contact Information (Editable) */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Email color="primary" />
          <Typography variant="h6">Contact Information</Typography>
          <Chip label="Editable" size="small" color="primary" icon={<Edit />} sx={{ ml: 'auto' }} />
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email Address"
              value={editableData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email || 'Update your email address if needed'}
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Cell Phone Number"
              value={editableData.cell_number}
              onChange={(e) => handleFieldChange('cell_number', e.target.value)}
              error={!!errors.cell_number}
              helperText={errors.cell_number || 'Format: 0123456789'}
              InputProps={{
                startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Landline Number (Optional)"
              value={editableData.landline_number}
              onChange={(e) => handleFieldChange('landline_number', e.target.value)}
              error={!!errors.landline_number}
              helperText={errors.landline_number || 'Format: 0123456789'}
              InputProps={{
                startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Address Information (Editable) */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Home color="primary" />
          <Typography variant="h6">Address Information</Typography>
          <Chip label="Editable" size="small" color="primary" icon={<Edit />} sx={{ ml: 'auto' }} />
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Residential Address"
              value={editableData.residential_address}
              onChange={(e) => handleFieldChange('residential_address', e.target.value)}
              multiline
              rows={2}
              helperText="Your current residential address"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Postal Address (Optional)"
              value={editableData.postal_address}
              onChange={(e) => handleFieldChange('postal_address', e.target.value)}
              multiline
              rows={2}
              helperText="Leave blank if same as residential address"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Geographic Information (Read-Only) */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LocationOn color="primary" />
          <Typography variant="h6">Geographic Information</Typography>
          <Chip label="Read-Only" size="small" sx={{ ml: 'auto' }} />
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Province
            </Typography>
            <Typography variant="body1">{memberData.province_name || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Municipality
            </Typography>
            <Typography variant="body1">{memberData.municipality_name || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Ward
            </Typography>
            <Typography variant="body1">
              {memberData.ward_name || 'N/A'} ({memberData.ward_code || 'N/A'})
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Voting Station
            </Typography>
            <Typography variant="body1">{memberData.voting_station_name || 'N/A'}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Membership Details (Read-Only) */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CalendarToday color="primary" />
          <Typography variant="h6">Membership Details</Typography>
          <Chip label="Read-Only" size="small" sx={{ ml: 'auto' }} />
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Date Joined
            </Typography>
            <Typography variant="body1">
              {memberData.date_joined ? formatDate(memberData.date_joined) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Last Payment Date
            </Typography>
            <Typography variant="body1">
              {memberData.last_payment_date ? formatDate(memberData.last_payment_date) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Membership Type
            </Typography>
            <Typography variant="body1">{memberData.membership_type || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Subscription Type
            </Typography>
            <Typography variant="body1">{memberData.subscription_name || 'N/A'}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<ArrowBack />}
          onClick={goToPreviousStep}
        >
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          fullWidth
          endIcon={<ArrowForward />}
          onClick={handleNext}
        >
          Continue to Payment
        </Button>
      </Box>

      {/* Information Notice */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Note:</strong> Only the fields marked as "Editable" can be updated. If you need to change other information, please contact your branch office.
        </Typography>
      </Alert>
    </Box>
  );
};

export default ReviewUpdateInfoStep;

