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
import { Business } from '@mui/icons-material';

interface Municipality {
  municipality_code: string;
  municipality_name: string;
  province_code: string;
  municipality_type: 'Local' | 'Metropolitan' | 'District';
}

interface MunicipalityFilterProps {
  selectedProvince?: string;
  selectedMunicipality?: string;
  onMunicipalityChange: (municipalityCode: string | undefined) => void;
  label?: string;
  showAllOption?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

const MunicipalityFilter: React.FC<MunicipalityFilterProps> = ({
  selectedProvince,
  selectedMunicipality,
  onMunicipalityChange,
  label = 'Sub-Region',
  showAllOption = true,
  disabled = false,
  size = 'medium',
  fullWidth = true
}) => {
  const provinceContext = useProvinceContext();
  const municipalityContext = useMunicipalityContext();

  // Determine which province to use for fetching municipalities
  const getProvinceForFetch = (): string | undefined => {
    // Municipal Admin: Use their assigned province
    if (municipalityContext.isMunicipalityAdmin && municipalityContext.assignedProvince) {
      return municipalityContext.assignedProvince.code;
    }
    
    // Provincial Admin: Use their assigned province
    if (provinceContext.isProvincialAdmin && provinceContext.assignedProvince) {
      return provinceContext.assignedProvince.code;
    }
    
    // National Admin: Use selected province
    return selectedProvince;
  };

  // Fetch municipalities based on province
  const { data: municipalities, isLoading, error } = useQuery({
    queryKey: ['municipalities-by-province', getProvinceForFetch()],
    queryFn: async () => {
      const provinceCode = getProvinceForFetch();
      if (!provinceCode) return [];

      // Use the geographic API to get municipalities by province
      const result = await geographicApi.getMunicipalities(provinceCode);
      console.log('MunicipalityFilter - API response for province', provinceCode, ':', result);
      return result || [];
    },
    enabled: !!getProvinceForFetch(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Determine if user should see municipality filter
  const shouldShowMunicipalityFilter = () => {
    // Municipal Admin users should not see municipality filter (they're restricted to their municipality)
    if (municipalityContext.isMunicipalityAdmin) {
      return false;
    }
    
    // Provincial Admin and National Admin should see the filter
    return true;
  };

  // Get available municipalities based on user role
  const getAvailableMunicipalities = (): Municipality[] => {
    // Handle different API response formats
    let municipalitiesArray: Municipality[] = [];

    if (!municipalities) {
      return [];
    }

    // Check if municipalities is directly an array
    if (Array.isArray(municipalities)) {
      municipalitiesArray = municipalities;
    }
    // Check if municipalities has a data property that contains the array
    else if ((municipalities as any).data && Array.isArray((municipalities as any).data)) {
      municipalitiesArray = (municipalities as any).data;
    }
    // Check if municipalities has a municipalities property that contains the array
    else if ((municipalities as any).municipalities && Array.isArray((municipalities as any).municipalities)) {
      municipalitiesArray = (municipalities as any).municipalities;
    }
    else {
      console.warn('Unexpected municipalities data format:', municipalities);
      return [];
    }

    // Municipal Admin: Only their assigned municipality (but filter is hidden anyway)
    if (municipalityContext.isMunicipalityAdmin && municipalityContext.assignedMunicipality) {
      return municipalitiesArray.filter(m => m.municipality_code === municipalityContext.assignedMunicipality!.code);
    }

    // Provincial Admin and National Admin: All municipalities in the province
    return municipalitiesArray;
  };

  // Don't render if user shouldn't see municipality filter
  if (!shouldShowMunicipalityFilter()) {
    return null;
  }

  // Don't render if no province is selected (for National Admin)
  if (!getProvinceForFetch()) {
    return (
      <FormControl fullWidth={fullWidth} size={size} disabled>
        <InputLabel>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Business fontSize="small" />
            {label}
          </Box>
        </InputLabel>
        <Select
          value=""
          label={
            <Box display="flex" alignItems="center" gap={0.5}>
              <Business fontSize="small" />
              {label}
            </Box>
          }
        >
          <MenuItem value="">
            <Typography color="text.secondary">Select a province first</Typography>
          </MenuItem>
        </Select>
      </FormControl>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading municipalities...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load municipalities. Please try again.
      </Alert>
    );
  }

  const availableMunicipalities = getAvailableMunicipalities();

  return (
    <Box>
      <FormControl 
        fullWidth={fullWidth} 
        size={size}
        disabled={disabled}
      >
        <InputLabel id="municipality-filter-label">
          <Box display="flex" alignItems="center" gap={0.5}>
            <Business fontSize="small" />
            {label}
          </Box>
        </InputLabel>
        <Select
          labelId="municipality-filter-label"
          value={selectedMunicipality || ''}
          onChange={(e) => onMunicipalityChange(e.target.value || undefined)}
          label={
            <Box display="flex" alignItems="center" gap={0.5}>
              <Business fontSize="small" />
              {label}
            </Box>
          }
        >
          {showAllOption && (
            <MenuItem value="">
              <Box display="flex" alignItems="center" gap={1}>
                <Typography>All Sub-Regions</Typography>
                <Chip
                  label={`${availableMunicipalities.length} sub-regions`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </MenuItem>
          )}
          {availableMunicipalities.map((municipality) => (
            <MenuItem key={municipality.municipality_code} value={municipality.municipality_code}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography>{municipality.municipality_name}</Typography>
                <Chip 
                  label={municipality.municipality_type} 
                  size="small" 
                  variant="outlined"
                  color={municipality.municipality_type === 'Metropolitan' ? 'primary' : 'default'}
                />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Show current context for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            Province: {getProvinceForFetch()} | 
            Context: {municipalityContext.isMunicipalityAdmin ? 'Municipal Admin' : 
                     provinceContext.isProvincialAdmin ? 'Provincial Admin' : 
                     'National Admin'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MunicipalityFilter;
