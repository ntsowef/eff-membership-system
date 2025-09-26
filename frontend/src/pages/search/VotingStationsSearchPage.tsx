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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  Link,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Place as VotingStationIcon,
  LocationOn as LocationIcon,
  HowToReg as VotingDistrictIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../services/api';
import VotingStationMembersModal from '../../components/modals/VotingStationMembersModal';

const VotingStationsSearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch voting stations based on search query
  const { data: votingStationsData, isLoading, error } = useQuery({
    queryKey: ['voting-stations-search', activeSearch],
    queryFn: () => searchApi.lookup('voting_stations', { 
      search: activeSearch,
      limit: 50 
    }),
    enabled: activeSearch.length >= 1,
  });

  const votingStations = votingStationsData?.data?.results || [];

  const handleSearch = () => {
    if (searchQuery.trim().length >= 1) {
      setActiveSearch(searchQuery.trim());
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleViewMembers = (station: any) => {
    setSelectedStation(station);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedStation(null);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Voting Stations Directory
        </Typography>
      </Box>

      {/* Search Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <VotingStationIcon />
            Search Voting Stations
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Search by voting station name or code
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Search Voting Stations"
                placeholder="Enter station name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={handleClear}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        <ClearIcon />
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={searchQuery.trim().length < 1}
                fullWidth
                size="large"
                startIcon={<SearchIcon />}
              >
                Search
              </Button>
            </Grid>
          </Grid>

          {/* Active Search Display */}
          {activeSearch && (
            <Box mt={2}>
              <Chip
                label={`Searching for: "${activeSearch}"`}
                onDelete={handleClear}
                color="primary"
                variant="outlined"
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
          Error loading voting stations. Please try again.
        </Alert>
      )}

      {activeSearch && !isLoading && !error && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Voting Stations Found ({votingStations.length})
            </Typography>

            {votingStations.length === 0 ? (
              <Alert severity="info">
                No voting stations found matching "{activeSearch}". Try a different search term.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Station Info</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Voting District</TableCell>
                      <TableCell>Members</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {votingStations.map((station: any) => (
                      <TableRow key={station.voting_station_id || station.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {station.voting_station_name || station.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Station ID: {station.voting_station_id || station.id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={station.voting_station_code || station.code}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" display="block">
                              {station.address || 'Address not available'}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {station.ward_name}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {station.municipal_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {station.voting_district_name ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <VotingDistrictIcon fontSize="small" />
                              <Box>
                                <Typography variant="caption" display="block">
                                  {station.voting_district_name}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  VD {station.voting_district_number}
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Chip
                              label="No VD Assigned"
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LocationIcon fontSize="small" />
                            <Typography variant="body2">
                              {station.member_count || 0} members
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => handleViewMembers(station)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              textDecoration: 'none',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            <ViewIcon fontSize="small" />
                            View Members
                          </Link>
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

      {!activeSearch && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <VotingStationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Browse Voting Stations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Search for voting stations by name or code to view their details, addresses, and associated voting districts.
                This directory shows all voting stations in the system with their member counts.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Voting Station Members Modal */}
      {selectedStation && (
        <VotingStationMembersModal
          open={modalOpen}
          onClose={handleCloseModal}
          votingStationId={selectedStation.voting_station_id || selectedStation.id}
          votingStationName={selectedStation.voting_station_name || selectedStation.name}
          memberCount={selectedStation.member_count || 0}
        />
      )}
    </Box>
  );
};

export default VotingStationsSearchPage;
