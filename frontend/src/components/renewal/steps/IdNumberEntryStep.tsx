/**
 * Step 1: ID Number Entry
 * Public step - no authentication required
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  InputAdornment,
} from '@mui/material';
import { Person, ArrowForward, ArrowBack, HowToVote } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRenewalStore } from '../../../store/renewalStore';
import { getMemberRenewalData, validateIdNumber } from '../../../services/renewalApi';
import { devLog } from '../../../utils/logger';
import {
  backButtonSx,
  cancelButtonSx,
  primaryActionSx,
} from '../renewalWizardStyles';

const IdNumberEntryStep: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [idNumber, setIdNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoFetchTriggered, setAutoFetchTriggered] = useState(false);

  const { setMemberData, setCurrentStep, resetRenewal } = useRenewalStore();

  // Pre-fill ID number if passed from navigation state (e.g., from card display)
  // and automatically fetch member data
  useEffect(() => {
    const fetchMemberDataAuto = async (id: string) => {
      if (autoFetchTriggered) return; // Prevent duplicate calls

      setAutoFetchTriggered(true);
      setIsLoading(true);
      setError('');

      try {
        devLog('Auto-fetching member data for ID:', id);
        const response = await getMemberRenewalData(id);

        if (response.member) {
          devLog('Member data retrieved:', response.member);
          setMemberData(response.member);
          setCurrentStep('review-info');
        } else {
          setError('Member not found. Please check your ID number and try again.');
          setAutoFetchTriggered(false); // Allow retry
        }
      } catch (err: any) {
        console.error('Error auto-fetching member data:', err);

        if (err.response?.status === 404) {
          setError('Member not found. Please check your ID number and try again.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('An error occurred while retrieving your information. Please try again.');
        }
        setAutoFetchTriggered(false); // Allow retry
      } finally {
        setIsLoading(false);
      }
    };

    if (location.state?.idNumber && !autoFetchTriggered) {
      const id = location.state.idNumber;
      setIdNumber(id);

      // Validate ID format before auto-fetching
      if (id.length === 13 && /^\d{13}$/.test(id)) {
        fetchMemberDataAuto(id);
      }
    }
  }, [location.state, autoFetchTriggered, setMemberData, setCurrentStep]);

  const handleIdNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 13) {
      setIdNumber(value);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate ID number format
    if (!validateIdNumber(idNumber)) {
      setError('Please enter a valid 13-digit South African ID number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      devLog('Manually fetching member data for ID:', idNumber);
      // Call the public API endpoint (no authentication required)
      const response = await getMemberRenewalData(idNumber);

      if (response.member) {
        devLog('Member data retrieved:', response.member);
        // Store member data and move to next step
        setMemberData(response.member);
        setCurrentStep('review-info');
      } else {
        setError('Member not found. Please check your ID number and try again.');
      }
    } catch (err: any) {
      console.error('Error fetching member data:', err);

      if (err.response?.status === 404) {
        setError('Member not found. Please check your ID number and try again.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred while retrieving your information. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, mb: 2.5 }}
      >
        <HowToVote sx={{ color: '#DC143C' }} />
        Enter Your ID Number
      </Typography>

      {/* Auto-loading indicator */}
      {isLoading && autoFetchTriggered && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} sx={{ color: '#DC143C' }} />
            <Typography variant="body2">
              Automatically retrieving your membership information...
            </Typography>
          </Box>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card
          elevation={0}
          sx={{
            border: idNumber.length === 13 && !error
              ? '2px solid #DC143C'
              : '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: 2.5,
            mb: 3,
            transition: 'border-color 0.25s ease',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <TextField
              fullWidth
              label="South African ID Number"
              value={idNumber}
              onChange={handleIdNumberChange}
              placeholder="0000000000000"
              helperText={
                idNumber.length > 0
                  ? `${idNumber.length}/13 digits ${idNumber.length === 13 ? '✓' : ''}`
                  : undefined
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: '#DC143C' }} />
                  </InputAdornment>
                ),
              }}
              disabled={isLoading}
              error={!!error}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2.5 }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Navigation Actions aligned with /apply */}
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
            disabled
            variant="outlined"
            startIcon={<ArrowBack />}
            sx={backButtonSx}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              type="button"
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
              type="submit"
              variant="contained"
              size="large"
              disabled={idNumber.length !== 13 || isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
              endIcon={!isLoading ? <ArrowForward /> : null}
              sx={primaryActionSx}
            >
              {isLoading ? 'Retrieving Information...' : 'Retrieve My Information'}
            </Button>
          </Box>
        </Box>
      </form>
    </Box>
  );
};

export default IdNumberEntryStep;
