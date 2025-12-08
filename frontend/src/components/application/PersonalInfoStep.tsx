import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { CheckCircle, Error, Info } from '@mui/icons-material';
import { useApplication } from '../../store';
import { parseIdNumber } from '../../utils/idNumberParser';
import { useQuery } from '@tanstack/react-query';
import { referenceApi } from '../../services/api';

interface PersonalInfoStepProps {
  errors: Record<string, string>;
}

interface ReferenceData {
  languages: Array<{ language_id: number; language_name: string; language_code?: string }>;
  occupations: Array<{ occupation_id: number; occupation_name: string; category_id?: number }>;
  qualifications: Array<{ qualification_id: number; qualification_name: string; qualification_code?: string; level_order: number }>;
}

const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({ errors }) => {
  const { applicationData, updateApplicationData } = useApplication();
  const [idParsingStatus, setIdParsingStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [idParsingMessage, setIdParsingMessage] = useState<string>('');

  // Fetch reference data
  const { data: referenceData, isLoading: isLoadingReference, error: referenceError } = useQuery<ReferenceData>({
    queryKey: ['referenceData'],
    queryFn: async () => {
      console.log('🔄 Fetching reference data...');
      const result = await referenceApi.getAllReferenceData();
      console.log('✅ Reference data fetched:', result);
      return result.data; // Extract the data property from the API response
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Debug logging
  useEffect(() => {
    console.log('🔍 PersonalInfoStep Debug Info:');
    console.log('  - isLoadingReference:', isLoadingReference);
    console.log('  - referenceError:', referenceError);
    console.log('  - referenceData:', referenceData);
    if (referenceData) {
      console.log('  - Languages count:', referenceData.languages?.length || 0);
      console.log('  - Occupations count:', referenceData.occupations?.length || 0);
      console.log('  - Qualifications count:', referenceData.qualifications?.length || 0);
    }
  }, [isLoadingReference, referenceError, referenceData]);

  const handleChange = (field: string, value: any) => {
    updateApplicationData({ [field]: value });
  };

  // Handle ID number changes with auto-extraction
  const handleIdNumberChange = (idNumber: string) => {
    // Update the ID number field
    handleChange('id_number', idNumber);

    // Only parse if we have a complete 13-digit ID number
    if (idNumber.length === 13) {
      setIdParsingStatus('parsing');

      const parsed = parseIdNumber(idNumber);

      if (parsed.isValid) {
        // Auto-populate extracted fields
        if (parsed.dateOfBirth) {
          handleChange('date_of_birth', parsed.dateOfBirth);
        }
        if (parsed.gender) {
          handleChange('gender', parsed.gender);
        }
        if (parsed.citizenshipStatus) {
          handleChange('citizenship_status', parsed.citizenshipStatus);
        }

        setIdParsingStatus('success');
        setIdParsingMessage(`Successfully extracted: ${parsed.gender}, Age ${parsed.age}, ${parsed.citizenshipStatus}`);
      } else {
        setIdParsingStatus('error');
        setIdParsingMessage(parsed.errors.join(', '));
      }
    } else {
      setIdParsingStatus('idle');
      setIdParsingMessage('');
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Personal Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please provide your personal details as they appear on your official documents.
        Enter your South African ID number to automatically populate date of birth, gender, and citizenship status.
      </Typography>

      <Grid container spacing={3}>
        {/* ID Number Field - First for auto-extraction */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="South African ID Number"
            value={applicationData.id_number || ''}
            onChange={(e) => handleIdNumberChange(e.target.value)}
            error={!!errors.id_number || idParsingStatus === 'error'}
            helperText={
              errors.id_number ||
              idParsingMessage ||
              'Enter your 13-digit South African ID number for automatic field population'
            }
            required
            inputProps={{ maxLength: 13 }}
            InputProps={{
              endAdornment: idParsingStatus === 'parsing' ? (
                <CircularProgress size={20} />
              ) : idParsingStatus === 'success' ? (
                <CheckCircle color="success" />
              ) : idParsingStatus === 'error' ? (
                <Error color="error" />
              ) : null,
            }}
          />
          {idParsingStatus === 'success' && (
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="body2">
                ✅ ID number validated successfully! Fields have been auto-populated.
              </Typography>
            </Alert>
          )}
          {idParsingStatus === 'error' && (
            <Alert severity="error" sx={{ mt: 1 }}>
              <Typography variant="body2">
                ❌ {idParsingMessage}
              </Typography>
            </Alert>
          )}
        </Grid>

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

        <Grid item xs={12} sm={6}>
          <DatePicker
            label="Date of Birth"
            value={applicationData.date_of_birth ? new Date(applicationData.date_of_birth) : null}
            onChange={(date) => handleChange('date_of_birth', date?.toISOString().split('T')[0])}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.date_of_birth,
                helperText: errors.date_of_birth || (idParsingStatus === 'success' ? 'Auto-populated from ID number' : ''),
                required: true,
              },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.gender} required>
            <InputLabel>Gender</InputLabel>
            <Select
              value={applicationData.gender || ''}
              onChange={(e) => handleChange('gender', e.target.value)}
              label="Gender"
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
            {idParsingStatus === 'success' && applicationData.gender && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, ml: 1.5 }}>
                Auto-populated from ID number
              </Typography>
            )}
          </FormControl>
        </Grid>

        {/* Citizenship Status - Auto-populated */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.citizenship_status}>
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
            {idParsingStatus === 'success' && applicationData.citizenship_status && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, ml: 1.5 }}>
                Auto-populated from ID number
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
            {referenceError && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                Failed to load languages. Please refresh the page.
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
            {referenceError && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                Failed to load occupations. Please refresh the page.
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
            {referenceError && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                Failed to load qualifications. Please refresh the page.
              </Typography>
            )}
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PersonalInfoStep;
