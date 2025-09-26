import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Button,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  HowToReg as VotingDistrictIcon,
  Place as VotingStationIcon,
  Map as WardIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { viewsApi, searchApi } from '../../services/api';
import type { Member } from '../../types/member';

const GeographicSearchPage = () => {
  const [searchType, setSearchType] = useState<'voting_districts' | 'voting_stations' | 'wards'>('voting_districts');
  const [searchInput, setSearchInput] = useState('');
  const [selectedSearch, setSelectedSearch] = useState<any>(null);
  const [filters, setFilters] = useState({
    voting_district_code: '',
    voting_station_id: '',
    ward_code: '',
  });

  // Get search suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['geo-search-suggestions', searchType, searchInput],
    queryFn: () => searchApi.lookup(searchType, { search: searchInput, limit: 10 }),
    enabled: searchInput.length >= 2,
    select: (data) => {
      const results = data?.data?.results || [];
      return results.map((item: any) => ({
        ...item,
        label: searchType === 'voting_districts'
          ? `${item.name} (${item.voting_district_number})`
          : searchType === 'voting_stations'
          ? `${item.name} (${item.station_code})`
          : `${item.name} (${item.ward_number})`,
      }));
    },
  });

  // Fetch members based on filters
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['members-geographic-search', filters],
    queryFn: () => viewsApi.getMembersWithVotingDistricts({ 
      ...filters,
      limit: 100 
    }),
    enabled: !!(filters.voting_district_code || filters.voting_station_id || filters.ward_code),
  });

  const members = membersData?.data?.members || [];

  const applyGeoSearch = (selection: any) => {
    if (!selection) return;

    const newFilters = {
      voting_district_code: '',
      voting_station_id: '',
      ward_code: '',
    };

    if (searchType === 'voting_districts') {
      newFilters.voting_district_code = selection.vd_code || selection.id;
    } else if (searchType === 'voting_stations') {
      newFilters.voting_station_id = selection.voting_station_id || selection.id;
    } else if (searchType === 'wards') {
      newFilters.ward_code = selection.ward_code || selection.id;
    }

    setFilters(newFilters);
  };

  const handleClear = () => {
    setSearchInput('');
    setSelectedSearch(null);
    setFilters({
      voting_district_code: '',
      voting_station_id: '',
      ward_code: '',
    });
  };

  const getSearchTypeIcon = () => {
    switch (searchType) {
      case 'voting_districts': return <VotingDistrictIcon />;
      case 'voting_stations': return <VotingStationIcon />;
      case 'wards': return <WardIcon />;
      default: return <LocationIcon />;
    }
  };

  const getActiveFilter = () => {
    if (filters.voting_district_code) return `Voting District: ${selectedSearch?.label || filters.voting_district_code}`;
    if (filters.voting_station_id) return `Voting Station: ${selectedSearch?.label || filters.voting_station_id}`;
    if (filters.ward_code) return `Ward: ${selectedSearch?.label || filters.ward_code}`;
    return null;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Geographic Search
        </Typography>
      </Box>

      {/* Search Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <LocationIcon />
            Search by Geographic Location
          </Typography>
          
          {/* Search Type Toggle */}
          <Box mb={3}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select search type:
            </Typography>
            <ToggleButtonGroup
              size="small"
              color="primary"
              exclusive
              value={searchType}
              onChange={(_, value) => value && setSearchType(value)}
            >
              <ToggleButton value="voting_districts">
                <VotingDistrictIcon sx={{ mr: 1 }} />
                Voting District
              </ToggleButton>
              <ToggleButton value="voting_stations">
                <VotingStationIcon sx={{ mr: 1 }} />
                Voting Station
              </ToggleButton>
              <ToggleButton value="wards">
                <WardIcon sx={{ mr: 1 }} />
                Ward
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Search Input */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Autocomplete
                options={suggestions}
                filterOptions={(x) => x}
                getOptionLabel={(option) => option?.label || ''}
                onInputChange={(_, value) => setSearchInput(value)}
                inputValue={searchInput}
                onChange={(_, value) => {
                  setSelectedSearch(value);
                  applyGeoSearch(value);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`Search ${searchType.replace('_', ' ')}`}
                    placeholder="Type at least 2 characters..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: getSearchTypeIcon(),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="outlined"
                onClick={handleClear}
                fullWidth
                size="large"
              >
                Clear Search
              </Button>
            </Grid>
          </Grid>

          {/* Active Filter Display */}
          {getActiveFilter() && (
            <Box mt={2}>
              <Chip
                label={getActiveFilter()}
                onDelete={handleClear}
                color="primary"
                variant="outlined"
                icon={getSearchTypeIcon()}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {isLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading members. Please try again.
        </Alert>
      )}

      {getActiveFilter() && !isLoading && !error && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Members Found ({members.length})
            </Typography>

            {members.length === 0 ? (
              <Alert severity="info">
                No members found in the selected location.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Geographic Location</TableCell>
                      <TableCell>Voting District</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member: Member) => (
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
                                {member.id_number}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
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
                            {member.ward_name}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {member.municipal_name}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {member.district_name}, {member.province_name}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {!getActiveFilter() && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Search by Geographic Location
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a search type and enter a location name to find all members in that area.
                You can search by voting district, voting station, or ward.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default GeographicSearchPage;
