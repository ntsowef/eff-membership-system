import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { geographicApi } from '../../services/api';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useMunicipalityContext } from '../../hooks/useMunicipalityContext';
import { LocationOn, Lock } from '@mui/icons-material';

interface Province {
  province_code: string;
  province_name: string;
}

interface ProvinceFilterProps {
  selectedProvince?: string;
  onProvinceChange: (provinceCode: string | undefined) => void;
  label?: string;
  showAllOption?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

const ProvinceFilter: React.FC<ProvinceFilterProps> = ({
  selectedProvince,
  onProvinceChange,
  label = 'Province',
  showAllOption = true,
  disabled = false,
  size = 'medium',
  fullWidth = true
}) => {
  const provinceContext = useProvinceContext();
  const municipalityContext = useMunicipalityContext();

  // Fetch provinces
  const { data: provinces, isLoading, error } = useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const result = await geographicApi.getProvinces();
      console.log('ProvinceFilter - API response:', result);
      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Determine if user should see province filter
  const shouldShowProvinceFilter = () => {
    // Municipal Admin users should not see province filter
    if (municipalityContext.isMunicipalityAdmin) {
      return false;
    }
    
    // Provincial Admin users should not see province filter (they're restricted to their province)
    if (provinceContext.isProvincialAdmin) {
      return false;
    }
    
    // National Admin and other roles should see the filter
    return true;
  };

  // Get available provinces based on user role
  const getAvailableProvinces = (): Province[] => {
    // Handle different API response formats
    let provincesArray: Province[] = [];

    if (!provinces) {
      return [];
    }

    // Check if provinces is directly an array
    if (Array.isArray(provinces)) {
      provincesArray = provinces;
    }
    // Check if provinces has a data property that contains the array
    else if (provinces.data && Array.isArray(provinces.data)) {
      provincesArray = provinces.data;
    }
    // Check if provinces has a provinces property that contains the array
    else if (provinces.provinces && Array.isArray(provinces.provinces)) {
      provincesArray = provinces.provinces;
    }
    else {
      console.warn('Unexpected provinces data format:', provinces);
      return [];
    }

    // Provincial Admin: Only their assigned province (but filter is hidden anyway)
    if (provinceContext.isProvincialAdmin && provinceContext.assignedProvince) {
      return provincesArray.filter(p => p.province_code === provinceContext.assignedProvince!.code);
    }

    // National Admin and others: All provinces
    return provincesArray;
  };

  // Don't render if user shouldn't see province filter
  if (!shouldShowProvinceFilter()) {
    return null;
  }

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading provinces...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load provinces. Please try again.
      </Alert>
    );
  }

  const availableProvinces = getAvailableProvinces();

  return (
    <Box>
      <FormControl 
        fullWidth={fullWidth} 
        size={size}
        disabled={disabled}
      >
        <InputLabel id="province-filter-label">
          <Box display="flex" alignItems="center" gap={0.5}>
            <LocationOn fontSize="small" />
            {label}
          </Box>
        </InputLabel>
        <Select
          labelId="province-filter-label"
          value={selectedProvince || ''}
          onChange={(e) => onProvinceChange(e.target.value || undefined)}
          label={
            <Box display="flex" alignItems="center" gap={0.5}>
              <LocationOn fontSize="small" />
              {label}
            </Box>
          }
        >
          {showAllOption && (
            <MenuItem value="">
              <Box display="flex" alignItems="center" gap={1}>
                <Typography>All Provinces</Typography>
                <Chip 
                  label={`${availableProvinces.length} provinces`} 
                  size="small" 
                  variant="outlined" 
                />
              </Box>
            </MenuItem>
          )}
          {availableProvinces.map((province) => (
            <MenuItem key={province.province_code} value={province.province_code}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography>{province.province_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  ({province.province_code})
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Show current context for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            Context: {municipalityContext.isMunicipalityAdmin ? 'Municipal Admin' : 
                     provinceContext.isProvincialAdmin ? 'Provincial Admin' : 
                     'National Admin'}
            {provinceContext.assignedProvince && (
              <> | Assigned: {provinceContext.assignedProvince.name}</>
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ProvinceFilter;
