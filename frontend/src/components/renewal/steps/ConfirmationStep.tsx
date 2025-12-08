/**
 * Step 4: Confirmation & Submit
 * Displays summary and processes renewal (PUBLIC - No authentication required)
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Grid,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Warning,
  Person,
  Payment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRenewalStore } from '../../../store/renewalStore';
import { processRenewal } from '../../../services/renewalApi';
import { devLog } from '../../../utils/logger';
import { formatCurrency, formatDate } from '../../../services/renewalApi';
import { queryKeys } from '../../../lib/queryClient';
import { showSuccess } from '../../../utils/sweetAlert';

const ConfirmationStep: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { memberData, formData, setRenewalResult, goToPreviousStep, resetRenewal } = useRenewalStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!memberData) {
    return (
      <Alert severity="error">
        No member data found. Please go back and enter your ID number.
      </Alert>
    );
  }

  const handleSubmit = async () => {
    setError('');
    setIsProcessing(true);

    try {
      // Prepare renewal data
      const renewalData = {
        id_number: memberData.id_number,
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        amount_paid: formData.amount_paid,
        updated_member_data: {
          email: formData.email,
          cell_number: formData.cell_number,
          landline_number: formData.landline_number,
          residential_address: formData.residential_address,
          postal_address: formData.postal_address,
        },
      };

      // Process renewal (public endpoint - no authentication required)
      const result = await processRenewal(renewalData);

      // Store result and show success
      setRenewalResult(result);

      // Invalidate all relevant caches to ensure fresh data
      devLog('🔄 Invalidating frontend caches after successful renewal...');
      await queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      await queryClient.invalidateQueries({ queryKey: ['renewals'] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['statistics'] });
      devLog('✅ Frontend cache invalidation completed');

      // Show success message
      showSuccess('Your membership has been renewed for 24 months.', 'Renewal Successful!');

      // Reset renewal state
      resetRenewal();

      // Redirect to home or success page
      navigate('/');
    } catch (err: any) {
      console.error('Error processing renewal:', err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred while processing your renewal. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if any data was updated
  const hasUpdates = 
    formData.email !== memberData.email ||
    formData.cell_number !== memberData.cell_number ||
    formData.landline_number !== memberData.landline_number ||
    formData.residential_address !== memberData.residential_address ||
    formData.postal_address !== memberData.postal_address;

  return (
    <Box>
      {/* Summary Header */}
      <Card sx={{ mb: 3, bgcolor: 'primary.light' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle sx={{ fontSize: 40, color: 'primary.dark' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" gutterBottom>
                Review Your Renewal
              </Typography>
              <Typography variant="body2">
                Please review all information before confirming your renewal
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Personal Information Summary */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Person color="primary" />
          <Typography variant="h6">Personal Information</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Full Name
            </Typography>
            <Typography variant="body1">
              {memberData.firstname} {memberData.surname}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              ID Number
            </Typography>
            <Typography variant="body1">{memberData.id_number}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Membership Number
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {memberData.membership_number}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Current Expiry Date
            </Typography>
            <Typography variant="body1">
              {memberData.expiry_date ? formatDate(memberData.expiry_date) : 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Updated Contact Information */}
      {hasUpdates && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Warning color="warning" />
            <Typography variant="h6">Updated Information</Typography>
            <Chip label="Changes Detected" color="warning" size="small" sx={{ ml: 'auto' }} />
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            {formData.email !== memberData.email && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Email Address
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                    {memberData.email || 'Not set'}
                  </Typography>
                  <Typography variant="body2">→</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formData.email}
                  </Typography>
                </Box>
              </Grid>
            )}
            {formData.cell_number !== memberData.cell_number && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Cell Phone Number
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                    {memberData.cell_number || 'Not set'}
                  </Typography>
                  <Typography variant="body2">→</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formData.cell_number}
                  </Typography>
                </Box>
              </Grid>
            )}
            {formData.residential_address !== memberData.residential_address && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Residential Address
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                    {memberData.residential_address || 'Not set'}
                  </Typography>
                  <Typography variant="body2">→</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formData.residential_address}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Payment Summary */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Payment color="primary" />
          <Typography variant="h6">Payment Details</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Payment Method
            </Typography>
            <Typography variant="body1">{formData.payment_method}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Amount
            </Typography>
            <Typography variant="h6" color="primary.main">
              {formatCurrency(formData.amount_paid)}
            </Typography>
          </Grid>
          {formData.payment_reference && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Payment Reference
              </Typography>
              <Typography variant="body1">{formData.payment_reference}</Typography>
            </Grid>
          )}
          <Grid item xs={12}>
            <Alert severity="success" icon={<CheckCircle />}>
              <Typography variant="body2">
                Your membership will be renewed for <strong>24 months</strong> from the payment date.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<ArrowBack />}
          onClick={goToPreviousStep}
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          fullWidth
          endIcon={isProcessing ? <CircularProgress size={20} /> : <CheckCircle />}
          onClick={handleSubmit}
          disabled={isProcessing}
          color="success"
        >
          {isProcessing ? 'Processing...' : 'Confirm Renewal'}
        </Button>
      </Box>
    </Box>
  );
};

export default ConfirmationStep;

