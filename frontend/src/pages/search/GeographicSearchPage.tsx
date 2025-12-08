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
  TablePagination,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  HowToReg as VotingDistrictIcon,
  Place as VotingStationIcon,
  Map as WardIcon,
  Download as DownloadIcon,
  Description as ExcelIcon,
  Article as WordIcon,
  Archive as ZipIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { viewsApi, searchApi, membersApi } from '../../services/api';
import type { Member } from '../../types/member';
import { useNotification } from '../../hooks/useNotification';

// Helper function to download blob
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const GeographicSearchPage = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [searchType, setSearchType] = useState<'voting_districts' | 'voting_stations' | 'wards' | 'subregions'>('voting_districts');
  const [searchInput, setSearchInput] = useState('');
  const [selectedSearch, setSelectedSearch] = useState<any>(null);
  const [filters, setFilters] = useState({
    voting_district_code: '',
    voting_station_id: '',
    ward_code: '',
    municipal_code: '',
  });
  const [membershipStatus, setMembershipStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Get search suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['geo-search-suggestions', searchType, searchInput],
    queryFn: () => {
      // For subregions, use municipalities endpoint
      const lookupType = searchType === 'subregions' ? 'municipalities' : searchType;
      return searchApi.lookup(lookupType, { search: searchInput, limit: 10 });
    },
    enabled: searchInput.length >= 2,
    staleTime: 30 * 1000, // Keep suggestions fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    select: (data) => {
      const results = data?.data?.results || [];
      return results.map((item: any) => ({
        ...item,
        label: searchType === 'voting_districts'
          ? `${item.name} (${item.voting_district_number})`
          : searchType === 'voting_stations'
          ? `${item.name} (${item.station_code})`
          : searchType === 'wards'
          ? `${item.name} (${item.ward_code})` // ward_name already contains "Ward X", show ward_code for clarity
          : `${item.name} (${item.municipality_code || item.code})`, // subregions
      }));
    },
  });

  // Fetch members based on filters with pagination
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['members-geographic-search', filters, membershipStatus, page, rowsPerPage],
    queryFn: () => viewsApi.getMembersWithVotingDistricts({
      ...filters,
      membership_status: membershipStatus,
      page: page + 1, // Backend expects 1-based pagination
      limit: rowsPerPage
    }),
    enabled: !!(filters.voting_district_code || filters.voting_station_id || filters.ward_code || filters.municipal_code),
    staleTime: 60 * 1000, // Keep data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    placeholderData: (previousData) => previousData, // Keep previous data while loading new
  });

  const members = membersData?.data?.members || [];
  const rawPagination = membersData?.data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };
  // Ensure pagination values are numbers (backend may return strings)
  const pagination = {
    total: Number(rawPagination.total) || 0,
    page: Number(rawPagination.page) || 1,
    limit: Number(rawPagination.limit) || 20,
    totalPages: Number(rawPagination.totalPages) || 0
  };

  const applyGeoSearch = (selection: any) => {
    if (!selection) return;

    const newFilters = {
      voting_district_code: '',
      voting_station_id: '',
      ward_code: '',
      municipal_code: '',
    };

    if (searchType === 'voting_districts') {
      newFilters.voting_district_code = selection.vd_code || selection.id;
    } else if (searchType === 'voting_stations') {
      newFilters.voting_station_id = selection.voting_station_id || selection.id;
    } else if (searchType === 'wards') {
      newFilters.ward_code = selection.ward_code || selection.id;
    } else if (searchType === 'subregions') {
      newFilters.municipal_code = selection.municipality_code || selection.code || selection.id;
    }

    setFilters(newFilters);
    setPage(0); // Reset to first page when filters change
  };

  const handleClear = () => {
    setSearchInput('');
    setSelectedSearch(null);
    setFilters({
      voting_district_code: '',
      voting_station_id: '',
      ward_code: '',
      municipal_code: '',
    });
    setMembershipStatus('all');
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDownloadClick = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadAnchorEl(event.currentTarget);
  };

  const handleDownloadClose = () => {
    setDownloadAnchorEl(null);
  };

  const handleDownload = async (format: 'excel' | 'word' | 'pdf' | 'both') => {
    try {
      setIsDownloading(true);
      handleDownloadClose();

      let blob: Blob;
      let emailSentTo: string | undefined;
      let emailStatus: 'sending' | 'failed' | 'no-email' | undefined;
      let emailError: string | undefined;
      const timestamp = new Date().toISOString().split('T')[0];
      let filename = '';

      // Use the views export endpoint for all search types
      const exportFilters = {
        ...filters,
        membership_status: membershipStatus
      };
      const response = await viewsApi.exportMembersWithVotingDistricts(exportFilters, format);
      blob = response.blob;
      emailSentTo = response.emailSentTo;
      emailStatus = response.emailStatus;
      emailError = response.emailError;

      // Determine filename based on search type and filters
      if (searchType === 'subregions' && filters.municipal_code) {
        filename = format === 'both'
          ? `SubRegion_${filters.municipal_code}_Complete_Export_${timestamp}.zip`
          : format === 'excel'
          ? `SubRegion_${filters.municipal_code}_Members_${timestamp}.xlsx`
          : format === 'pdf'
          ? `SubRegion_${filters.municipal_code}_Attendance_Register_${timestamp}.pdf`
          : `SubRegion_${filters.municipal_code}_Export_${timestamp}.docx`;
      } else if (filters.ward_code) {
        filename = format === 'both'
          ? `Ward_${filters.ward_code}_Complete_Export_${timestamp}.zip`
          : format === 'excel'
          ? `Ward_${filters.ward_code}_All_Members_${timestamp}.xlsx`
          : format === 'pdf'
          ? `Ward_${filters.ward_code}_Attendance_Register_${timestamp}.pdf`
          : `Ward_${filters.ward_code}_Attendance_Register_${timestamp}.docx`;
      } else {
        filename = format === 'both'
          ? `Geographic_Search_Complete_Export_${timestamp}.zip`
          : format === 'excel'
          ? `Geographic_Search_All_Members_${timestamp}.xlsx`
          : format === 'pdf'
          ? `Geographic_Search_Attendance_Register_${timestamp}.pdf`
          : `Geographic_Search_Export_${timestamp}.docx`;
      }

      downloadBlob(blob, filename);

      // Show notification based on email status
      if (format === 'pdf' || format === 'word' || format === 'both') {
        if (emailStatus === 'sending' && emailSentTo) {
          showSuccess(`✅ Document downloaded! A PDF copy will be emailed to ${emailSentTo}`);
        } else if (emailStatus === 'failed') {
          showError(`⚠️ Document downloaded, but email failed: ${emailError || 'Unknown error'}`);
        } else if (emailStatus === 'no-email') {
          showWarning('⚠️ Document downloaded, but no email address available for PDF delivery');
        }
      } else {
        showSuccess('✅ Document downloaded successfully!');
      }
    } catch (error: any) {
      console.error('Download failed:', error);

      // Check if it's an authorization error
      if (error.response?.status === 403) {
        const errorData = error.response?.data?.error;
        if (errorData?.code === 'PROVINCE_ACCESS_DENIED') {
          showError(`🚫 ${errorData.message}`);
        } else {
          showError('🚫 You are not authorized to download this document.');
        }
      } else {
        showError(error.response?.data?.message || 'Download failed. Please try again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const getSearchTypeIcon = () => {
    switch (searchType) {
      case 'voting_districts': return <VotingDistrictIcon />;
      case 'voting_stations': return <VotingStationIcon />;
      case 'wards': return <WardIcon />;
      case 'subregions': return <LocationIcon />;
      default: return <LocationIcon />;
    }
  };

  const getActiveFilter = () => {
    if (filters.voting_district_code) return `Voting District: ${selectedSearch?.label || filters.voting_district_code}`;
    if (filters.voting_station_id) return `Voting Station: ${selectedSearch?.label || filters.voting_station_id}`;
    if (filters.ward_code) return `Ward: ${selectedSearch?.label || filters.ward_code}`;
    if (filters.municipal_code) return `Sub-Region: ${selectedSearch?.label || filters.municipal_code}`;
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
              <ToggleButton value="subregions">
                <LocationIcon sx={{ mr: 1 }} />
                Sub-Region
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Membership Status Filter - Show for all search types */}
          <Box mb={3}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Membership Status:
            </Typography>
            <ToggleButtonGroup
              size="small"
              color="primary"
              exclusive
              value={membershipStatus}
              onChange={(_, value) => value && setMembershipStatus(value)}
            >
              <ToggleButton value="all">All Members</ToggleButton>
              <ToggleButton value="active">Active</ToggleButton>
              <ToggleButton value="expired">Expired/Inactive</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Search Input */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Autocomplete
                options={suggestions}
                filterOptions={(x) => x}
                getOptionLabel={(option: any) => option?.label || ''}
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
                sx={{ borderRadius: '50px' }} // Pill shape
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Members Found ({pagination.total})
              </Typography>

              {members.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={isDownloading ? <CircularProgress size={20} /> : <DownloadIcon />}
                  onClick={handleDownloadClick}
                  disabled={isDownloading}
                >
                  {searchType === 'subregions' ? 'Download Sub-Region Members' : 'Download Attendance Register'}
                </Button>
              )}
            </Box>

            {members.length === 0 ? (
              <Alert severity="info">
                No members found in the selected location.
              </Alert>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Member</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Geographic Location</TableCell>
                        <TableCell>Voting District</TableCell>
                        <TableCell>Membership Status</TableCell>
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
                                  sx={{ borderRadius: '50px' }} // Pill shape
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
                                sx={{ borderRadius: '50px' }} // Pill shape
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={(member as any).membership_status || 'Good Standing'}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <TablePagination
                  component="div"
                  count={pagination.total}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[20, 50, 100]}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Download Menu */}
      <Menu
        anchorEl={downloadAnchorEl}
        open={Boolean(downloadAnchorEl)}
        onClose={handleDownloadClose}
      >
        <MenuItem onClick={() => handleDownload('excel')}>
          <ListItemIcon>
            <ExcelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Download Excel - All Members"
            secondary="Includes Active, Expired, Inactive & Grace Period"
          />
        </MenuItem>
        <MenuItem onClick={() => handleDownload('pdf')} disabled={!filters.ward_code}>
          <ListItemIcon>
            <WordIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Download PDF Attendance Register (Recommended)"
            secondary={!filters.ward_code ? 'Ward required' : 'Active members only - Sent via email'}
          />
        </MenuItem>
        <MenuItem onClick={() => handleDownload('both')} disabled={!filters.ward_code}>
          <ListItemIcon>
            <ZipIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Download Both (ZIP)"
            secondary={!filters.ward_code ? 'Ward required' : 'Excel (All) + Word (Active)'}
          />
        </MenuItem>
      </Menu>

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
