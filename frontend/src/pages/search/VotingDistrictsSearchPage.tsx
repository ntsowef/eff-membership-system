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
  HowToReg as VotingDistrictIcon,
  LocationOn as LocationIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../services/api';
import MembersListModal from '../../components/modals/MembersListModal';

const VotingDistrictsSearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch voting districts based on search query
  const { data: votingDistrictsData, isLoading, error } = useQuery({
    queryKey: ['voting-districts-search', activeSearch],
    queryFn: () => searchApi.lookup('voting_districts', { 
      search: activeSearch,
      limit: 50 
    }),
    enabled: activeSearch.length >= 1,
  });

  const votingDistricts = votingDistrictsData?.data?.results || [];

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

  const handleViewMembers = (district: any) => {
    setSelectedDistrict(district);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedDistrict(null);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Voting Districts Directory
        </Typography>
      </Box>

      {/* Search Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <VotingDistrictIcon />
            Search Voting Districts
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Search by voting district name, code, or number
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Search Voting Districts"
                placeholder="Enter district name, code, or number..."
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
          Error loading voting districts. Please try again.
        </Alert>
      )}

      {activeSearch && !isLoading && !error && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Voting Districts Found ({votingDistricts.length})
            </Typography>

            {votingDistricts.length === 0 ? (
              <Alert severity="info">
                No voting districts found matching "{activeSearch}". Try a different search term.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>District Info</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Geographic Location</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Members</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {votingDistricts.map((district: any) => (
                      <TableRow key={district.vd_code || district.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {district.vd_name || district.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              District #{district.voting_district_number || district.vd_number}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={district.vd_code || district.code}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" display="block">
                              {district.ward_name}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {district.municipal_name}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {district.district_name}, {district.province_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={district.is_active ? "Active" : "Inactive"}
                            size="small"
                            color={district.is_active ? "success" : "default"}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LocationIcon fontSize="small" />
                            <Typography variant="body2">
                              {district.member_count || 0} members
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => handleViewMembers(district)}
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
              <VotingDistrictIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Browse Voting Districts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Search for voting districts by name, code, or number to view their details and member counts.
                This directory shows all voting districts in the system with their geographic hierarchy.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Members List Modal */}
      {selectedDistrict && (
        <MembersListModal
          open={modalOpen}
          onClose={handleCloseModal}
          votingDistrictCode={selectedDistrict.vd_code || selectedDistrict.id}
          votingDistrictName={selectedDistrict.vd_name || selectedDistrict.name}
          memberCount={selectedDistrict.member_count || 0}
        />
      )}
    </Box>
  );
};

export default VotingDistrictsSearchPage;
