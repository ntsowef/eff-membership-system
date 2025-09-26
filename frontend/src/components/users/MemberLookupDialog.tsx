import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip,
  Avatar,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material';
import {
  Search,
  Person,
  LocationOn,
  Phone,
  Email,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';

interface Member {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  full_name: string;
  email?: string;
  cell_number?: string;
  landline_number?: string;
  province_name: string;
  district_name: string;
  municipality_name: string;
  ward_name: string;
  ward_number: number;
  province_code: string;
  district_code: string;
  municipality_code: string;
  ward_code: string;
  residential_address?: string;
  age: number;
  gender_name: string;
  member_created_at: string;
}

interface MemberLookupDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectMember: (member: Member) => void;
  adminLevel: 'Municipal' | 'Ward';
  geographicScope?: {
    province_code?: string;
    district_code?: string;
    municipality_code?: string;
    ward_code?: string;
  };
}

const MemberLookupDialog: React.FC<MemberLookupDialogProps> = ({
  open,
  onClose,
  onSelectMember,
  adminLevel,
  geographicScope,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [page, setPage] = useState(1);

  // Build search parameters based on admin level and geographic scope
  const buildSearchParams = () => {
    const params: any = {
      page,
      limit: 10,
    };

    // Add search term if provided (API uses 'q' parameter)
    if (searchTerm.trim()) {
      params.q = searchTerm.trim();
    }

    // Apply geographic filtering based on admin level
    if (geographicScope) {
      if (adminLevel === 'Ward' && geographicScope.ward_code) {
        params.ward_code = geographicScope.ward_code;
      } else if (adminLevel === 'Municipal' && geographicScope.municipality_code) {
        params.municipality_code = geographicScope.municipality_code;
      }
    }

    return params;
  };

  // Fetch members based on search criteria
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['member-lookup', searchTerm, page, adminLevel, geographicScope],
    queryFn: () => apiGet<any>('/members', buildSearchParams()),
    enabled: open,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const members = membersData?.data || [];
  const pagination = membersData?.pagination || { total: 0, totalPages: 1 };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page on new search
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
  };

  const handleConfirmSelection = () => {
    if (selectedMember) {
      onSelectMember(selectedMember);
      onClose();
      setSelectedMember(null);
      setSearchTerm('');
      setPage(1);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedMember(null);
    setSearchTerm('');
    setPage(1);
  };



  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Person color="primary" />
          <Box>
            <Typography variant="h6">
              Select Member for {adminLevel} Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose an active member from the {adminLevel.toLowerCase()} area to link to this admin account
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Search Controls */}
        <Box display="flex" gap={2} mb={3}>
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
        </Box>

        {/* Geographic Scope Info */}
        {geographicScope && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Geographic Scope:</strong> Only showing members from{' '}
              {adminLevel === 'Ward' 
                ? `Ward ${geographicScope.ward_code}` 
                : `Municipality ${geographicScope.municipality_code}`
              }
            </Typography>
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
            Failed to load members. Please try again.
          </Alert>
        )}

        {/* Members Table */}
        {!isLoading && !error && (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Select</TableCell>
                    <TableCell>Member</TableCell>
                    <TableCell>ID Number</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Age/Gender</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary" py={4}>
                          No members found matching your criteria
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member: Member) => (
                      <TableRow
                        key={member.member_id}
                        hover
                        selected={selectedMember?.member_id === member.member_id}
                        onClick={() => handleSelectMember(member)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Avatar
                            sx={{
                              bgcolor: selectedMember?.member_id === member.member_id ? 'primary.main' : 'grey.300',
                              width: 32,
                              height: 32,
                            }}
                          >
                            {selectedMember?.member_id === member.member_id ? '✓' : member.firstname[0]}
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {member.full_name}
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
                            {member.cell_number && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Phone fontSize="small" color="action" />
                                <Typography variant="caption">{member.cell_number}</Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <LocationOn fontSize="small" color="action" />
                            <Box>
                              <Typography variant="caption" display="block">
                                {member.municipality_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Ward {member.ward_number}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" display="block">
                              Age {member.age}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {member.gender_name}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={pagination.totalPages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                />
              </Box>
            )}

            {/* Selection Summary */}
            {selectedMember && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Selected:</strong> {selectedMember.full_name}
                  (ID: {selectedMember.id_number}) from {selectedMember.municipality_name}, Ward {selectedMember.ward_number}
                </Typography>
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirmSelection}
          disabled={!selectedMember}
        >
          Select Member
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberLookupDialog;
