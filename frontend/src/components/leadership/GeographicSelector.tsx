// GeographicSelector Component
// Hierarchical geographic filtering for leadership assignments

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Breadcrumbs,
  Link,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  LocationOn,
  NavigateNext,
  Public,
  AccountBalance,
  LocationCity,
  Home
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import * as LeadershipService from '../../services/leadershipApi';

const { LeadershipAPI } = LeadershipService;
type GeographicEntity = LeadershipService.GeographicEntity;

// =====================================================
// Interfaces
// =====================================================

export interface GeographicSelection {
  hierarchyLevel: 'National' | 'Province' | 'Municipality' | 'Ward';
  entityId: number;
  province?: GeographicEntity;
  municipality?: GeographicEntity;
  ward?: GeographicEntity;
}

interface GeographicSelectorProps {
  hierarchyLevel: 'National' | 'Province' | 'Municipality' | 'Ward';
  onSelectionChange: (selection: GeographicSelection | null) => void;
  disabled?: boolean;
}

// =====================================================
// GeographicSelector Component
// =====================================================

const GeographicSelector: React.FC<GeographicSelectorProps> = ({
  hierarchyLevel,
  onSelectionChange,
  disabled = false
}) => {
  // ==================== State Management ====================
  
  const [selectedProvince, setSelectedProvince] = useState<GeographicEntity | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<GeographicEntity | null>(null);
  const [selectedWard, setSelectedWard] = useState<GeographicEntity | null>(null);

  // ==================== API Queries ====================
  
  // Fetch provinces
  const { data: provinces = [], isLoading: provincesLoading, error: provincesError } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => LeadershipAPI.getProvinces(),
    enabled: hierarchyLevel !== 'National',
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // Fetch municipalities when province is selected
  const { data: municipalities = [], isLoading: municipalitiesLoading, error: municipalitiesError } = useQuery({
    queryKey: ['municipalities', selectedProvince?.province_code, hierarchyLevel],
    queryFn: () => LeadershipAPI.getMunicipalitiesByProvinceCode(selectedProvince!.province_code!),
    enabled: !!selectedProvince && (hierarchyLevel === 'Municipality' || hierarchyLevel === 'Ward'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // Fetch wards when municipality is selected
  const { data: wards = [], isLoading: wardsLoading, error: wardsError } = useQuery({
    queryKey: ['wards', selectedMunicipality?.municipality_code, hierarchyLevel],
    queryFn: () => LeadershipAPI.getWardsByMunicipalityCode(selectedMunicipality!.municipality_code!),
    enabled: !!selectedMunicipality && hierarchyLevel === 'Ward',
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // ==================== Event Handlers ====================
  
  const handleProvinceChange = useCallback((province: GeographicEntity | null) => {
    setSelectedProvince(province);
    setSelectedMunicipality(null);
    setSelectedWard(null);
    
    if (hierarchyLevel === 'Province' && province) {
      onSelectionChange({
        hierarchyLevel: 'Province',
        entityId: province.id,
        province
      });
    } else {
      onSelectionChange(null);
    }
  }, [hierarchyLevel, onSelectionChange]);

  const handleMunicipalityChange = useCallback((municipality: GeographicEntity | null) => {
    setSelectedMunicipality(municipality);
    setSelectedWard(null);
    
    if (hierarchyLevel === 'Municipality' && municipality && selectedProvince) {
      onSelectionChange({
        hierarchyLevel: 'Municipality',
        entityId: municipality.id,
        province: selectedProvince,
        municipality
      });
    } else {
      onSelectionChange(null);
    }
  }, [hierarchyLevel, onSelectionChange, selectedProvince]);

  const handleWardChange = useCallback((ward: GeographicEntity | null) => {
    setSelectedWard(ward);
    
    if (hierarchyLevel === 'Ward' && ward && selectedProvince && selectedMunicipality) {
      onSelectionChange({
        hierarchyLevel: 'Ward',
        entityId: ward.id,
        province: selectedProvince,
        municipality: selectedMunicipality,
        ward
      });
    } else {
      onSelectionChange(null);
    }
  }, [hierarchyLevel, onSelectionChange, selectedProvince, selectedMunicipality]);

  // ==================== Effects ====================
  
  // Handle National level
  useEffect(() => {
    if (hierarchyLevel === 'National') {
      onSelectionChange({
        hierarchyLevel: 'National',
        entityId: 1 // Default national entity ID
      });
    }
  }, [hierarchyLevel, onSelectionChange]);

  // Reset selections when hierarchy level changes
  useEffect(() => {
    setSelectedProvince(null);
    setSelectedMunicipality(null);
    setSelectedWard(null);
    onSelectionChange(null);
  }, [hierarchyLevel, onSelectionChange]);

  // ==================== Helper Functions ====================
  
  const getHierarchyIcon = (level: string) => {
    switch (level) {
      case 'National': return <Public />;
      case 'Province': return <AccountBalance />;
      case 'Municipality': return <LocationCity />;
      case 'Ward': return <Home />;
      default: return <LocationOn />;
    }
  };

  const getHierarchyColor = (level: string) => {
    switch (level) {
      case 'National': return 'primary';
      case 'Province': return 'secondary';
      case 'Municipality': return 'success';
      case 'Ward': return 'warning';
      default: return 'default';
    }
  };

  // ==================== Render ====================
  
  if (hierarchyLevel === 'National') {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1}>
            {getHierarchyIcon('National')}
            <Typography variant="h6">National Leadership</Typography>
            <Chip 
              label="All Provinces" 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Managing leadership positions at the national level across all provinces.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <LocationOn color="primary" />
          <Typography variant="h6">Geographic Selection</Typography>
          <Chip 
            label={hierarchyLevel} 
            size="small" 
            color={getHierarchyColor(hierarchyLevel) as any}
          />
        </Box>

        {/* Breadcrumb Navigation */}
        {(selectedProvince || selectedMunicipality || selectedWard) && (
          <Breadcrumbs 
            separator={<NavigateNext fontSize="small" />} 
            sx={{ mb: 2 }}
          >
            {selectedProvince && (
              <Link 
                component="button" 
                variant="body2" 
                onClick={() => handleProvinceChange(selectedProvince)}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                {getHierarchyIcon('Province')}
                {selectedProvince.province_name}
              </Link>
            )}
            {selectedMunicipality && (
              <Link
                component="button"
                variant="body2"
                onClick={() => handleMunicipalityChange(selectedMunicipality)}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                {getHierarchyIcon('Sub-Region')}
                {selectedMunicipality.municipality_name}
              </Link>
            )}
            {selectedWard && (
              <Typography 
                variant="body2" 
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                {getHierarchyIcon('Ward')}
                {selectedWard.ward_name}
              </Typography>
            )}
          </Breadcrumbs>
        )}

        {/* Error Display */}
        {(provincesError || municipalitiesError || wardsError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load geographic data. Please try again.
          </Alert>
        )}

        {/* Province Selector */}
        <FormControl fullWidth sx={{ mb: 2 }} disabled={disabled || provincesLoading}>
          <InputLabel>Select Province</InputLabel>
          <Select
            MenuProps={{ keepMounted: true, disableAutoFocusItem: true }}
            value={selectedProvince?.id || ''}
            onChange={(e) => {
              const raw = (e.target as any).value;
              if (raw === '' || raw === undefined || raw === null) {
                handleProvinceChange(null);
                return;
              }
              const id = typeof raw === 'number' ? raw : Number(raw);
              const province = provinces.find(p => p.id === id) || null;
              handleProvinceChange(province);
            }}
            label="Select Province"
          >
            <MenuItem value="">
              <em>Choose a province...</em>
            </MenuItem>
            {provinces.map((province) => (
              <MenuItem key={province.id} value={province.id}>
                <Box display="flex" justifyContent="space-between" width="100%">
                  <span>{province.province_name}</span>
                  <Box display="flex" gap={1}>
                    <Chip 
                      label={`${province.member_count} members`} 
                      size="small" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`${province.leadership_appointments} leaders`} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Municipality Selector */}
        {(hierarchyLevel === 'Municipality' || hierarchyLevel === 'Ward') && selectedProvince && (
          <FormControl fullWidth sx={{ mb: 2 }} disabled={disabled || municipalitiesLoading}>
            <InputLabel>Select Municipality</InputLabel>
            <Select
              MenuProps={{ keepMounted: true, disableAutoFocusItem: true }}
              value={selectedMunicipality?.id ?? selectedMunicipality?.municipality_code ?? ''}
              onChange={(e) => {
                const raw = (e.target as any).value;
                if (raw === '' || raw === undefined || raw === null) {
                  handleMunicipalityChange(null);
                  return;
                }
                let municipality: any = null;
                if (typeof raw === 'number') {
                  municipality = municipalities.find(m => m.id === raw) || null;
                } else {
                  municipality = municipalities.find(m => m.municipality_code === raw) || null;
                }
                handleMunicipalityChange(municipality);
              }}
              label="Select Municipality"
            >
              <MenuItem value="">
                <em>Choose a municipality...</em>
              </MenuItem>
              {municipalities.map((municipality) => (
                <MenuItem key={municipality.id ?? municipality.municipality_code ?? municipality.municipality_name}
                          value={municipality.id ?? municipality.municipality_code}>
                  {municipality.municipality_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Ward Selector */}
        {hierarchyLevel === 'Ward' && selectedMunicipality && (
          <FormControl fullWidth sx={{ mb: 2 }} disabled={disabled || wardsLoading}>
            <InputLabel>Select Ward</InputLabel>
            <Select
              MenuProps={{ keepMounted: true, disableAutoFocusItem: true }}
              value={selectedWard?.id || ''}
              onChange={(e) => {
                const raw = (e.target as any).value;
                if (raw === '' || raw === undefined || raw === null) {
                  handleWardChange(null);
                  return;
                }
                const id = typeof raw === 'number' ? raw : Number(raw);
                const ward = wards.find(w => w.id === id) || null;
                handleWardChange(ward);
              }}
              label="Select Ward"
            >
              <MenuItem value="">
                <em>Choose a ward...</em>
              </MenuItem>
              {wards.map((ward) => (
                <MenuItem key={ward.id ?? ward.ward_code ?? `${ward.municipality_code}-${ward.ward_number}`}
                          value={ward.id ?? ward.ward_code}>
                  {ward.ward_name} (Ward {ward.ward_number})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Selection Status */}
        <Typography variant="body2" color="text.secondary">
          {!selectedProvince && 'Please select a province to continue.'}
          {selectedProvince && !selectedMunicipality && (hierarchyLevel === 'Municipality' || hierarchyLevel === 'Ward') && 'Please select a municipality to continue.'}
          {selectedMunicipality && !selectedWard && hierarchyLevel === 'Ward' && 'Please select a ward to continue.'}
          {((hierarchyLevel === 'Province' && selectedProvince) ||
            (hierarchyLevel === 'Municipality' && selectedMunicipality) ||
            (hierarchyLevel === 'Ward' && selectedWard)) &&
            'Geographic selection complete. You can now view and assign leadership positions.'}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default GeographicSelector;
