import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LocationOn as LocationIcon,
  Assessment as StatsIcon,
  Download as ExportIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geographicApi } from '../../services/api';
import GeographicSelector from '../../components/common/GeographicSelector';
import { VotingDistrict, VotingDistrictCreateRequest } from '../../types/votingDistricts';

const VotingDistrictsPage: React.FC = () => {
  const [selectedFilters, setSelectedFilters] = useState({
    province_code: '',
    district_code: '',
    municipal_code: '',
    ward_code: '',
    search: ''
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<VotingDistrict | null>(null);
  const [newDistrict, setNewDistrict] = useState<VotingDistrictCreateRequest>({
    voting_district_code: '',
    voting_district_name: '',
    voting_district_number: '',
    ward_code: '',
    latitude: undefined,
    longitude: undefined
  });

  const queryClient = useQueryClient();

  // Fetch voting districts
  const { data: votingDistricts, isLoading, error } = useQuery({
    queryKey: ['voting-districts', selectedFilters],
    queryFn: () => geographicApi.getVotingDistricts(selectedFilters),
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['voting-district-statistics'],
    queryFn: () => geographicApi.getVotingDistrictStatistics(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: VotingDistrictCreateRequest) => geographicApi.createVotingDistrict(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voting-districts'] });
      queryClient.invalidateQueries({ queryKey: ['voting-district-statistics'] });
      setCreateDialogOpen(false);
      resetNewDistrict();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) => 
      geographicApi.updateVotingDistrict(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voting-districts'] });
      setEditDialogOpen(false);
      setSelectedDistrict(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (code: string) => geographicApi.deleteVotingDistrict(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voting-districts'] });
      queryClient.invalidateQueries({ queryKey: ['voting-district-statistics'] });
    },
  });

  const resetNewDistrict = () => {
    setNewDistrict({
      voting_district_code: '',
      voting_district_name: '',
      voting_district_number: '',
      ward_code: '',
      latitude: undefined,
      longitude: undefined
    });
  };

  const handleCreateDistrict = () => {
    createMutation.mutate(newDistrict);
  };

  const handleUpdateDistrict = () => {
    if (selectedDistrict) {
      updateMutation.mutate({
        code: selectedDistrict.voting_district_code,
        data: {
          voting_district_name: selectedDistrict.voting_district_name,
          voting_district_number: selectedDistrict.voting_district_number,
          ward_code: selectedDistrict.ward_code,
          latitude: selectedDistrict.latitude,
          longitude: selectedDistrict.longitude,
          is_active: selectedDistrict.is_active
        }
      });
    }
  };

  const handleDeleteDistrict = (code: string) => {
    if (window.confirm('Are you sure you want to delete this voting district?')) {
      deleteMutation.mutate(code);
    }
  };

  const handleEditClick = (district: VotingDistrict) => {
    setSelectedDistrict(district);
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load voting districts. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Voting Districts Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<StatsIcon />}
            onClick={() => {/* Open statistics dialog */}}
          >
            Statistics
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => {/* Export functionality */}}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Voting District
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Voting Districts
                </Typography>
                <Typography variant="h4">
                  {statistics.data?.total_voting_districts || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Districts
                </Typography>
                <Typography variant="h4">
                  {statistics.data?.active_voting_districts || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  With Members
                </Typography>
                <Typography variant="h4">
                  {statistics.data?.member_distribution?.filter((d: any) => d.member_count > 0).length || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Members
                </Typography>
                <Typography variant="h4">
                  {statistics.data?.member_distribution?.reduce((sum: number, d: any) => sum + d.member_count, 0) || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filter Voting Districts
          </Typography>
          <GeographicSelector
            selectedProvince={selectedFilters.province_code}
            selectedDistrict={selectedFilters.district_code}
            selectedMunicipality={selectedFilters.municipal_code}
            selectedWard={selectedFilters.ward_code}
            onProvinceChange={(code) => setSelectedFilters(prev => ({ ...prev, province_code: code, district_code: '', municipal_code: '', ward_code: '' }))}
            onDistrictChange={(code) => setSelectedFilters(prev => ({ ...prev, district_code: code, municipal_code: '', ward_code: '' }))}
            onMunicipalityChange={(code) => setSelectedFilters(prev => ({ ...prev, municipal_code: code, ward_code: '' }))}
            onWardChange={(code) => setSelectedFilters(prev => ({ ...prev, ward_code: code }))}
            showVotingDistricts={false}
            size="small"
          />
          <Box mt={2}>
            <TextField
              fullWidth
              label="Search voting districts"
              value={selectedFilters.search}
              onChange={(e) => setSelectedFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by name, code, or number..."
            />
          </Box>
        </CardContent>
      </Card>

      {/* Voting Districts Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Voting Districts ({votingDistricts?.data?.length || 0})
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Number</TableCell>
                  <TableCell>Ward</TableCell>
                  <TableCell>Municipality</TableCell>
                  <TableCell>Province</TableCell>
                  <TableCell>Members</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {votingDistricts?.data?.map((district: VotingDistrict) => (
                  <TableRow key={district.voting_district_code}>
                    <TableCell>{district.voting_district_code}</TableCell>
                    <TableCell>{district.voting_district_name}</TableCell>
                    <TableCell>{district.voting_district_number}</TableCell>
                    <TableCell>{district.ward_name} ({district.ward_number})</TableCell>
                    <TableCell>{district.municipal_name}</TableCell>
                    <TableCell>{district.province_name}</TableCell>
                    <TableCell>{district.member_count || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={district.is_active ? 'Active' : 'Inactive'}
                        color={district.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleEditClick(district)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditClick(district)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteDistrict(district.voting_district_code)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                      {district.latitude && district.longitude && (
                        <Tooltip title="View on Map">
                          <IconButton size="small">
                            <LocationIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Voting District</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Voting District Code"
                value={newDistrict.voting_district_code}
                onChange={(e) => setNewDistrict(prev => ({ ...prev, voting_district_code: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Voting District Number"
                value={newDistrict.voting_district_number}
                onChange={(e) => setNewDistrict(prev => ({ ...prev, voting_district_number: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Voting District Name"
                value={newDistrict.voting_district_name}
                onChange={(e) => setNewDistrict(prev => ({ ...prev, voting_district_name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <GeographicSelector
                selectedProvince=""
                selectedDistrict=""
                selectedMunicipality=""
                selectedWard={newDistrict.ward_code}
                onProvinceChange={() => {}}
                onDistrictChange={() => {}}
                onMunicipalityChange={() => {}}
                onWardChange={(code) => setNewDistrict(prev => ({ ...prev, ward_code: code }))}
                showVotingDistricts={false}
                required={true}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Latitude"
                type="number"
                value={newDistrict.latitude || ''}
                onChange={(e) => setNewDistrict(prev => ({ ...prev, latitude: parseFloat(e.target.value) || undefined }))}
                inputProps={{ step: 'any' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Longitude"
                type="number"
                value={newDistrict.longitude || ''}
                onChange={(e) => setNewDistrict(prev => ({ ...prev, longitude: parseFloat(e.target.value) || undefined }))}
                inputProps={{ step: 'any' }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateDistrict} 
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Voting District</DialogTitle>
        <DialogContent>
          {selectedDistrict && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Voting District Code"
                  value={selectedDistrict.voting_district_code}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Voting District Number"
                  value={selectedDistrict.voting_district_number}
                  onChange={(e) => setSelectedDistrict(prev => prev ? ({ ...prev, voting_district_number: e.target.value }) : null)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Voting District Name"
                  value={selectedDistrict.voting_district_name}
                  onChange={(e) => setSelectedDistrict(prev => prev ? ({ ...prev, voting_district_name: e.target.value }) : null)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Latitude"
                  type="number"
                  value={selectedDistrict.latitude || ''}
                  onChange={(e) => setSelectedDistrict(prev => prev ? ({ ...prev, latitude: parseFloat(e.target.value) || undefined }) : null)}
                  inputProps={{ step: 'any' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Longitude"
                  type="number"
                  value={selectedDistrict.longitude || ''}
                  onChange={(e) => setSelectedDistrict(prev => prev ? ({ ...prev, longitude: parseFloat(e.target.value) || undefined }) : null)}
                  inputProps={{ step: 'any' }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedDistrict.is_active}
                    onChange={(e) => setSelectedDistrict(prev => prev ? ({ ...prev, is_active: e.target.value as boolean }) : null)}
                  >
                    <MenuItem value={true}>Active</MenuItem>
                    <MenuItem value={false}>Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateDistrict} 
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VotingDistrictsPage;
