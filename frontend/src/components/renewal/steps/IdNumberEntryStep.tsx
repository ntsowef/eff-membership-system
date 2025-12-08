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
  Paper,
  InputAdornment,
} from '@mui/material';
import { Person, ArrowForward } from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useRenewalStore } from '../../../store/renewalStore';
import { getMemberRenewalData, validateIdNumber, formatIdNumber } from '../../../services/renewalApi';
import { devLog } from '../../../utils/logger';

const IdNumberEntryStep: React.FC = () => {
  const location = useLocation();
  const [idNumber, setIdNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoFetchTriggered, setAutoFetchTriggered] = useState(false);

  const { setMemberData, setCurrentStep } = useRenewalStore();

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
    <Paper elevation={2} sx={{ p: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Person sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Enter Your ID Number
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please enter your South African ID number to retrieve your membership information
        </Typography>
      </Box>

      {/* Auto-loading indicator */}
      {isLoading && autoFetchTriggered && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">
              Automatically retrieving your membership information...
            </Typography>
          </Box>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="South African ID Number"
          value={idNumber}
          onChange={handleIdNumberChange}
          placeholder="0000000000000"
          helperText={
            idNumber.length > 0
              ? `${idNumber.length}/13 digits ${idNumber.length === 13 ? '✓' : ''}`
              : 'Enter your 13-digit ID number'
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Person />
              </InputAdornment>
            ),
          }}
          disabled={isLoading}
          error={!!error}
          sx={{ mb: 3 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {idNumber.length === 13 && !error && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Formatted ID:</strong> {formatIdNumber(idNumber)}
            </Typography>
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={idNumber.length !== 13 || isLoading}
          endIcon={isLoading ? <CircularProgress size={20} /> : <ArrowForward />}
        >
          {isLoading ? 'Retrieving Information...' : 'Retrieve My Information'}
        </Button>
      </form>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          <strong>Privacy Notice:</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Your ID number is used solely to retrieve your membership information. We do not store or share this information with third parties.
        </Typography>
      </Box>
    </Paper>
  );
};

export default IdNumberEntryStep;

