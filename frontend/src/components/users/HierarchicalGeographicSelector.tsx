import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { geographicApi } from '../../services/api';

interface Province {
  province_code: string;
  province_name: string;
}

interface Municipality {
  municipality_code: string;
  municipality_name: string;
  province_code: string;
}

interface Ward {
  ward_code: string;
  ward_name: string;
  municipality_code: string;
}

interface HierarchicalGeographicSelectorProps {
  adminLevel: 'Municipal' | 'Ward';
  onSelectionChange: (selection: {
    province?: Province;
    municipality?: Municipality;
    ward?: Ward;
  }) => void;
  disabled?: boolean;
}

const HierarchicalGeographicSelector: React.FC<HierarchicalGeographicSelectorProps> = ({
  adminLevel,
  onSelectionChange,
  disabled = false
}) => {
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  // Fetch provinces
  const { data: provincesData, isLoading: provincesLoading, error: provincesError } = useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const result = await geographicApi.getProvinces();
      console.log('Provinces API response:', result);
      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch municipalities when province is selected
  const { data: municipalitiesData, isLoading: municipalitiesLoading } = useQuery({
    queryKey: ['municipalities', selectedProvince?.province_code],
    queryFn: async () => {
      const result = await geographicApi.getMunicipalities(selectedProvince!.province_code);
      console.log('Municipalities API response:', result);
      return result;
    },
    enabled: !!selectedProvince,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch wards when municipality is selected (only for Ward admin level)
  const { data: wardsData, isLoading: wardsLoading } = useQuery({
    queryKey: ['wards', selectedMunicipality?.municipality_code],
    queryFn: async () => {
      const result = await geographicApi.getWards(selectedMunicipality!.municipality_code);
      console.log('Wards API response:', result);
      return result;
    },
    enabled: !!selectedMunicipality && adminLevel === 'Ward',
    staleTime: 10 * 60 * 1000,
  });

  // Extract data from API response (handle both direct array and wrapped response)
  const provinces = useMemo(() => {
    if (!provincesData) return [];

    // Handle wrapped response format: { success: true, data: [...] }
    if (provincesData.data && Array.isArray(provincesData.data)) {
      return provincesData.data;
    }

    // Handle direct array response
    if (Array.isArray(provincesData)) {
      return provincesData;
    }

    console.warn('Unexpected provinces response format:', provincesData);
    return [];
  }, [provincesData]);

  const municipalities = useMemo(() => {
    if (!municipalitiesData) return [];

    // Handle wrapped response format: { success: true, data: [...] }
    if (municipalitiesData.data && Array.isArray(municipalitiesData.data)) {
      return municipalitiesData.data;
    }

    // Handle direct array response
    if (Array.isArray(municipalitiesData)) {
      return municipalitiesData;
    }

    console.warn('Unexpected municipalities response format:', municipalitiesData);
    return [];
  }, [municipalitiesData]);

  const wards = useMemo(() => {
    if (!wardsData) return [];

    // Handle wrapped response format: { success: true, data: [...] }
    if (wardsData.data && Array.isArray(wardsData.data)) {
      return wardsData.data;
    }

    // Handle direct array response
    if (Array.isArray(wardsData)) {
      return wardsData;
    }

    console.warn('Unexpected wards response format:', wardsData);
    return [];
  }, [wardsData]);

  // Handle province selection
  const handleProvinceChange = (provinceCode: string) => {
    const province = provinces.find(p => p.province_code === provinceCode) || null;
    setSelectedProvince(province);
    setSelectedMunicipality(null);
    setSelectedWard(null);
  };

  // Handle municipality selection
  const handleMunicipalityChange = (municipalityCode: string) => {
    const municipality = municipalities.find(m => m.municipality_code === municipalityCode) || null;
    setSelectedMunicipality(municipality);
    setSelectedWard(null);
  };

  // Handle ward selection
  const handleWardChange = (wardCode: string) => {
    const ward = wards.find(w => w.ward_code === wardCode) || null;
    setSelectedWard(ward);
  };

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange({
      province: selectedProvince || undefined,
      municipality: selectedMunicipality || undefined,
      ward: selectedWard || undefined,
    });
  }, [selectedProvince, selectedMunicipality, selectedWard, onSelectionChange]);

  if (provincesError) {
    return (
      <Alert severity="error">
        Failed to load provinces. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Geographic Selection
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {adminLevel === 'Municipal' 
          ? 'Select the province and municipality for this Municipal Administrator.'
          : 'Select the province, municipality, and ward for this Ward Administrator.'
        }
      </Typography>

      <Stack spacing={3}>
        {/* Province Selection */}
        <FormControl fullWidth disabled={disabled}>
          <InputLabel>Province *</InputLabel>
          <Select
            value={selectedProvince?.province_code || ''}
            onChange={(e) => handleProvinceChange(e.target.value)}
            label="Province *"
          >
            <MenuItem value="">
              <em>Select Province</em>
            </MenuItem>
            {provincesLoading ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Loading provinces...
              </MenuItem>
            ) : (
              provinces.map((province) => (
                <MenuItem key={province.province_code} value={province.province_code}>
                  {province.province_name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {/* Municipality Selection */}
        <FormControl fullWidth disabled={disabled || !selectedProvince}>
          <InputLabel>Municipality *</InputLabel>
          <Select
            value={selectedMunicipality?.municipality_code || ''}
            onChange={(e) => handleMunicipalityChange(e.target.value)}
            label="Municipality *"
          >
            <MenuItem value="">
              <em>Select Municipality</em>
            </MenuItem>
            {municipalitiesLoading ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Loading municipalities...
              </MenuItem>
            ) : (
              municipalities.map((municipality) => (
                <MenuItem key={municipality.municipality_code} value={municipality.municipality_code}>
                  {municipality.municipality_name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {/* Ward Selection (only for Ward admin level) */}
        {adminLevel === 'Ward' && (
          <FormControl fullWidth disabled={disabled || !selectedMunicipality}>
            <InputLabel>Ward *</InputLabel>
            <Select
              value={selectedWard?.ward_code || ''}
              onChange={(e) => handleWardChange(e.target.value)}
              label="Ward *"
            >
              <MenuItem value="">
                <em>Select Ward</em>
              </MenuItem>
              {wardsLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading wards...
                </MenuItem>
              ) : (
                wards.map((ward) => (
                  <MenuItem key={ward.ward_code} value={ward.ward_code}>
                    {ward.ward_name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        )}

        {/* Selection Summary */}
        {(selectedProvince || selectedMunicipality || selectedWard) && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Selected Geographic Area:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {selectedProvince && (
                  <Chip 
                    label={`Province: ${selectedProvince.province_name}`} 
                    color="primary" 
                    size="small" 
                  />
                )}
                {selectedMunicipality && (
                  <Chip 
                    label={`Municipality: ${selectedMunicipality.municipality_name}`} 
                    color="secondary" 
                    size="small" 
                  />
                )}
                {selectedWard && (
                  <Chip 
                    label={`Ward: ${selectedWard.ward_name}`} 
                    color="success" 
                    size="small" 
                  />
                )}
              </Stack>
            </Box>
          </>
        )}
      </Stack>
    </Box>
  );
};

export default HierarchicalGeographicSelector;
