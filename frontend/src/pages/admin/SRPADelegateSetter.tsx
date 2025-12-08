import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon, Info as InfoIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

// =====================================================
// Type Definitions
// =====================================================

interface Province {
  province_code: string;
  province_name: string;
}

interface SRPADelegateConfig {
  id: number;
  province_code: string;
  province_name: string;
  sub_region_code: string;
  sub_region_name: string;
  municipality_type: string;
  parent_municipality_code: string;
  parent_municipality_name: string;
  max_delegates: number;
  notes?: string;
  is_active: boolean;
  current_delegates_count: number;
}

// =====================================================
// API Functions
// =====================================================

const fetchProvinces = async (): Promise<Province[]> => {
  const response = await api.get('/geographic/provinces');
  // Handle both wrapped response format and direct array
  if (response.data?.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  console.error('Unexpected provinces response format:', response.data);
  return [];
};

const fetchConfigsByProvince = async (provinceCode: string): Promise<SRPADelegateConfig[]> => {
  const response = await api.get(`/srpa-delegate-config/province/${provinceCode}`);
  // Handle both wrapped response format and direct array
  if (response.data?.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  console.error('Unexpected configs response format:', response.data);
  return [];
};

const bulkUpdateConfigs = async (configs: { sub_region_code: string; max_delegates: number; notes?: string }[]) => {
  const response = await api.post('/srpa-delegate-config/bulk', { configs });
  return response.data;
};

// =====================================================
// Main Component
// =====================================================

const SRPADelegateSetter: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [configChanges, setConfigChanges] = useState<Map<string, { max_delegates: number; notes?: string }>>(new Map());
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch provinces
  const { data: provinces = [], isLoading: provincesLoading, error: provincesError } = useQuery({
    queryKey: ['provinces'],
    queryFn: fetchProvinces,
  });

  // Fetch configs for selected province
  const { data: configs = [], isLoading: configsLoading, error: configsError, refetch } = useQuery({
    queryKey: ['srpa-configs', selectedProvince],
    queryFn: () => fetchConfigsByProvince(selectedProvince),
    enabled: !!selectedProvince,
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdateConfigs,
    onSuccess: (data) => {
      setSaveSuccess(`Successfully updated ${data.data.success_count} configurations`);
      setSaveError(null);
      setConfigChanges(new Map());
      queryClient.invalidateQueries({ queryKey: ['srpa-configs', selectedProvince] });
      setTimeout(() => setSaveSuccess(null), 5000);
    },
    onError: (error: any) => {
      setSaveError(error.response?.data?.message || 'Failed to save configurations');
      setSaveSuccess(null);
    },
  });

  const handleProvinceChange = (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    setConfigChanges(new Map());
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleDelegateChange = (subRegionCode: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const newChanges = new Map(configChanges);
      const existingConfig = configs?.find(c => c.sub_region_code === subRegionCode);
      newChanges.set(subRegionCode, {
        max_delegates: numValue,
        notes: existingConfig?.notes,
      });
      setConfigChanges(newChanges);
    }
  };

  const handleSaveChanges = () => {
    if (configChanges.size === 0) {
      setSaveError('No changes to save');
      return;
    }

    const configsToUpdate = Array.from(configChanges.entries()).map(([sub_region_code, data]) => ({
      sub_region_code,
      ...data,
    }));

    bulkUpdateMutation.mutate(configsToUpdate);
  };

  const hasChanges = configChanges.size > 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        SRPA Delegate Setter
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure the maximum number of SRPA (Sub-Regional People's Assembly) delegates allowed for each municipality.
        This includes Local Municipalities and Metro Sub-Regions across all provinces.
      </Typography>

      {/* Province Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {provincesError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load provinces. Please refresh the page.
            </Alert>
          )}
          <FormControl fullWidth>
            <InputLabel>Select Province</InputLabel>
            <Select
              value={selectedProvince}
              onChange={(e) => handleProvinceChange(e.target.value)}
              label="Select Province"
              disabled={provincesLoading}
            >
              {provinces.map((province) => (
                <MenuItem key={province.province_code} value={province.province_code}>
                  {province.province_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveSuccess(null)}>
          {saveSuccess}
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {/* Sub-Regions Table */}
      {selectedProvince && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Sub-Regions in {provinces?.find(p => p.province_code === selectedProvince)?.province_name}
              </Typography>
              <Box>
                <Tooltip title="Refresh data">
                  <IconButton onClick={() => refetch()} disabled={configsLoading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || bulkUpdateMutation.isPending}
                  sx={{ ml: 1 }}
                >
                  {bulkUpdateMutation.isPending ? 'Saving...' : `Save Changes (${configChanges.size})`}
                </Button>
              </Box>
            </Box>

            {configsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load configurations. Please try again.
              </Alert>
            )}

            {configsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : configs.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Municipality</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell><strong>Parent Municipality</strong></TableCell>
                      <TableCell align="center"><strong>Current Delegates</strong></TableCell>
                      <TableCell align="center"><strong>Max Delegates</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configs.map((config) => {
                      const pendingChange = configChanges.get(config.sub_region_code);
                      const displayValue = pendingChange?.max_delegates ?? config.max_delegates;
                      const hasChange = pendingChange !== undefined;
                      const isOverLimit = config.current_delegates_count > displayValue;

                      return (
                        <TableRow key={config.sub_region_code} sx={{ backgroundColor: hasChange ? '#fff3e0' : 'inherit' }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {config.sub_region_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {config.sub_region_code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={config.municipality_type}
                              size="small"
                              color={config.municipality_type === 'Metro Sub-Region' ? 'primary' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {config.parent_municipality_name || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={config.current_delegates_count}
                              size="small"
                              color={isOverLimit ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              value={displayValue}
                              onChange={(e) => handleDelegateChange(config.sub_region_code, e.target.value)}
                              inputProps={{ min: 1, max: 100 }}
                              size="small"
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {hasChange && (
                              <Chip label="Modified" size="small" color="warning" />
                            )}
                            {isOverLimit && (
                              <Tooltip title="Current delegates exceed the limit">
                                <Chip label="Over Limit" size="small" color="error" icon={<InfoIcon />} />
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No sub-regions found for this province.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedProvince && (
        <Alert severity="info">
          Please select a province to view and configure SRPA delegate limits.
        </Alert>
      )}
    </Box>
  );
};

export default SRPADelegateSetter;

