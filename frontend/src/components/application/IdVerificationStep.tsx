import React, { useState, useCallback } from 'react';
import {
  Grid,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Collapse,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Search,
  Info,
  Warning,
  HowToVote,
} from '@mui/icons-material';
import { useApplication } from '../../store';
import { api } from '../../lib/api';
import { parseIdNumber } from '../../utils/idNumberParser';
import { devLog } from '../../utils/logger';

interface IdVerificationStepProps {
  errors: Record<string, string>;
  onVerificationComplete: (iecData: any, isRegistered: boolean) => void;
}

type VerificationStatus = 'idle' | 'verifying' | 'verified_registered' | 'verified_not_registered' | 'error';

const IdVerificationStep: React.FC<IdVerificationStepProps> = ({ errors, onVerificationComplete }) => {
  const { applicationData, updateApplicationData } = useApplication();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  const [idValidationError, setIdValidationError] = useState<string>('');
  const [iecData, setIecData] = useState<any>(null);

  // Validate SA ID number format
  const validateIdNumber = useCallback((idNumber: string): { isValid: boolean; error?: string } => {
    if (!idNumber) {
      return { isValid: false, error: 'ID number is required' };
    }
    if (idNumber.length !== 13) {
      return { isValid: false, error: 'ID number must be 13 digits' };
    }
    if (!/^\d{13}$/.test(idNumber)) {
      return { isValid: false, error: 'ID number must contain only digits' };
    }

    // Parse ID number to validate structure
    const parsed = parseIdNumber(idNumber);
    if (!parsed.isValid) {
      return { isValid: false, error: parsed.errors.join(', ') };
    }

    return { isValid: true };
  }, []);

  const handleIdNumberChange = (idNumber: string) => {
    // Only allow digits
    const cleanedId = idNumber.replace(/\D/g, '').slice(0, 13);
    updateApplicationData({ id_number: cleanedId });

    // Clear previous verification
    if (verificationStatus !== 'idle') {
      setVerificationStatus('idle');
      setVerificationMessage('');
      setIecData(null);
    }

    // Validate format
    if (cleanedId.length === 13) {
      const validation = validateIdNumber(cleanedId);
      if (!validation.isValid) {
        setIdValidationError(validation.error || 'Invalid ID number');
      } else {
        setIdValidationError('');
      }
    } else {
      setIdValidationError('');
    }
  };

  const handleVerifyId = async () => {
    const idNumber = applicationData.id_number;
    
    // Validate first
    const validation = validateIdNumber(idNumber || '');
    if (!validation.isValid) {
      setIdValidationError(validation.error || 'Invalid ID number');
      return;
    }

    setVerificationStatus('verifying');
    setVerificationMessage('Verifying your ID with the IEC...');
    setIdValidationError('');

    try {
      // Call the public IEC verification endpoint
      const response = await api.post('/iec/verify-voter-public', { idNumber });

      devLog('IEC Verification Response:', response.data);

      if (response.data.success) {
        const data = response.data.data;
        setIecData(data);

        // Parse ID number for additional data (DOB, gender, citizenship)
        const parsed = parseIdNumber(idNumber || '');

        if (data.is_registered) {
          setVerificationStatus('verified_registered');
          setVerificationMessage('✅ You are registered to vote! Your information has been pre-filled.');

          // Auto-populate from ID parsing and IEC data
          const updates: any = {
            date_of_birth: parsed.dateOfBirth,
            gender: parsed.gender,
            citizenship_status: parsed.citizenshipStatus,
            iec_verification: data,
            is_registered_voter: true,
          };

          // Map IEC geographic codes directly to application fields
          if (data.province_code) {
            updates.province_code = data.province_code;
          }
          if (data.district_code) {
            updates.district_code = data.district_code;
          }
          if (data.municipality_code) {
            updates.municipal_code = data.municipality_code;
          }
          if (data.ward_code) {
            updates.ward_code = data.ward_code;
          }
          if (data.voting_district_code) {
            updates.voting_district_code = data.voting_district_code;
          }

          devLog('📍 IEC Geographic codes mapped to application:', {
            province_code: updates.province_code,
            district_code: updates.district_code,
            municipal_code: updates.municipal_code,
            ward_code: updates.ward_code,
            voting_district_code: updates.voting_district_code,
          });

          updateApplicationData(updates);
          onVerificationComplete(data, true);
        } else {
          setVerificationStatus('verified_not_registered');
          setVerificationMessage('This ID number is not registered to vote. Please complete all required fields manually.');

          // Still parse DOB, gender from ID but require manual completion
          updateApplicationData({
            iec_verification: data,
            is_registered_voter: false,
            // DO NOT auto-populate geographic fields - require manual entry
          });
          onVerificationComplete(data, false);
        }
      } else {
        setVerificationStatus('error');
        setVerificationMessage('Unable to verify at this time. Please proceed with manual entry.');
        onVerificationComplete(null, false);
      }
    } catch (error: any) {
      console.error('IEC Verification Error:', error);
      setVerificationStatus('error');
      setVerificationMessage('Verification service unavailable. Please proceed with your application.');
      onVerificationComplete(null, false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verifying':
        return <CircularProgress size={24} />;
      case 'verified_registered':
        return <CheckCircle color="success" sx={{ fontSize: 28 }} />;
      case 'verified_not_registered':
        return <Warning color="warning" sx={{ fontSize: 28 }} />;
      case 'error':
        return <ErrorIcon color="error" sx={{ fontSize: 28 }} />;
      default:
        return null;
    }
  };

  const isVerified = verificationStatus === 'verified_registered' || verificationStatus === 'verified_not_registered';

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HowToVote color="primary" />
        ID Number Verification
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your South African ID number to verify your voter registration status.
        This helps us pre-fill your application with your registered voter information.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card
            sx={{
              border: verificationStatus === 'verified_registered'
                ? '2px solid #4caf50'
                : verificationStatus === 'verified_not_registered'
                ? '2px solid #ff9800'
                : '1px solid rgba(0, 0, 0, 0.12)',
              transition: 'all 0.3s ease'
            }}
          >
            <CardContent>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="South African ID Number"
                    value={applicationData.id_number || ''}
                    onChange={(e) => handleIdNumberChange(e.target.value)}
                    error={!!errors.id_number || !!idValidationError}
                    helperText={
                      errors.id_number ||
                      idValidationError ||
                      'Enter your 13-digit South African ID number'
                    }
                    required
                    inputProps={{ maxLength: 13 }}
                    disabled={verificationStatus === 'verifying'}
                    InputProps={{
                      endAdornment: getStatusIcon(),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '1.2rem',
                        letterSpacing: '0.1em',
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleVerifyId}
                    disabled={
                      verificationStatus === 'verifying' ||
                      !applicationData.id_number ||
                      applicationData.id_number.length !== 13 ||
                      !!idValidationError
                    }
                    startIcon={verificationStatus === 'verifying' ? <CircularProgress size={20} color="inherit" /> : <Search />}
                    sx={{
                      py: 1.8,
                      background: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #B01030 0%, #6B0000 100%)',
                      },
                      '&:disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                      }
                    }}
                  >
                    {verificationStatus === 'verifying' ? 'Verifying...' : 'Verify ID'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Verification Result */}
        <Grid item xs={12}>
          <Collapse in={verificationStatus !== 'idle'}>
            {verificationStatus === 'verified_registered' && (
              <Alert
                severity="success"
                icon={<CheckCircle fontSize="large" />}
                sx={{
                  '& .MuiAlert-message': { width: '100%' }
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Voter Registration Verified!
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {verificationMessage}
                </Typography>
                {iecData && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                    <Typography variant="body2">
                      <strong>Province:</strong> {iecData.province_name || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Municipality:</strong> {iecData.municipality_name || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Ward:</strong> {iecData.ward_code || 'N/A'}
                    </Typography>
                    {iecData.voting_station_name && (
                      <Typography variant="body2">
                        <strong>Voting Station:</strong> {iecData.voting_station_name}
                      </Typography>
                    )}
                  </Box>
                )}
              </Alert>
            )}

            {verificationStatus === 'verified_not_registered' && (
              <Alert
                severity="warning"
                icon={<Warning fontSize="large" />}
              >
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Not Registered to Vote
                </Typography>
                <Typography variant="body2">
                  {verificationMessage}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  You can still apply for membership. Please ensure all your information is accurate.
                </Typography>
              </Alert>
            )}

            {verificationStatus === 'error' && (
              <Alert severity="info" icon={<Info fontSize="large" />}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Verification Service Unavailable
                </Typography>
                <Typography variant="body2">
                  {verificationMessage}
                </Typography>
              </Alert>
            )}
          </Collapse>
        </Grid>

        {/* Info Card */}
        {verificationStatus === 'idle' && (
          <Grid item xs={12}>
            <Alert severity="info" icon={<Info />}>
              <Typography variant="body2">
                <strong>Why do we verify your ID?</strong>
              </Typography>
              <Typography variant="body2">
                Verifying your ID with the Independent Electoral Commission (IEC) helps us:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li><Typography variant="body2">Pre-fill your voter registration details</Typography></li>
                <li><Typography variant="body2">Ensure accurate geographic assignment</Typography></li>
                <li><Typography variant="body2">Speed up your application process</Typography></li>
              </ul>
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default IdVerificationStep;

