// MemberSelector Component
// Advanced member selection component for leadership assignments

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Avatar,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Search,
  Person,
  Email,
  Phone,
  LocationOn,
  CheckCircle,
  Cancel,

} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import * as LeadershipService from '../../services/leadershipApi';
import type { GeographicSelection } from './GeographicSelector';
import { useProvinceContext } from '../../hooks/useProvinceContext';

// Extract what we need from the service
const { LeadershipAPI } = LeadershipService;
type MemberFilters = LeadershipService.MemberFilters;

// =====================================================
// Interfaces
// =====================================================

// Member interface that matches the actual backend API response
interface Member {
  // Core fields - matching backend response
  member_id: number;
  id_number: string;
  first_name: string;        // Backend sends this
  last_name: string;         // Backend sends this
  firstname?: string;        // Fallback/alias
  surname?: string;          // Fallback/alias
  full_name?: string;        // Computed field
  age?: number;
  gender_id?: number;
  gender_name?: string;
  gender?: string;           // Backend might send this

  // Geographic information
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  municipality_code?: string;
  municipality_name?: string;
  ward_code?: string;
  ward_name?: string;
  ward_number?: string;

  // Contact information - matching backend response
  phone?: string;            // Backend sends this
  cell_number?: string;      // Fallback/alias
  landline_number?: string;
  email?: string;
  residential_address?: string;

  // Membership information
  membership_status?: string;
  membership_type?: string;
  membership_number?: string;
  membership_id?: number;

  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_updated?: string;     // Backend might send this
  member_created_at?: string;
}

interface MemberSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (member: Member) => void;
  title?: string;
  filterByLevel?: string;
  entityId?: number;
  geographicSelection?: GeographicSelection | null;
  excludeMemberIds?: number[];
}



// =====================================================
// MemberSelector Component
// =====================================================

const MemberSelector: React.FC<MemberSelectorProps> = ({
  open,
  onClose,
  onSelect,
  title = "Select Member for Leadership Position",
  filterByLevel,
  entityId,
  geographicSelection,
  excludeMemberIds = []
}) => {
  // ==================== State ====================
  const [searchTerm, setSearchTerm] = useState('');

  // Get province context for provincial admin restrictions
  useProvinceContext();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [membershipStatusFilter, setMembershipStatusFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  // Removed eligibilityCache since everyone is eligible
  const [enableGeographicFiltering] = useState(true);

  // ==================== API Queries ====================
  
  // Build filters for member query
  const buildFilters = (): MemberFilters => {
    const filters: MemberFilters = {
      page: page + 1,
      limit: rowsPerPage
    };

    // Use 'q' for search (backend parameter)
    if (searchTerm.trim()) {
      filters.q = searchTerm.trim();
    }

    // Note: Backend doesn't support membership_status filter in the main endpoint
    // We'll filter client-side or use a different approach

    // Geographic filtering - ENABLED by default using geographicSelection codes
    if (enableGeographicFiltering) {
      if (geographicSelection) {
        const level = geographicSelection.hierarchyLevel;
        if (level === 'Province' && geographicSelection.province?.province_code) {
          filters.province_code = geographicSelection.province.province_code;
          console.log(`✅ Geographic filter applied: Province = ${filters.province_code}`);
        }
        if (level === 'Municipality' && geographicSelection.municipality?.municipality_code) {
          filters.municipality_code = geographicSelection.municipality.municipality_code;
          console.log(`✅ Geographic filter applied: Municipality = ${filters.municipality_code}`);
        }
        if (level === 'Ward' && geographicSelection.ward?.ward_code) {
          filters.ward_code = geographicSelection.ward.ward_code;
          console.log(`✅ Geographic filter applied: Ward = ${filters.ward_code}`);
        }
      } else if (filterByLevel && entityId) {
        // Fallback: try to use entityId if provided (less precise)
        const geographicCode = entityId.toString();
        switch (filterByLevel) {
          case 'Province':
            filters.province_code = geographicCode;
            break;
          case 'District':
            filters.district_code = geographicCode;
            break;
          case 'Municipality':
            filters.municipality_code = geographicCode;
            break;
          case 'Ward':
            filters.ward_code = geographicCode;
            break;
        }
      }
    }

    if (provinceFilter && provinceFilter.length >= 2) {
      filters.province_code = provinceFilter;
    }

    return filters;
  };

  // Fetch members
  const { data: membersData, isLoading, error, refetch } = useQuery({
    queryKey: ['leadership-members', searchTerm, page, rowsPerPage, membershipStatusFilter, genderFilter, provinceFilter, filterByLevel, entityId, enableGeographicFiltering, JSON.stringify(geographicSelection || null)],
    queryFn: () => LeadershipAPI.getMembers(buildFilters()),
    enabled: open,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const members = membersData?.members || [];
  const pagination = membersData?.pagination || { total: 0, totalPages: 1 };

  // Debug logging
  React.useEffect(() => {
    if (open) {
      console.log('🔍 MemberSelector data received:', {
        membersData,
        membersCount: members.length,
        firstMember: members[0],
        pagination,
        isLoading,
        error: error?.message,
        hasData: !!membersData,
        dataStructure: membersData ? Object.keys(membersData) : 'No data'
      });
    }
  }, [open, membersData, members, pagination, isLoading, error]);

  // Filter members client-side (since backend doesn't support all filters)
  const filteredMembers = members.filter(member => {
    // Exclude specified member IDs
    if (excludeMemberIds.includes(member.member_id)) {
      console.log(`🔍 Filtering out excluded member: ${member.member_id}`);
      return false;
    }

    // Filter by membership status (client-side since backend doesn't support it)
    if (membershipStatusFilter && membershipStatusFilter !== 'All') {
      const memberStatus = member.membership_status || 'Active';
      if (memberStatus !== membershipStatusFilter) {
        console.log(`🔍 Filtering out member ${member.member_id} - status mismatch: "${memberStatus}" !== "${membershipStatusFilter}"`);
        return false;
      }
    }

    // Filter by gender if specified
    if (genderFilter && genderFilter !== 'All') {
      const memberGender = member.gender_name || member.gender || 'Unknown';
      if (memberGender !== genderFilter) {
        console.log(`🔍 Filtering out member ${member.member_id} - gender mismatch: "${memberGender}" !== "${genderFilter}"`);
        return false;
      }
    }

    return true;
  });

  // Debug filtered results
  React.useEffect(() => {
    if (open) {
      console.log('🔍 MemberSelector filtering debug:', {
        totalMembers: members.length,
        filteredMembers: filteredMembers.length,
        filters: {
          membershipStatusFilter,
          genderFilter,
          excludeMemberIds
        },
        sampleMember: members[0],
        sampleMemberStatus: members[0]?.membership_status,
        sampleMemberGender: members[0]?.gender_name || members[0]?.gender,
        sampleFilteredMember: filteredMembers[0],
        isLoading,
        error: error?.message,
        allMemberStatuses: members.map(m => m.membership_status).slice(0, 5),
        allMemberGenders: members.map(m => m.gender_name || m.gender).slice(0, 5)
      });
    }
  }, [open, members, filteredMembers, membershipStatusFilter, genderFilter, excludeMemberIds, isLoading, error]);

  // ==================== Event Handlers ====================
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page on new search
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
  };

  const handleConfirmSelection = async () => {
    if (selectedMember) {
      // Since everyone is eligible, just proceed with selection
      onSelect(selectedMember);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedMember(null);
    setSearchTerm('');
    setPage(0);
    setMembershipStatusFilter('All');
    setGenderFilter('');
    setProvinceFilter('');
    onClose();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ==================== Helper Functions ====================
  
  const getMemberEligibilityStatus = () => {
    // ALL MEMBERS ARE NOW ELIGIBLE
    return {
      is_eligible: true,
      eligibility_notes: 'All members are eligible for leadership positions'
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Inactive': return 'error';
      case 'Pending': return 'warning';
      case 'Suspended': return 'error';
      default: return 'default';
    }
  };

  // ==================== Render ====================
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh', maxHeight: '800px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Person color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Search and Filters */}
        <Box mb={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search by name, ID number, email, or phone..."
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
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={membershipStatusFilter}
                  label="Status"
                  onChange={(e) => setMembershipStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={genderFilter}
                  label="Gender"
                  onChange={(e) => setGenderFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={() => refetch()}
                disabled={isLoading}
                fullWidth
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Geographic Scope Info */}
        {(filterByLevel || geographicSelection) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="body2">
                <strong>Geographic Scope:</strong> {(() => {
                  const level = geographicSelection?.hierarchyLevel || filterByLevel;
                  const code = geographicSelection?.province?.province_code || geographicSelection?.municipality?.municipality_code || geographicSelection?.ward?.ward_code || entityId;
                  return `Filtering by ${level} ${code}`;
                })()}
              </Typography>
            </Box>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load members: {error.message}
          </Alert>
        )}

        {/* Debug Panel - Remove this in production */}
        {process.env.NODE_ENV === 'development' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="caption">
              <strong>Debug:</strong> API returned {members.length} members,
              filtered to {filteredMembers.length} members.
              Loading: {isLoading ? 'Yes' : 'No'},
              Error: {error ? 'Yes' : 'No'}
            </Typography>
          </Alert>
        )}

        {/* Members Table */}
        <>
          <TableContainer component={Paper} sx={{ maxHeight: 400, minHeight: 200 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width="60px">Select</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>ID Number</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Eligibility</TableCell>
                </TableRow>
              </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Box py={4}>
                          <Typography variant="body2" color="text.secondary">
                            Loading members...
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Box py={4}>
                          <Typography variant="body2" color="error">
                            Error loading members: {error.message}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Box py={4}>
                          <Typography variant="body2" color="text.secondary">
                            {members.length === 0 ? 'No members found in database' : 'No members match the current filters'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                            {members.length === 0
                              ? 'Check your database connection and ensure members exist'
                              : `Found ${members.length} total members, but ${filteredMembers.length} after filtering`
                            }
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => {
                      const eligibility = getMemberEligibilityStatus();
                      const isSelected = selectedMember?.member_id === member.member_id;
                    
                    return (
                      <TableRow
                        key={member.member_id}
                        hover
                        selected={isSelected}
                        onClick={() => handleSelectMember(member)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Avatar
                            sx={{
                              bgcolor: isSelected ? 'primary.main' : 'grey.300',
                              width: 32,
                              height: 32,
                            }}
                          >
                            {isSelected ? '✓' : (((member.firstname || member.first_name || '?')[0] || '?').toUpperCase())}
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {member.full_name || `${member.firstname || member.first_name || ''} ${member.surname || member.last_name || ''}`.trim() || 'Unknown Name'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {member.member_id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {member.id_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            {member.email && (
                              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <Email fontSize="small" color="action" />
                                <Typography variant="caption">{member.email}</Typography>
                              </Box>
                            )}
                            {(member.cell_number || member.phone) && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Phone fontSize="small" color="action" />
                                <Typography variant="caption">{member.cell_number || member.phone}</Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <LocationOn fontSize="small" color="action" />
                            <Typography variant="caption">
                              {member.municipality_name || 'Unknown Municipality'}, {member.province_name || 'Unknown Province'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={member.membership_status || 'Active'}
                            size="small"
                            color={getStatusColor(member.membership_status || 'Active') as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            {eligibility.is_eligible ? (
                              <CheckCircle fontSize="small" color="success" />
                            ) : (
                              <Cancel fontSize="small" color="error" />
                            )}
                            <Typography 
                              variant="caption" 
                              color={eligibility.is_eligible ? 'success.main' : 'error.main'}
                            >
                              {eligibility.is_eligible ? 'Eligible' : 'Not Eligible'}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={pagination.total || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>

        {/* Selected Member Details */}
        {selectedMember && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Selected Member Details
            </Typography>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Full Name</Typography>
                    <Typography variant="body1">{selectedMember.full_name}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">ID Number</Typography>
                    <Typography variant="body1">{selectedMember.id_number}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Location</Typography>
                    <Typography variant="body1">
                      {selectedMember.municipality_name}, {selectedMember.province_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip
                      label={selectedMember.membership_status || 'Active'}
                      size="small"
                      color={getStatusColor(selectedMember.membership_status || 'Active') as any}
                    />
                  </Grid>
                </Grid>
                
                {/* Eligibility Status */}
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">Eligibility Status</Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    {getMemberEligibilityStatus().is_eligible ? (
                      <CheckCircle fontSize="small" color="success" />
                    ) : (
                      <Cancel fontSize="small" color="error" />
                    )}
                    <Typography variant="body2">
                      {getMemberEligibilityStatus().eligibility_notes}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirmSelection}
          variant="contained"
          disabled={!selectedMember}
        >
          Select Member
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberSelector;
