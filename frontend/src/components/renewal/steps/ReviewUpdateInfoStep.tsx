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
import { useNavigate } from 'react-router-dom';
import { useRenewalStore } from '../../../store/renewalStore';
import { formatDate, calculateDaysUntilExpiry, isMembershipExpired } from '../../../services/renewalApi';
import {
  sectionCardSx,
  backButtonSx,
  cancelButtonSx,
  primaryActionSx,
} from '../renewalWizardStyles';

const ReviewUpdateInfoStep: React.FC = () => {
  const navigate = useNavigate();
  const { memberData, updateFormData, setCurrentStep, goToPreviousStep, resetRenewal } = useRenewalStore();

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
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2.5,
          border: '2px solid',
          borderColor: isExpired ? '#DC143C' : 'success.main',
          bgcolor: isExpired ? 'rgba(220, 20, 60, 0.05)' : 'rgba(46, 125, 50, 0.06)',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {isExpired ? (
              <Warning sx={{ fontSize: 40, color: '#DC143C' }} />
            ) : (
              <CheckCircle sx={{ fontSize: 40, color: 'success.dark' }} />
            )}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Membership Status: {memberData.membership_status_name || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
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
              sx={{ fontWeight: 700 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Personal Information (Read-Only) */}
      <Paper elevation={0} sx={sectionCardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Person sx={{ color: '#DC143C' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Personal Information</Typography>
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
      <Paper elevation={0} sx={sectionCardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Email sx={{ color: '#DC143C' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Contact Information</Typography>
          <Chip
            label="Editable"
            size="small"
            icon={<Edit sx={{ color: '#8B0000 !important' }} />}
            sx={{
              ml: 'auto',
              bgcolor: 'rgba(220, 20, 60, 0.1)',
              color: '#8B0000',
              fontWeight: 600,
            }}
          />
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
              helperText={errors.email}
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
              helperText={errors.cell_number}
              placeholder="0123456789"
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
              helperText={errors.landline_number}
              placeholder="0123456789"
              InputProps={{
                startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Address Information (Editable) */}
      <Paper elevation={0} sx={sectionCardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Home sx={{ color: '#DC143C' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Address Information</Typography>
          <Chip
            label="Editable"
            size="small"
            icon={<Edit sx={{ color: '#8B0000 !important' }} />}
            sx={{
              ml: 'auto',
              bgcolor: 'rgba(220, 20, 60, 0.1)',
              color: '#8B0000',
              fontWeight: 600,
            }}
          />
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
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Geographic Information (Read-Only) */}
      <Paper elevation={0} sx={sectionCardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LocationOn sx={{ color: '#DC143C' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Geographic Information</Typography>
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
      <Paper elevation={0} sx={sectionCardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CalendarToday sx={{ color: '#DC143C' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Membership Details</Typography>
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

      {/* Navigation Buttons aligned with /apply */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mt: 2,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={goToPreviousStep}
          sx={backButtonSx}
        >
          Back
        </Button>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => {
              resetRenewal();
              navigate('/');
            }}
            sx={cancelButtonSx}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={handleNext}
            sx={primaryActionSx}
          >
            Continue to Payment
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ReviewUpdateInfoStep;
