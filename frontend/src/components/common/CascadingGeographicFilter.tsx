import React, { useEffect, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Typography,
  Alert,
  Chip
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { geographicApi } from '../../services/api';

// Types for geographic data
interface Province {
  province_code: string;
  province_name: string;
}

interface Municipality {
  municipality_code: string;
  municipality_name: string;
  province_code: string;
  municipality_type: 'Local' | 'Metropolitan' | 'District';
}

interface CascadingGeographicFilterProps {
  selectedProvince?: string;
  selectedMunicipality?: string;
  onProvinceChange: (provinceCode: string) => void;
  onMunicipalityChange: (municipalityCode: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
  fullWidth?: boolean;
}

const CascadingGeographicFilter: React.FC<CascadingGeographicFilterProps> = ({
  selectedProvince,
  selectedMunicipality,
  onProvinceChange,
  onMunicipalityChange,
  disabled = false,
  size = 'small',
  variant = 'outlined',
  fullWidth = true
}) => {
  // Fetch provinces
  const {
    data: provincesResponse,
    isLoading: provincesLoading,
    error: provincesError
  } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => geographicApi.getProvinces(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch municipalities based on selected province
  const {
    data: municipalitiesResponse,
    isLoading: municipalitiesLoading,
    error: municipalitiesError
  } = useQuery({
    queryKey: ['municipalities', selectedProvince],
    queryFn: () => geographicApi.getMunicipalities(selectedProvince),
    enabled: !!selectedProvince,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract data from API response (handle both direct array and wrapped response)
  const provinces = useMemo(() => {
    if (!provincesResponse) return [];

    // Handle wrapped response format: { success: true, data: [...] }
    if (provincesResponse.data && Array.isArray(provincesResponse.data)) {
      return provincesResponse.data;
    }

    // Handle direct array response
    if (Array.isArray(provincesResponse)) {
      return provincesResponse;
    }

    console.warn('Unexpected provinces response format:', provincesResponse);
    return [];
  }, [provincesResponse]);

  const municipalities = useMemo(() => {
    if (!municipalitiesResponse) return [];

    // Handle wrapped response format: { success: true, data: [...] }
    if (municipalitiesResponse.data && Array.isArray(municipalitiesResponse.data)) {
      return municipalitiesResponse.data;
    }

    // Handle direct array response
    if (Array.isArray(municipalitiesResponse)) {
      return municipalitiesResponse;
    }

    console.warn('Unexpected municipalities response format:', municipalitiesResponse);
    return [];
  }, [municipalitiesResponse]);

  // Clear municipality when province changes
  useEffect(() => {
    if (selectedProvince && selectedMunicipality) {
      // Check if the current municipality belongs to the selected province
      const currentMunicipality = municipalities?.find(
        (m: Municipality) => m.municipality_code === selectedMunicipality
      );
      
      if (!currentMunicipality || currentMunicipality.province_code !== selectedProvince) {
        onMunicipalityChange('');
      }
    }
  }, [selectedProvince, municipalities, selectedMunicipality, onMunicipalityChange]);

  const handleProvinceChange = (provinceCode: string) => {
    onProvinceChange(provinceCode);
    // Clear municipality when province changes
    if (selectedMunicipality) {
      onMunicipalityChange('');
    }
  };

  const handleMunicipalityChange = (municipalityCode: string) => {
    onMunicipalityChange(municipalityCode);
  };

  // Sort provinces alphabetically
  const sortedProvinces = provinces ? [...provinces].sort((a: Province, b: Province) => 
    a.province_name.localeCompare(b.province_name)
  ) : [];

  // Sort municipalities alphabetically
  const sortedMunicipalities = municipalities ? [...municipalities].sort((a: Municipality, b: Municipality) => 
    a.municipality_name.localeCompare(b.municipality_name)
  ) : [];

  return (
    <Box
      display="flex"
      gap={2}
      alignItems="flex-start"
      sx={{
        flexDirection: { xs: 'column', sm: 'row' },
        width: '100%'
      }}
    >
      {/* Province Dropdown */}
      <FormControl
        fullWidth={fullWidth}
        size={size}
        disabled={disabled}
        sx={{ minWidth: { sm: 200 } }}
      >
        <InputLabel id="province-select-label">Province</InputLabel>
        <Select
          labelId="province-select-label"
          id="province-select"
          value={selectedProvince || ''}
          label="Province"
          onChange={(e) => handleProvinceChange(e.target.value)}
          variant={variant}
          endAdornment={
            provincesLoading ? (
              <CircularProgress size={20} sx={{ mr: 2 }} />
            ) : null
          }
        >
          <MenuItem value="">
            <em>Select Province</em>
          </MenuItem>
          {sortedProvinces.map((province: Province) => (
            <MenuItem key={province.province_code} value={province.province_code}>
              {province.province_name} ({province.province_code})
            </MenuItem>
          ))}
        </Select>
        {provincesError && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
            Failed to load provinces
          </Typography>
        )}
      </FormControl>

      {/* Municipality Dropdown */}
      <FormControl
        fullWidth={fullWidth}
        size={size}
        disabled={disabled || !selectedProvince}
        sx={{ minWidth: { sm: 250 } }}
      >
        <InputLabel id="municipality-select-label">Municipality</InputLabel>
        <Select
          labelId="municipality-select-label"
          id="municipality-select"
          value={selectedMunicipality || ''}
          label="Municipality"
          onChange={(e) => handleMunicipalityChange(e.target.value)}
          variant={variant}
          endAdornment={
            municipalitiesLoading ? (
              <CircularProgress size={20} sx={{ mr: 2 }} />
            ) : null
          }
        >
          <MenuItem value="">
            <em>{selectedProvince ? 'Select Municipality' : 'Select Province First'}</em>
          </MenuItem>
          {sortedMunicipalities.map((municipality: Municipality) => (
            <MenuItem key={municipality.municipality_code} value={municipality.municipality_code}>
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Typography variant="body2">
                  {municipality.municipality_name} ({municipality.municipality_code})
                </Typography>
                {municipality.municipality_type === 'Metropolitan' && (
                  <Chip
                    label="Metro"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
        {municipalitiesError && selectedProvince && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
            Failed to load municipalities
          </Typography>
        )}
        {!selectedProvince && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Select a province to enable municipality selection
          </Typography>
        )}
      </FormControl>
    </Box>
  );
};

export default CascadingGeographicFilter;
