import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { useApplication } from '../../store';
import GeographicSelector from '../common/GeographicSelector';

interface ContactInfoStepProps {
  errors: Record<string, string>;
}

const ContactInfoStep: React.FC<ContactInfoStepProps> = ({ errors }) => {
  const { applicationData, updateApplicationData } = useApplication();

  const handleChange = (field: string, value: any) => {
    updateApplicationData({ [field]: value });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Contact Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please provide your current contact details. This information will be used 
        to communicate with you regarding your application and membership.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={applicationData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email || 'We will use this email for all communications'}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone Number"
            value={applicationData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            error={!!errors.phone}
            helperText={errors.phone || 'Include country code (e.g., +27123456789)'}
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
            helperText={errors.address || 'Street address, apartment/unit number'}
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
            helperText="Optional"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Country"
            value={applicationData.country || 'South Africa'}
            onChange={(e) => handleChange('country', e.target.value)}
            helperText="Optional"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Alternative Contact Number"
            value={applicationData.alternative_phone || ''}
            onChange={(e) => handleChange('alternative_phone', e.target.value)}
            helperText="Optional - Emergency contact number"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContactInfoStep;
