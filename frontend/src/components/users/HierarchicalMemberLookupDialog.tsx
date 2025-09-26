import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  InputAdornment,
  Pagination,
  Chip,
  Stack,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Search, Person, LocationOn, Email, EmailOutlined } from '@mui/icons-material';
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

interface Province {
  province_code: string;
  province_name: string;
}

interface Municipality {
  municipality_code: string;
  municipality_name: string;
}

interface Ward {
  ward_code: string;
  ward_name: string;
}

interface GeographicSelection {
  province?: Province;
  municipality?: Municipality;
  ward?: Ward;
}

interface HierarchicalMemberLookupDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectMember: (member: Member) => void;
  adminLevel: 'Municipal' | 'Ward';
  geographicSelection: GeographicSelection;
  title?: string;
}

const HierarchicalMemberLookupDialog: React.FC<HierarchicalMemberLookupDialogProps> = ({
  open,
  onClose,
  onSelectMember,
  adminLevel,
  geographicSelection,
  title = 'Select Member'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMembersWithoutEmail, setShowMembersWithoutEmail] = useState(false);
  const rowsPerPage = 10;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setPage(1);
      setSelectedMember(null);
      setShowMembersWithoutEmail(false); // Default to showing only members with emails
    }
  }, [open]);

  // Build search parameters based on geographic selection
  const buildSearchParams = () => {
    const params: any = {
      page,
      limit: rowsPerPage,
      q: searchTerm || undefined,
      // Filter by email availability - only show members with emails by default
      has_email: showMembersWithoutEmail ? undefined : true,
    };

    // Apply geographic filters based on admin level and selection
    if (adminLevel === 'Ward' && geographicSelection.ward) {
      params.ward_code = geographicSelection.ward.ward_code;
    } else if (adminLevel === 'Municipal' && geographicSelection.municipality) {
      params.municipality_code = geographicSelection.municipality.municipality_code;
    } else if (geographicSelection.province) {
      params.province_code = geographicSelection.province.province_code;
    }

    return params;
  };

  // Fetch members based on search criteria and geographic selection
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['hierarchical-member-lookup', searchTerm, page, adminLevel, showMembersWithoutEmail, JSON.stringify(geographicSelection)],
    queryFn: () => apiGet<any>('/members', buildSearchParams()),
    enabled: Boolean(open && (
      (adminLevel === 'Ward' && geographicSelection.ward) ||
      (adminLevel === 'Municipal' && geographicSelection.municipality)
    )),
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
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  // Check if geographic selection is complete
  const isGeographicSelectionComplete = 
    (adminLevel === 'Municipal' && geographicSelection.municipality) ||
    (adminLevel === 'Ward' && geographicSelection.ward);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Person />
          {title}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Geographic Context Display */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Geographic Context:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {geographicSelection.province && (
              <Chip 
                label={`Province: ${geographicSelection.province.province_name}`} 
                color="primary" 
                size="small" 
              />
            )}
            {geographicSelection.municipality && (
              <Chip 
                label={`Municipality: ${geographicSelection.municipality.municipality_name}`} 
                color="secondary" 
                size="small" 
              />
            )}
            {geographicSelection.ward && (
              <Chip 
                label={`Ward: ${geographicSelection.ward.ward_name}`} 
                color="success" 
                size="small" 
              />
            )}
          </Stack>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {!isGeographicSelectionComplete ? (
          <Alert severity="warning">
            Please complete the geographic selection first before browsing members.
            {adminLevel === 'Municipal' 
              ? ' Select a province and municipality.'
              : ' Select a province, municipality, and ward.'
            }
          </Alert>
        ) : (
          <>
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

            {/* Email Filter Controls */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Alert
                severity="info"
                icon={<Email />}
                sx={{ flex: 1, mr: 2 }}
              >
                {showMembersWithoutEmail
                  ? 'Showing all members (including those without email addresses)'
                  : 'Showing only members with valid email addresses for admin notifications'
                }
              </Alert>
              <FormControlLabel
                control={
                  <Switch
                    checked={showMembersWithoutEmail}
                    onChange={(e) => {
                      setShowMembersWithoutEmail(e.target.checked);
                      setPage(1); // Reset to first page when filter changes
                    }}
                    color="primary"
                  />
                }
                label="Show members without email"
                sx={{ minWidth: 'fit-content' }}
              />
            </Box>

            {/* Member Count Info */}
            {!isLoading && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found {pagination.total} members in the selected {adminLevel.toLowerCase()} area
                {!showMembersWithoutEmail && (
                  <span style={{ fontWeight: 'bold' }}> (with valid email addresses)</span>
                )}
              </Typography>
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

            {/* Members List */}
            {!isLoading && !error && (
              <>
                {members.length === 0 ? (
                  <Alert severity="info">
                    No members found in the selected area{!showMembersWithoutEmail ? ' with valid email addresses' : ''}.
                    {!showMembersWithoutEmail
                      ? ' Try enabling "Show members without email" or adjusting your search criteria.'
                      : ' Try adjusting your search criteria.'
                    }
                  </Alert>
                ) : (
                  <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {members.map((member: Member) => (
                      <ListItem key={member.member_id} disablePadding>
                        <ListItemButton
                          selected={selectedMember?.member_id === member.member_id}
                          onClick={() => handleSelectMember(member)}
                        >
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <span>{member.full_name || `${member.firstname} ${member.surname}`}</span>
                                {member.email ? (
                                  <Email sx={{ fontSize: 16, color: 'success.main' }} titleAccess="Has email address" />
                                ) : (
                                  <EmailOutlined sx={{ fontSize: 16, color: 'warning.main' }} titleAccess="No email address" />
                                )}
                              </Box>
                            }
                            secondary={
                              <>
                                <span style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                  ID: {member.id_number || 'N/A'} |{' '}
                                  Email: {member.email || 'N/A'} |{' '}
                                  Phone: {member.cell_number || 'N/A'}
                                </span>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                  Ward: {member.ward_name} |{' '}
                                  Municipality: {member.municipality_name} |{' '}
                                  Province: {member.province_name}
                                </span>
                              </>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Pagination
                      count={pagination.totalPages}
                      page={page}
                      onChange={handlePageChange}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
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

export default HierarchicalMemberLookupDialog;
