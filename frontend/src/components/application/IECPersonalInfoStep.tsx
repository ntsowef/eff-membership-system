import React, { useEffect } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { CheckCircle, Error, Info, Lock, Edit } from '@mui/icons-material';
import { useApplication } from '../../store';
import { parseIdNumber } from '../../utils/idNumberParser';
import { useQuery } from '@tanstack/react-query';
import { referenceApi } from '../../services/api';
import { devLog } from '../../utils/logger';

interface IECPersonalInfoStepProps {
  errors: Record<string, string>;
}

interface ReferenceData {
  languages: Array<{ language_id: number; language_name: string; language_code?: string }>;
  occupations: Array<{ occupation_id: number; occupation_name: string; category_id?: number }>;
  qualifications: Array<{ qualification_id: number; qualification_name: string; qualification_code?: string; level_order: number }>;
  citizenships?: Array<{ citizenship_id: number; citizenship_name: string }>;
}

const IECPersonalInfoStep: React.FC<IECPersonalInfoStepProps> = ({ errors }) => {
  const { applicationData, updateApplicationData } = useApplication();
  
  // Check if user is a registered voter (from IEC verification)
  const isRegisteredVoter = (applicationData as any).is_registered_voter === true;
  const iecData = (applicationData as any).iec_verification;

  // Fetch reference data
  const { data: referenceData, isLoading: isLoadingReference, error: referenceError } = useQuery<ReferenceData>({
    queryKey: ['referenceData'],
    queryFn: async () => {
      const result = await referenceApi.getAllReferenceData();
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
  });

  // Auto-populate from ID number and IEC data if we have it
  useEffect(() => {
    const idNumber = applicationData.id_number;
    const updates: any = {};

    // 1. Parse ID number for DOB, gender, citizenship
    if (idNumber && idNumber.length === 13) {
      const parsed = parseIdNumber(idNumber);
      if (parsed.isValid) {
        // Only auto-populate if not already set
        if (!applicationData.date_of_birth && parsed.dateOfBirth) {
          updates.date_of_birth = parsed.dateOfBirth;
        }
        if (!applicationData.gender && parsed.gender) {
          updates.gender = parsed.gender;
        }
        if (!applicationData.citizenship_status && parsed.citizenshipStatus) {
          updates.citizenship_status = parsed.citizenshipStatus;
        }
      }
    }

    // 2. Map IEC geographic codes to application fields (if not already populated)
    if (iecData && iecData.is_registered) {
      devLog('🗺️ IECPersonalInfoStep: Mapping geographic codes from IEC data:', iecData);

      if (iecData.province_code && !applicationData.province_code) {
        updates.province_code = iecData.province_code;
      }
      if (iecData.district_code && !applicationData.district_code) {
        updates.district_code = iecData.district_code;
      }
      if (iecData.municipality_code && !applicationData.municipal_code) {
        updates.municipal_code = iecData.municipality_code;
      }
      if (iecData.ward_code && !applicationData.ward_code) {
        updates.ward_code = iecData.ward_code;
      }
      if (iecData.voting_district_code && !applicationData.voting_district_code) {
        updates.voting_district_code = iecData.voting_district_code;
      }
    }

    if (Object.keys(updates).length > 0) {
      devLog('✅ IECPersonalInfoStep: Auto-populating fields:', updates);
      updateApplicationData(updates);
    }
  }, []);

  const handleChange = (field: string, value: any) => {
    updateApplicationData({ [field]: value });
  };

  // Determine if DOB and Gender fields should be read-only (only for registered voters)
  const isDobReadOnly = isRegisteredVoter && !!applicationData.date_of_birth;
  const isGenderReadOnly = isRegisteredVoter && !!applicationData.gender;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Personal Information
      </Typography>
      
      {isRegisteredVoter ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <CheckCircle sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Your date of birth and gender have been verified from your voter registration.
            Fields marked with <Lock sx={{ fontSize: 14, mx: 0.5, verticalAlign: 'middle' }} /> are pre-filled.
          </Typography>
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <Edit sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            This ID number is not registered to vote. Please complete all required fields manually.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ID Number - Read Only Display */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="ID Number"
            value={applicationData.id_number || ''}
            InputProps={{
              readOnly: true,
              endAdornment: <Lock color="action" sx={{ fontSize: 20 }} />,
            }}
            helperText="Verified in previous step"
            sx={{ '& .MuiInputBase-input': { bgcolor: 'grey.50' } }}
          />
        </Grid>

        {/* Verification Status Badge */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip
            icon={isRegisteredVoter ? <CheckCircle /> : <Info />}
            label={isRegisteredVoter ? 'Registered Voter' : 'Not Registered to Vote'}
            color={isRegisteredVoter ? 'success' : 'warning'}
            variant="outlined"
            sx={{ height: 40, fontSize: '0.95rem' }}
          />
        </Grid>

        {/* First Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            value={applicationData.firstname || ''}
            onChange={(e) => handleChange('firstname', e.target.value)}
            error={!!errors.firstname}
            helperText={errors.firstname}
            required
          />
        </Grid>

        {/* Surname */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Surname"
            value={applicationData.surname || ''}
            onChange={(e) => handleChange('surname', e.target.value)}
            error={!!errors.surname}
            helperText={errors.surname}
            required
          />
        </Grid>

        {/* Date of Birth */}
        <Grid item xs={12} sm={6}>
          <DatePicker
            label="Date of Birth"
            value={applicationData.date_of_birth ? new Date(applicationData.date_of_birth) : null}
            onChange={(date) => !isDobReadOnly && handleChange('date_of_birth', date?.toISOString().split('T')[0])}
            disabled={isDobReadOnly}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.date_of_birth,
                helperText: errors.date_of_birth || (isDobReadOnly ? 'Auto-populated from ID number' : 'Required'),
                required: true,
                InputProps: {
                  endAdornment: isDobReadOnly ? <Lock color="action" sx={{ fontSize: 20, mr: 1 }} /> : undefined,
                },
                sx: isDobReadOnly ? { '& .MuiInputBase-input': { bgcolor: 'grey.50' } } : undefined,
              },
            }}
          />
        </Grid>

        {/* Gender */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.gender} required disabled={isGenderReadOnly}>
            <InputLabel>Gender</InputLabel>
            <Select
              value={applicationData.gender || ''}
              onChange={(e) => !isGenderReadOnly && handleChange('gender', e.target.value)}
              label="Gender"
              endAdornment={isGenderReadOnly ? <Lock color="action" sx={{ fontSize: 20, mr: 2 }} /> : undefined}
              sx={isGenderReadOnly ? { bgcolor: 'grey.50' } : undefined}
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
              <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
            </Select>
            {errors.gender && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {errors.gender}
              </Typography>
            )}
            {isGenderReadOnly && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, ml: 1.5 }}>
                Auto-populated from ID number
              </Typography>
            )}
          </FormControl>
        </Grid>

        {/* Citizenship Status */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.citizenship_status} required>
            <InputLabel>Citizenship Status</InputLabel>
            <Select
              value={applicationData.citizenship_status || ''}
              onChange={(e) => handleChange('citizenship_status', e.target.value)}
              label="Citizenship Status"
            >
              <MenuItem value="South African Citizen">South African Citizen</MenuItem>
              <MenuItem value="Foreign National">Foreign National</MenuItem>
              <MenuItem value="Permanent Resident">Permanent Resident</MenuItem>
            </Select>
            {errors.citizenship_status && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {errors.citizenship_status}
              </Typography>
            )}
          </FormControl>
        </Grid>

        {/* Language Selection */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.language_id} required>
            <InputLabel>Home Language</InputLabel>
            <Select
              value={applicationData.language_id || ''}
              onChange={(e) => handleChange('language_id', e.target.value)}
              label="Home Language"
              disabled={isLoadingReference}
            >
              {isLoadingReference ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading languages...
                </MenuItem>
              ) : referenceError ? (
                <MenuItem disabled>
                  <Error sx={{ mr: 1, color: 'error.main' }} />
                  Error loading languages
                </MenuItem>
              ) : !referenceData?.languages?.length ? (
                <MenuItem disabled>
                  <Info sx={{ mr: 1, color: 'warning.main' }} />
                  No languages available
                </MenuItem>
              ) : (
                referenceData.languages.map((language) => (
                  <MenuItem key={language.language_id} value={language.language_id}>
                    {language.language_name}
                  </MenuItem>
                ))
              )}
            </Select>
            {errors.language_id && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {errors.language_id}
              </Typography>
            )}
          </FormControl>
        </Grid>

        {/* Occupation Selection */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.occupation_id} required>
            <InputLabel>Occupation</InputLabel>
            <Select
              value={applicationData.occupation_id || ''}
              onChange={(e) => handleChange('occupation_id', e.target.value)}
              label="Occupation"
              disabled={isLoadingReference}
            >
              {isLoadingReference ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading occupations...
                </MenuItem>
              ) : referenceError ? (
                <MenuItem disabled>
                  <Error sx={{ mr: 1, color: 'error.main' }} />
                  Error loading occupations
                </MenuItem>
              ) : !referenceData?.occupations?.length ? (
                <MenuItem disabled>
                  <Info sx={{ mr: 1, color: 'warning.main' }} />
                  No occupations available
                </MenuItem>
              ) : (
                referenceData.occupations.map((occupation) => (
                  <MenuItem key={occupation.occupation_id} value={occupation.occupation_id}>
                    {occupation.occupation_name}
                  </MenuItem>
                ))
              )}
            </Select>
            {errors.occupation_id && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {errors.occupation_id}
              </Typography>
            )}
          </FormControl>
        </Grid>

        {/* Qualification Selection */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.qualification_id} required>
            <InputLabel>Highest Qualification</InputLabel>
            <Select
              value={applicationData.qualification_id || ''}
              onChange={(e) => handleChange('qualification_id', e.target.value)}
              label="Highest Qualification"
              disabled={isLoadingReference}
            >
              {isLoadingReference ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading qualifications...
                </MenuItem>
              ) : referenceError ? (
                <MenuItem disabled>
                  <Error sx={{ mr: 1, color: 'error.main' }} />
                  Error loading qualifications
                </MenuItem>
              ) : !referenceData?.qualifications?.length ? (
                <MenuItem disabled>
                  <Info sx={{ mr: 1, color: 'warning.main' }} />
                  No qualifications available
                </MenuItem>
              ) : (
                referenceData.qualifications.map((qualification) => (
                  <MenuItem key={qualification.qualification_id} value={qualification.qualification_id}>
                    {qualification.qualification_name}
                  </MenuItem>
                ))
              )}
            </Select>
            {errors.qualification_id && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {errors.qualification_id}
              </Typography>
            )}
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default IECPersonalInfoStep;

