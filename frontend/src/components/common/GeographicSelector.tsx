import React, { useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { geographicApi } from '../../services/api';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useMunicipalityContext } from '../../hooks/useMunicipalityContext';
import { LocationOn, Lock } from '@mui/icons-material';
// Define types locally to avoid import issues
interface Province {
  id: number;
  province_code: string;
  province_name: string;
  is_active: boolean;
}

interface District {
  id: number;
  district_code: string;
  district_name: string;
  province_code: string;
  is_active: boolean;
}

interface Municipality {
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  province_code: string;
  municipality_type: string;
}

interface Ward {
  ward_code: string;
  ward_name: string;
  ward_number: string;
  municipality_code: string;
  district_code: string;
  province_code: string;
}

interface VotingDistrict {
  id: number;
  voting_district_code: string;
  voting_district_name: string;
  voting_district_number: string;
  ward_code: string;
  is_active: boolean;
}

interface GeographicSelectorProps {
  selectedProvince?: string;
  selectedDistrict?: string;
  selectedMunicipality?: string;
  selectedWard?: string;
  selectedVotingDistrict?: string;
  onProvinceChange?: (provinceCode: string) => void;
  onDistrictChange?: (districtCode: string) => void;
  onMunicipalityChange?: (municipalCode: string) => void;
  onWardChange?: (wardCode: string) => void;
  onVotingDistrictChange?: (votingDistrictCode: string) => void;
  showVotingDistricts?: boolean;
  required?: boolean;
  votingDistrictRequired?: boolean; // New prop to control voting district requirement
  disabled?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
}

const GeographicSelector: React.FC<GeographicSelectorProps> = ({
  selectedProvince,
  selectedDistrict,
  selectedMunicipality,
  selectedWard,
  selectedVotingDistrict,
  onProvinceChange,
  onDistrictChange,
  onMunicipalityChange,
  onWardChange,
  onVotingDistrictChange,
  showVotingDistricts = true,
  required = false,
  votingDistrictRequired = false, // Default to false - voting district is optional
  disabled = false,
  size = 'medium',
  variant = 'outlined'
}) => {
  // Get province context for provincial admin restrictions
  const provinceContext = useProvinceContext();

  // Get municipality context for municipality admin restrictions
  const municipalityContext = useMunicipalityContext();

  // Auto-select province for provincial admins
  useEffect(() => {
    if (provinceContext.shouldRestrictToProvince &&
        provinceContext.assignedProvince &&
        !selectedProvince &&
        onProvinceChange) {
      onProvinceChange(provinceContext.assignedProvince.code);
    }
  }, [provinceContext, selectedProvince, onProvinceChange]);

  // Auto-select geographic fields for municipality admins
  useEffect(() => {
    if (municipalityContext.shouldRestrictToMunicipality) {
      // Auto-select province
      if (municipalityContext.assignedProvince && !selectedProvince && onProvinceChange) {
        onProvinceChange(municipalityContext.assignedProvince.code);
      }
      // Auto-select district
      if (municipalityContext.assignedDistrict && !selectedDistrict && onDistrictChange) {
        onDistrictChange(municipalityContext.assignedDistrict.code);
      }
      // Auto-select municipality
      if (municipalityContext.assignedMunicipality && !selectedMunicipality && onMunicipalityChange) {
        onMunicipalityChange(municipalityContext.assignedMunicipality.code);
      }
    }
  }, [municipalityContext, selectedProvince, selectedDistrict, selectedMunicipality, onProvinceChange, onDistrictChange, onMunicipalityChange]);

  // Fetch provinces
  const { data: provinces, isLoading: provincesLoading } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => geographicApi.getProvinces(),
  });

  // Fetch districts based on selected province
  const { data: districts, isLoading: districtsLoading, error: districtsError } = useQuery({
    queryKey: ['districts', selectedProvince],
    queryFn: () => geographicApi.getDistricts(selectedProvince),
    enabled: !!selectedProvince,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch municipalities based on selected district (corrected from province)
  const { data: municipalities, isLoading: municipalitiesLoading, error: municipalitiesError } = useQuery({
    queryKey: ['municipalities', selectedDistrict],
    queryFn: () => geographicApi.getMunicipalities(selectedDistrict),
    enabled: !!selectedDistrict,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch wards based on selected municipality
  const { data: wards, isLoading: wardsLoading, error: wardsError } = useQuery({
    queryKey: ['wards', selectedMunicipality],
    queryFn: () => geographicApi.getWards(selectedMunicipality),
    enabled: !!selectedMunicipality,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch voting districts based on selected ward
  const { data: votingDistricts, isLoading: votingDistrictsLoading, error: votingDistrictsError } = useQuery({
    queryKey: ['voting-districts', selectedWard],
    queryFn: () => {
      console.log('🗳️ Fetching voting districts for ward:', selectedWard);
      return geographicApi.getVotingDistrictsByWard(selectedWard!);
    },
    enabled: !!selectedWard && showVotingDistricts,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Debug logging
  console.log('GeographicSelector Debug:', {
    selectedWard,
    showVotingDistricts,
    votingDistrictsLoading,
    votingDistrictsCount: votingDistricts?.data?.length,
    votingDistrictsError
  });

  // Reset dependent selections when parent changes
  useEffect(() => {
    if (selectedProvince && onDistrictChange) {
      onDistrictChange('');
    }
    if (onMunicipalityChange) {
      onMunicipalityChange('');
    }
    if (onWardChange) {
      onWardChange('');
    }
    if (onVotingDistrictChange) {
      onVotingDistrictChange('');
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict && onMunicipalityChange) {
      onMunicipalityChange('');
    }
    if (onWardChange) {
      onWardChange('');
    }
    if (onVotingDistrictChange) {
      onVotingDistrictChange('');
    }
  }, [selectedDistrict]);

  useEffect(() => {
    if (selectedMunicipality && onWardChange) {
      onWardChange('');
    }
    if (onVotingDistrictChange) {
      onVotingDistrictChange('');
    }
  }, [selectedMunicipality]);

  // Clear voting district when ward changes (but only if we're changing to a different ward)
  useEffect(() => {
    if (onVotingDistrictChange) {
      onVotingDistrictChange('');
    }
  }, [selectedWard]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Geographic Location
      </Typography>
      
      <Grid container spacing={2}>
        {/* Province Selection */}
        <Grid item xs={12} md={6}>
          {(provinceContext.shouldRestrictToProvince && provinceContext.assignedProvince) ||
           (municipalityContext.shouldRestrictToMunicipality && municipalityContext.assignedProvince) ? (
            // Provincial Admin or Municipality Admin - Show locked province
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Province (Restricted)
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'grey.50',
                }}
              >
                <LocationOn color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {provinceContext.assignedProvince?.name || municipalityContext.assignedProvince?.name}
                </Typography>
                <Tooltip title={`Province selection is restricted for ${municipalityContext.shouldRestrictToMunicipality ? 'Municipality' : 'Provincial'} Admins`}>
                  <Lock color="action" fontSize="small" />
                </Tooltip>
              </Box>
            </Box>
          ) : (
            // National Admin - Show province selector
            <FormControl fullWidth variant={variant} size={size} required={required}>
              <InputLabel>Province *</InputLabel>
              <Select
                value={selectedProvince || ''}
                onChange={(e) => onProvinceChange?.(e.target.value)}
                disabled={disabled || provincesLoading}
                label="Province *"
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select a province...</em>
                </MenuItem>
                {provincesLoading ? (
                  <MenuItem disabled>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={16} />
                      <span>Loading provinces...</span>
                    </Box>
                  </MenuItem>
                ) : provinces?.data?.length === 0 ? (
                  <MenuItem disabled>
                    <em>No provinces available</em>
                  </MenuItem>
                ) : (
                  provinces?.data?.map((province: Province) => (
                    <MenuItem key={province.province_code} value={province.province_code}>
                      {province.province_name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}
        </Grid>

        {/* District Selection */}
        <Grid item xs={12} md={6}>
          {municipalityContext.shouldRestrictToMunicipality && municipalityContext.assignedDistrict ? (
            // Municipality Admin - Show locked district
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                District (Restricted)
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'grey.50',
                }}
              >
                <LocationOn color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {municipalityContext.assignedDistrict.name}
                </Typography>
                <Tooltip title="District selection is restricted for Municipality Admins">
                  <Lock color="action" fontSize="small" />
                </Tooltip>
              </Box>
            </Box>
          ) : (
            <FormControl fullWidth variant={variant} size={size} required={required}>
              <InputLabel>District *</InputLabel>
              <Select
                value={selectedDistrict || ''}
                onChange={(e) => onDistrictChange?.(e.target.value)}
                disabled={disabled || !selectedProvince || districtsLoading}
                label="District *"
                displayEmpty
              >
                <MenuItem value="">
                  <em>{!selectedProvince ? 'Select a province first...' : 'Select a district...'}</em>
                </MenuItem>
                {districtsLoading ? (
                  <MenuItem disabled>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={16} />
                      <span>Loading districts...</span>
                    </Box>
                  </MenuItem>
                ) : districtsError ? (
                  <MenuItem disabled>
                    <em>Error loading districts</em>
                  </MenuItem>
                ) : districts?.data?.length === 0 ? (
                  <MenuItem disabled>
                    <em>No districts available for this province</em>
                  </MenuItem>
                ) : (
                  districts?.data?.map((district: District) => (
                    <MenuItem key={district.district_code} value={district.district_code}>
                      {district.district_name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}
        </Grid>

        {/* Municipality Selection */}
        <Grid item xs={12} md={6}>
          {municipalityContext.shouldRestrictToMunicipality && municipalityContext.assignedMunicipality ? (
            // Municipality Admin - Show locked municipality
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Municipality (Restricted)
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'grey.50',
                }}
              >
                <LocationOn color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {municipalityContext.assignedMunicipality.name}
                </Typography>
                <Tooltip title="Municipality selection is restricted for Municipality Admins">
                  <Lock color="action" fontSize="small" />
                </Tooltip>
              </Box>
            </Box>
          ) : (
            <FormControl fullWidth variant={variant} size={size} required={required}>
              <InputLabel>Municipality *</InputLabel>
              <Select
                value={selectedMunicipality || ''}
                onChange={(e) => onMunicipalityChange?.(e.target.value)}
                disabled={disabled || !selectedDistrict || municipalitiesLoading}
                label="Municipality *"
                displayEmpty
              >
                <MenuItem value="">
                  <em>{!selectedDistrict ? 'Select a district first...' : 'Select a municipality...'}</em>
                </MenuItem>
                {municipalitiesLoading ? (
                  <MenuItem disabled>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={16} />
                      <span>Loading municipalities...</span>
                    </Box>
                  </MenuItem>
                ) : municipalitiesError ? (
                  <MenuItem disabled>
                    <em>Error loading municipalities</em>
                  </MenuItem>
                ) : municipalities?.data?.length === 0 ? (
                  <MenuItem disabled>
                    <em>No municipalities available for this district</em>
                  </MenuItem>
                ) : (
                  municipalities?.data?.map((municipality: Municipality) => (
                    <MenuItem key={municipality.municipality_code} value={municipality.municipality_code}>
                      {municipality.municipality_name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}
        </Grid>

        {/* Ward Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth variant={variant} size={size} required={required}>
            <InputLabel>Ward *</InputLabel>
            <Select
              value={selectedWard || ''}
              onChange={(e) => onWardChange?.(e.target.value)}
              disabled={disabled || !selectedMunicipality || wardsLoading}
              label="Ward *"
              displayEmpty
            >
              <MenuItem value="">
                <em>{!selectedMunicipality ? 'Select a municipality first...' : 'Select a ward...'}</em>
              </MenuItem>
              {wardsLoading ? (
                <MenuItem disabled>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={16} />
                    <span>Loading wards...</span>
                  </Box>
                </MenuItem>
              ) : wardsError ? (
                <MenuItem disabled>
                  <em>Error loading wards</em>
                </MenuItem>
              ) : wards?.data?.length === 0 ? (
                <MenuItem disabled>
                  <em>No wards available for this municipality</em>
                </MenuItem>
              ) : (
                wards?.data?.map((ward: Ward) => (
                  <MenuItem key={ward.ward_code} value={ward.ward_code}>
                    Ward {ward.ward_number} - {ward.ward_name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Voting District Selection */}
        {showVotingDistricts && (
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant={variant} size={size} required={votingDistrictRequired}>
              <InputLabel>Voting District{votingDistrictRequired ? ' *' : ''}</InputLabel>
              <Select
                value={selectedVotingDistrict || ''}
                onChange={(e) => onVotingDistrictChange?.(e.target.value)}
                disabled={disabled || !selectedWard || votingDistrictsLoading}
                label={`Voting District${votingDistrictRequired ? ' *' : ''}`}
                displayEmpty
              >
                <MenuItem value="">
                  <em>{!selectedWard ? 'Select a ward first...' : 'Select a voting district...'}</em>
                </MenuItem>
                {votingDistrictsLoading ? (
                  <MenuItem disabled>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={16} />
                      <span>Loading voting districts...</span>
                    </Box>
                  </MenuItem>
                ) : votingDistrictsError ? (
                  <MenuItem disabled>
                    <em>Error loading voting districts</em>
                  </MenuItem>
                ) : votingDistricts?.data?.length === 0 ? (
                  <MenuItem disabled>
                    <em>No voting districts available for this ward</em>
                  </MenuItem>
                ) : (
                  votingDistricts?.data?.map((votingDistrict: VotingDistrict) => (
                    <MenuItem key={votingDistrict.voting_district_code} value={votingDistrict.voting_district_code}>
                      VD {votingDistrict.voting_district_number} - {votingDistrict.voting_district_name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>

      {/* Hierarchy Display */}
      {selectedProvince && (
        <Box mt={3}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              <strong>Selected Location:</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {provinces?.data?.find((p: Province) => p.province_code === selectedProvince)?.province_name}
              {selectedDistrict && ` → ${districts?.data?.find((d: District) => d.district_code === selectedDistrict)?.district_name}`}
              {selectedMunicipality && ` → ${municipalities?.data?.find((m: Municipality) => m.municipality_code === selectedMunicipality)?.municipality_name}`}
              {selectedWard && ` → Ward ${wards?.data?.find((w: Ward) => w.ward_code === selectedWard)?.ward_number} (${wards?.data?.find((w: Ward) => w.ward_code === selectedWard)?.ward_name})`}
              {selectedVotingDistrict && ` → VD ${votingDistricts?.data?.find((vd: VotingDistrict) => vd.voting_district_code === selectedVotingDistrict)?.voting_district_number} (${votingDistricts?.data?.find((vd: VotingDistrict) => vd.voting_district_code === selectedVotingDistrict)?.voting_district_name})`}
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default GeographicSelector;
