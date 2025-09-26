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
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { viewsApi } from '../../services/api';
import type { Member } from '../../types/member';

const MemberSearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Fetch members based on search query
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['members-search', activeSearch],
    queryFn: () => viewsApi.getMembersWithVotingDistricts({ 
      search: activeSearch,
      limit: 100 
    }),
    enabled: activeSearch.length >= 2,
  });

  const members = membersData?.data?.members || [];

  const handleSearch = () => {
    if (searchQuery.trim().length >= 2) {
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Member Search
        </Typography>
      </Box>

      {/* Search Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <SearchIcon />
            Search Members
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Search by name, ID number, email, or phone number
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Search Members"
                placeholder="Enter name, ID number, email, or phone..."
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
                disabled={searchQuery.trim().length < 2}
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
          Error loading members. Please try again.
        </Alert>
      )}

      {activeSearch && !isLoading && !error && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Search Results ({members.length})
            </Typography>

            {members.length === 0 ? (
              <Alert severity="info">
                No members found matching "{activeSearch}". Try a different search term.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell>ID Number</TableCell>
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
                                Member #{member.member_id}
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

      {!activeSearch && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Search for Members
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter a member's name, ID number, email address, or phone number to find their information.
                Search requires at least 2 characters.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MemberSearchPage;
