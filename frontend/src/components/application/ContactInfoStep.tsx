import React, { useEffect } from 'react';
import {
  Grid,
  TextField,
  Typography,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import { CheckCircle, LocationOn } from '@mui/icons-material';
import { useApplication } from '../../store';
import GeographicSelector from '../common/GeographicSelector';
import { devLog } from '../../utils/logger';

interface ContactInfoStepProps {
  errors: Record<string, string>;
}

const ContactInfoStep: React.FC<ContactInfoStepProps> = ({ errors }) => {
  const { applicationData, updateApplicationData } = useApplication();

  const handleChange = (field: string, value: any) => {
    updateApplicationData({ [field]: value });
  };

  // Check if user is a registered voter (from IEC verification)
  const isRegisteredVoter = (applicationData as any).is_registered_voter === true;
  const iecData = (applicationData as any).iec_verification;

  // Auto-populate geographic fields from IEC verification data
  useEffect(() => {
    if (iecData && iecData.is_registered) {
      devLog('🗺️ Auto-populating geographic fields from IEC data:', iecData);

      const updates: any = {};

      // Only populate if fields are empty
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

      // Auto-populate address fields if available
      if (iecData.street && !applicationData.address) {
        const addressParts = [iecData.street, iecData.suburb, iecData.town].filter(Boolean);
        if (addressParts.length > 0) {
          updates.address = addressParts.join(', ');
        }
      }
      if (iecData.town && !applicationData.city) {
        updates.city = iecData.town;
      }

      if (Object.keys(updates).length > 0) {
        devLog('✅ Auto-populating fields:', updates);
        updateApplicationData(updates);
      }
    }
  }, []); // Run once on mount

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2.5 }}>
        Contact Information
      </Typography>

      {isRegisteredVoter && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{ mb: 3 }}
          action={
            <Chip
              icon={<LocationOn />}
              label="IEC Verified"
              size="small"
              color="success"
              variant="outlined"
            />
          }
        >
          <Typography variant="body2">
            {iecData?.voting_station_name
              ? `Voting Station: ${iecData.voting_station_name}`
              : 'Voter registration location pre-filled.'}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={applicationData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="SMS Number"
            value={applicationData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            error={!!errors.phone}
            helperText={errors.phone}
            placeholder="+27123456789"
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Physical Address"
            multiline
            rows={2}
            value={applicationData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            error={!!errors.address}
            helperText={errors.address}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="City"
            value={applicationData.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            error={!!errors.city}
            helperText={errors.city}
            required
          />
        </Grid>

        {/* Geographic Selection - Complete Hierarchy */}
        <Grid item xs={12}>
          <GeographicSelector
            selectedProvince={applicationData.province_code}
            selectedDistrict={applicationData.district_code}
            selectedMunicipality={applicationData.municipal_code}
            selectedWard={applicationData.ward_code}
            selectedVotingDistrict={applicationData.voting_district_code}
            onProvinceChange={(code) => handleChange('province_code', code)}
            onDistrictChange={(code) => handleChange('district_code', code)}
            onMunicipalityChange={(code) => handleChange('municipal_code', code)}
            onWardChange={(code) => handleChange('ward_code', code)}
            onVotingDistrictChange={(code) => handleChange('voting_district_code', code)}
            showVotingDistricts={true}
            required={true}
            votingDistrictRequired={false} // Voting District is optional
            size="medium"
          />
          {/* Display geographic validation errors */}
          {(errors.province_code || errors.district_code || errors.municipal_code || errors.ward_code) && (
            <Box sx={{ mt: 1 }}>
              {errors.province_code && (
                <Typography variant="caption" color="error" display="block">
                  {errors.province_code}
                </Typography>
              )}
              {errors.district_code && (
                <Typography variant="caption" color="error" display="block">
                  {errors.district_code}
                </Typography>
              )}
              {errors.municipal_code && (
                <Typography variant="caption" color="error" display="block">
                  {errors.municipal_code}
                </Typography>
              )}
              {errors.ward_code && (
                <Typography variant="caption" color="error" display="block">
                  {errors.ward_code}
                </Typography>
              )}
            </Box>
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Postal Code"
            value={applicationData.postal_code || ''}
            onChange={(e) => handleChange('postal_code', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Country"
            value={applicationData.country || 'South Africa'}
            onChange={(e) => handleChange('country', e.target.value)}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="WhatsApp Number"
            value={applicationData.alternative_phone || ''}
            onChange={(e) => handleChange('alternative_phone', e.target.value)}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContactInfoStep;
