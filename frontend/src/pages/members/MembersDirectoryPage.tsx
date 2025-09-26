import React, { useState } from 'react';
import {
  Box,
  Typography,
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
  Avatar,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,



} from '@mui/material';
import { Autocomplete, ToggleButton, ToggleButtonGroup } from '@mui/material';

import {
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Download as ExportIcon,
  FilterList as FilterIcon,
  Map as MapIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { viewsApi, geographicApi, searchApi } from '../../services/api';
import GeographicSelector from '../../components/common/GeographicSelector';
import type { Member } from '../../types/member';
import { useProvinceContext, useProvincePageTitle } from '../../hooks/useProvinceContext';
import ProvinceContextBanner from '../../components/common/ProvinceContextBanner';
import { useEffect } from 'react';

const MembersDirectoryPage: React.FC = () => {
  // Get province context for provincial admin restrictions
  const provinceContext = useProvinceContext();
  const pageTitle = useProvincePageTitle('Members Directory');

  const [filters, setFilters] = useState({
    province_code: '',
    district_code: '',
    municipal_code: '',
    ward_code: '',
    voting_district_code: '',
    voting_station_id: '',
    search: '',
    gender_id: '',
    age_group: '',
    has_voting_district: ''
  });
  const [searchType, setSearchType] = useState<'voting_district' | 'voting_station' | 'ward'>('voting_district');
  const [searchInput, setSearchInput] = useState('');
  const [selectedSearch, setSelectedSearch] = useState<any>(null);

  // Auto-select province for provincial admins
  useEffect(() => {
    if (provinceContext.shouldRestrictToProvince &&
        provinceContext.assignedProvince &&
        !filters.province_code) {
      setFilters(prev => ({
        ...prev,
        province_code: provinceContext.assignedProvince!.code
      }));
    }
  }, [provinceContext, filters.province_code]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['geo-search-suggestions', searchType, searchInput],
    queryFn: async () => {
      const q = searchInput.trim();
      if (q.length < 2) return [] as any[];
      if (searchType === 'voting_district') {
        const res = await geographicApi.getVotingDistricts({ search: q, limit: 20 });
        const list = (res?.data ?? res ?? []) as any[];
        return list.map((vd: any) => ({
          id: vd.vd_code || vd.voting_district_code,
          label: `VD ${vd.voting_district_number} - ${vd.vd_name || vd.voting_district_name}`,
          raw: vd,
          type: 'voting_district',
        }));
      }
      if (searchType === 'voting_station') {
        const res = await searchApi.lookup('voting_stations', { search: q, limit: 20 });
        const list = (res?.data?.results ?? []) as any[];
        return list.map((vs: any) => ({
          id: vs.id,
          label: `${vs.name}${vs.station_code ? ` (${vs.station_code})` : ''}`,
          raw: vs,
          type: 'voting_station',
        }));
      }
      const res = await searchApi.lookup('wards', { search: q, limit: 20 });
      const list = (res?.data?.results ?? []) as any[];
      return list.map((w: any) => ({ id: w.id, label: w.name, raw: w, type: 'ward' }));
    },
  });

  const applyGeoSearch = (option: any) => {
    if (!option) return;
    setFilters(prev => ({
      ...prev,
      ward_code: '',
      voting_district_code: '',
      voting_station_id: '',
    }));
    if (option.type === 'voting_district') {
      setFilters(prev => ({ ...prev, voting_district_code: option.id }));
    } else if (option.type === 'voting_station') {
      setFilters(prev => ({ ...prev, voting_station_id: option.id }));
    } else if (option.type === 'ward') {
      setFilters(prev => ({ ...prev, ward_code: option.id }));
    }
  };

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Fetch members with voting district information
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['members-with-voting-districts', filters],
    queryFn: () => viewsApi.getMembersWithVotingDistricts(filters),
  });

  // Fetch voting district summary
  const { data: summaryData } = useQuery({
    queryKey: ['voting-district-summary'],
    queryFn: () => viewsApi.getVotingDistrictSummary(),
  });

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = () => {
    // Export functionality
    console.log('Exporting members with voting districts...');
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
        Failed to load members directory. Please try again.
      </Alert>
    );
  }

  const members = membersData?.data?.members || [];
  const summary = summaryData?.data?.summary || [];

  return (
    <Box>
      {/* Province Context Banner for Provincial Admins */}
      <ProvinceContextBanner variant="banner" sx={{ mb: 3 }} />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {pageTitle}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<MapIcon />}
            onClick={() => {/* Open map view */}}
          >
            Map View
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Summary Statistics */}
      <Grid container spacing={3} mb={3}>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Members
              </Typography>
              <Typography variant="h4">
                {members.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                With Voting Districts
              </Typography>
              <Typography variant="h4">
                {members.filter((m: any) => m.has_voting_district === 'Yes').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Registered Voters
              </Typography>
              <Typography variant="h4">
                {members.filter((m: any) => m.voter_registration_status === 'Registered').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Voting Districts
              </Typography>
              <Typography variant="h4">
                {summary.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <FilterIcon />
            Filter Members
          </Typography>

          <GeographicSelector
            selectedProvince={filters.province_code}
            selectedDistrict={filters.district_code}
            selectedMunicipality={filters.municipal_code}
            selectedWard={filters.ward_code}
            selectedVotingDistrict={filters.voting_district_code}
            onProvinceChange={(code) => handleFilterChange('province_code', code)}
            onDistrictChange={(code) => handleFilterChange('district_code', code)}
            onMunicipalityChange={(code) => handleFilterChange('municipal_code', code)}
            onWardChange={(code) => handleFilterChange('ward_code', code)}
            onVotingDistrictChange={(code) => handleFilterChange('voting_district_code', code)}
            showVotingDistricts={true}
            size="small"
          />

          {/* Direct Geographic Search */}
          <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
            <ToggleButtonGroup
              size="small"
              color="primary"
              exclusive
              value={searchType}
              onChange={(_, v) => v && setSearchType(v)}
            >
              <ToggleButton value="voting_district">Voting District</ToggleButton>
              <ToggleButton value="voting_station">Voting Station</ToggleButton>
              <ToggleButton value="ward">Ward</ToggleButton>
            </ToggleButtonGroup>
            <Autocomplete
              options={suggestions as any[]}
              filterOptions={(x) => x}
              getOptionLabel={(opt: any) => opt?.label || ''}
              onInputChange={(_, val) => setSearchInput(val)}
              inputValue={searchInput}
              onChange={(_, val) => {
                setSelectedSearch(val);
                applyGeoSearch(val);
              }}
              sx={{ flex: 1, minWidth: 280 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={`Search ${searchType.replace('_', ' ')}`}
                  placeholder="Type at least 2 characters..."
                />
              )}
            />
          </Box>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search members"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Name, ID, email..."
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select
                  value={filters.gender_id}
                  onChange={(e) => handleFilterChange('gender_id', e.target.value)}
                  label="Gender"


                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="1">Male</MenuItem>
                  <MenuItem value="2">Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Age Group</InputLabel>
                <Select
                  value={filters.age_group}
                  onChange={(e) => handleFilterChange('age_group', e.target.value)}
                  label="Age Group"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="18-25">18-25</MenuItem>
                  <MenuItem value="26-35">26-35</MenuItem>
                  <MenuItem value="36-45">36-45</MenuItem>
                  <MenuItem value="46-55">46-55</MenuItem>
                  <MenuItem value="56-65">56-65</MenuItem>
                  <MenuItem value="65+">65+</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Voting District</InputLabel>
                <Select
                  value={filters.has_voting_district}
                  onChange={(e) => handleFilterChange('has_voting_district', e.target.value)}
                  label="Voting District"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Yes">Has Voting District</MenuItem>
                  <MenuItem value="No">No Voting District</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Members ({members.length})
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
            </Box>
          </Box>

          {viewMode === 'table' ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>ID Number</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Geographic Location</TableCell>
                    <TableCell>Voting District</TableCell>
                    <TableCell>Age Group</TableCell>
                    <TableCell>Voter Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member: any) => (
                    <TableRow key={member.member_id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {member.full_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {member.member_id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{member.id_number}</TableCell>
                      <TableCell>
                        <Box>
                          {member.email && (
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <EmailIcon fontSize="small" />
                              <Typography variant="caption">{member.email}</Typography>
                            </Box>
                          )}
                          {member.cell_number && (
                            <Box display="flex" alignItems="center" gap={1}>
                              <PhoneIcon fontSize="small" />
                              <Typography variant="caption">{member.cell_number}</Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">
                          {member.province_name}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {member.municipal_name}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Ward {member.ward_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {member.voting_district_name ? (
                          <Box>
                            <Chip
                              label={`VD ${member.voting_district_number}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {member.voting_district_name}
                            </Typography>
                          </Box>
                        ) : (
                          <Chip
                            label="Not Assigned"
                            size="small"
                            color="default"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.age_group}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.voter_registration_status}
                          size="small"
                          color={member.voter_registration_status === 'Registered' ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Grid container spacing={2}>
              {members.map((member: any) => (
                <Grid item xs={12} sm={6} md={4} key={member.member_id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {member.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.id_number}
                          </Typography>
                        </Box>
                      </Box>

                      <Box mb={2}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Location:
                        </Typography>
                        <Typography variant="body2">
                          {member.full_geographic_hierarchy}
                        </Typography>
                      </Box>

                      {member.voting_district_name && (
                        <Box mb={2}>
                          <Chip
                            label={`VD ${member.voting_district_number}: ${member.voting_district_name}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<LocationIcon />}
                          />
                        </Box>
                      )}

                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip
                          label={member.age_group}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={member.voter_registration_status}
                          size="small"
                          color={member.voter_registration_status === 'Registered' ? 'success' : 'default'}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MembersDirectoryPage;
