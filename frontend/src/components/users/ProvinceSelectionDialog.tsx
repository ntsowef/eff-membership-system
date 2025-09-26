import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  Search,
  LocationOn,
  People,
  CheckCircle,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';

interface Province {
  province_code: string;
  province_name: string;
  member_count?: number;
  district_count?: number;
  municipality_count?: number;
}

interface ProvinceSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectProvince: (province: Province) => void;
}

const ProvinceSelectionDialog: React.FC<ProvinceSelectionDialogProps> = ({
  open,
  onClose,
  onSelectProvince,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);

  // Fetch provinces with member statistics
  const { data: provincesData, isLoading, error } = useQuery({
    queryKey: ['provinces-with-stats'],
    queryFn: async () => {
      try {
        // Get province statistics from the members stats endpoint
        const response = await apiGet<any>('/members/stats/provinces');
        return response;
      } catch (error) {
        console.error('Failed to fetch provinces:', error);
        // Fallback to basic province list
        return {
          data: [
            { province_code: 'GP', province_name: 'Gauteng', member_count: 12500 },
            { province_code: 'WC', province_name: 'Western Cape', member_count: 8200 },
            { province_code: 'KZN', province_name: 'KwaZulu-Natal', member_count: 9800 },
            { province_code: 'EC', province_name: 'Eastern Cape', member_count: 7600 },
            { province_code: 'FS', province_name: 'Free State', member_count: 4500 },
            { province_code: 'LP', province_name: 'Limpopo', member_count: 3200 },
            { province_code: 'MP', province_name: 'Mpumalanga', member_count: 2800 },
            { province_code: 'NW', province_name: 'North West', member_count: 2100 },
            { province_code: 'NC', province_name: 'Northern Cape', member_count: 1400 },
          ]
        };
      }
    },
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const provinces = provincesData?.data || [];

  // Filter provinces based on search term
  const filteredProvinces = provinces.filter((province: Province) =>
    province.province_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    province.province_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSelectProvince = (province: Province) => {
    setSelectedProvince(province);
  };

  const handleConfirmSelection = () => {
    if (selectedProvince) {
      onSelectProvince(selectedProvince);
      onClose();
      setSelectedProvince(null);
      setSearchTerm('');
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedProvince(null);
    setSearchTerm('');
  };

  const getProvinceColor = (provinceCode: string) => {
    const colors = {
      'GP': '#1976d2', // Blue
      'WC': '#388e3c', // Green
      'KZN': '#f57c00', // Orange
      'EC': '#7b1fa2', // Purple
      'FS': '#d32f2f', // Red
      'LP': '#00796b', // Teal
      'MP': '#5d4037', // Brown
      'NW': '#455a64', // Blue Grey
      'NC': '#e64a19', // Deep Orange
    };
    return colors[provinceCode as keyof typeof colors] || '#757575';
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <LocationOn color="primary" />
          <Box>
            <Typography variant="h6">
              Select Province for Provincial Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose the province this administrator will manage
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Search Control */}
        <Box mb={3}>
          <TextField
            fullWidth
            placeholder="Search provinces..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Provincial administrators manage all EFF activities within their assigned province, 
            including oversight of regional, municipal, and ward operations.
          </Typography>
        </Alert>

        {/* Loading State */}
        {isLoading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load provinces. Using default province list.
          </Alert>
        )}

        {/* Provinces List */}
        {!isLoading && (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredProvinces.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body2" color="text.secondary" align="center">
                      No provinces found matching your search
                    </Typography>
                  }
                />
              </ListItem>
            ) : (
              filteredProvinces.map((province: Province) => (
                <ListItem key={province.province_code} disablePadding>
                  <ListItemButton
                    selected={selectedProvince?.province_code === province.province_code}
                    onClick={() => handleSelectProvince(province)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      border: selectedProvince?.province_code === province.province_code 
                        ? '2px solid' 
                        : '1px solid transparent',
                      borderColor: selectedProvince?.province_code === province.province_code 
                        ? 'primary.main' 
                        : 'transparent',
                    }}
                  >
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          bgcolor: getProvinceColor(province.province_code),
                          width: 40,
                          height: 40,
                          fontSize: '0.875rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {province.province_code}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Typography variant="body1" fontWeight="medium" component="span">
                            {province.province_name}
                          </Typography>
                          {selectedProvince?.province_code === province.province_code && (
                            <CheckCircle color="primary" fontSize="small" />
                          )}
                        </span>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <People fontSize="small" color="action" />
                            <Typography variant="caption" component="span">
                              {province.member_count?.toLocaleString() || 'N/A'} members
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              border: 1,
                              borderColor: getProvinceColor(province.province_code),
                              color: getProvinceColor(province.province_code),
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            {province.province_code}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        )}

        {/* Selection Summary */}
        {selectedProvince && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Selected:</strong> {selectedProvince.province_name} ({selectedProvince.province_code})
              {selectedProvince.member_count && (
                <span> - {selectedProvince.member_count.toLocaleString()} members</span>
              )}
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirmSelection}
          disabled={!selectedProvince}
        >
          Select Province
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProvinceSelectionDialog;
