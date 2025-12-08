import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  Select,
  FormControl,
  InputLabel,
  Toolbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Container,
  useTheme,
  Grid,
  Snackbar,
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  MoreVert,
  Edit,
  Delete,
  Email,
  Phone,
  LocationOn,
  CheckCircle, // Still needed for StatsCard
  // Cancel, Warning - removed since Status column was removed
  Refresh,
  Assessment, // For audit icon
  People,
  PersonAdd,
  Analytics,
  ArrowUpward,
  ArrowDownward,
  Cake,
  Person,
  CalendarToday,
  SupervisorAccount,
  HowToVote, // For voting district filter chip
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Member } from '../../store';
import GeographicFilter from '../../components/members/GeographicFilter';
import StatsCard from '../../components/ui/StatsCard';
import ActionButton from '../../components/ui/ActionButton';
import PageHeader from '../../components/ui/PageHeader';
import { useMunicipalityContext, applyMunicipalityFilter } from '../../hooks/useMunicipalityContext';
import MunicipalityContextBanner from '../../components/common/MunicipalityContextBanner';
import FileProcessingStatusModal from '../../components/file-processing/FileProcessingStatusModal';
import { devLog, devWarn } from '../../utils/logger';

// API query functions
import { apiGet, apiPost } from '../../lib/api';
import { membersApi } from '../../services/api';
import type { PaginatedResponse } from '../../lib/api';

// Types for membership statuses
interface MembershipStatus {
  status_id: number;
  status_name: string;
  is_active: boolean;
  created_at: string;
}

interface FilterState {
  membershipType: string;
  hierarchyLevel: string;
  province: string;
  membership_status: string;
}

interface GeographicFilters {
  province?: string;
  district?: string;
  municipality?: string;
  ward?: string;
  voting_district_code?: string;
}

const MembersListPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const municipalityContext = useMunicipalityContext();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    membershipType: '',
    hierarchyLevel: '',
    province: '',
    membership_status: '',
  });
  const [geographicFilters, setGeographicFilters] = useState<GeographicFilters>({});
  const [sortBy, setSortBy] = useState('firstname');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Read URL parameters on mount
  useEffect(() => {
    const votingDistrictCode = searchParams.get('voting_district_code');
    if (votingDistrictCode) {
      devLog('🗳️ Setting voting district filter from URL:', votingDistrictCode);
      setGeographicFilters(prev => ({
        ...prev,
        voting_district_code: votingDistrictCode
      }));
    }
  }, [searchParams]);

  // Audit export state
  const [auditExportLoading, setAuditExportLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');
  const [wardAuditDialog, setWardAuditDialog] = useState(false);
  const [wardCodeInput, setWardCodeInput] = useState('');
  const [exportFormat, setExportFormat] = useState<'excel' | 'word' | 'pdf' | 'both'>('pdf');

  // File processing status modal state
  const [processingModalOpen, setProcessingModalOpen] = useState(false);
  const [processingWardCode, _setProcessingWardCode] = useState('');
  const [processingWardName, _setProcessingWardName] = useState('');
  const [_processingJobData, _setProcessingJobData] = useState<any>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch membership statuses for filtering
  const { data: membershipStatusesRaw } = useQuery({
    queryKey: ['membership-statuses'],
    queryFn: async () => {
      const result = await apiGet<MembershipStatus[]>('/lookups/membership-statuses');
      return result;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Extract data from API response
  const membershipStatuses = Array.isArray(membershipStatusesRaw)
    ? membershipStatusesRaw
    : (membershipStatusesRaw as any)?.data || [];

  // Create status name to ID mapping
  const statusNameToId = React.useMemo(() => {
    if (!membershipStatuses || !Array.isArray(membershipStatuses)) return {};
    const mapping: { [key: string]: number } = {};
    membershipStatuses.forEach(status => {
      mapping[status.status_name] = status.status_id;
    });
    return mapping;
  }, [membershipStatuses]);

  // Real API query using correct backend endpoints
  const { data: membersData, isLoading, error, refetch } = useQuery({
    queryKey: ['members', debouncedSearchTerm, filters, geographicFilters, page, rowsPerPage, sortBy, sortOrder, statusNameToId, municipalityContext.getMunicipalityFilter()],
    queryFn: async () => {
      let params = new URLSearchParams({
        page: (page + 1).toString(), // Backend expects 1-based pagination
        limit: rowsPerPage.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
        ...(debouncedSearchTerm && { q: debouncedSearchTerm }), // Backend uses 'q' for search
        ...(filters.membership_status && { membership_status: filters.membership_status }), // Membership status filter
      });

      // Apply municipality filtering for municipality admin users
      const municipalityFilteredParams = applyMunicipalityFilter(
        Object.fromEntries(params.entries()),
        municipalityContext
      );

      // Rebuild params with municipality filtering
      params = new URLSearchParams(municipalityFilteredParams);

      // Use geographic filtering with the enhanced main endpoint
      devLog('🔍 Geographic Filters Debug:', geographicFilters);

      if (geographicFilters.voting_district_code) {
        // Voting district is the most specific - use main endpoint with voting_district_code filter
        params.append('voting_district_code', geographicFilters.voting_district_code);
        devLog('🗳️ Using voting district filter:', geographicFilters.voting_district_code);
        return apiGet<PaginatedResponse<Member>>(`/members?${params.toString()}`);
      } else if (geographicFilters.ward) {
        // Ward is the most specific - use main endpoint with ward_code filter
        params.append('ward_code', geographicFilters.ward);
        devLog('📍 Using ward filter:', geographicFilters.ward);
        return apiGet<PaginatedResponse<Member>>(`/members?${params.toString()}`);
      } else if (geographicFilters.municipality) {
        // Municipality filtering - use main endpoint with municipality_code filter
        params.append('municipality_code', geographicFilters.municipality);
        devLog('📍 Using municipality filter:', geographicFilters.municipality);
        return apiGet<PaginatedResponse<Member>>(`/members?${params.toString()}`);
      } else if (geographicFilters.district) {
        // District filtering - use main endpoint with district_code filter
        params.append('district_code', geographicFilters.district);
        devLog('📍 Using district filter:', geographicFilters.district);
        return apiGet<PaginatedResponse<Member>>(`/members?${params.toString()}`);
      } else if (geographicFilters.province) {
        // Province filtering - use main endpoint with province_code filter (more consistent than separate endpoint)
        params.append('province_code', geographicFilters.province);
        devLog('📍 Using province filter:', geographicFilters.province);
        return apiGet<PaginatedResponse<Member>>(`/members?${params.toString()}`);
      }

      // Legacy province filter support
      if (filters.province) {
        const provinceCodeMap: { [key: string]: string } = {
          'Eastern Cape': 'EC', 'Free State': 'FS', 'Gauteng': 'GP',
          'KwaZulu-Natal': 'KZN', 'Limpopo': 'LP', 'Mpumalanga': 'MP',
          'Northern Cape': 'NC', 'North West': 'NW', 'Western Cape': 'WC'
        };
        const provinceCode = provinceCodeMap[filters.province];
        if (provinceCode) {
          return apiGet<PaginatedResponse<Member>>(`/members/province/${provinceCode}?${params.toString()}`);
        }
      }

      // Add other supported server-side filters for main endpoint
      // Status filtering removed since Status column was removed
      if (filters.membershipType) params.append('membership_type', filters.membershipType);
      // Note: hierarchyLevel is not mapped to ward_code as they are different concepts
      // hierarchyLevel represents organizational levels (Ward, Branch, Regional, etc.)
      // while ward_code represents specific geographic ward codes (e.g., "12345678")

      return apiGet<PaginatedResponse<Member>>(`/members?${params.toString()}`);
    },
  });

  const members = membersData?.data || [];
  const totalCount = membersData?.pagination?.total || 0;

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedMembers(members.map((member: Member) => member.member_id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (memberId: number) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      membershipType: '',
      hierarchyLevel: '',
      province: '',
      membership_status: '',
    });
    setPage(0); // Reset to first page when clearing filters
  };

  // Utility function to extract date of birth from South African ID number
  const extractDateOfBirthFromID = (idNumber: string): string | null => {
    if (!idNumber || idNumber.length !== 13) return null;

    // Check if ID number contains only digits
    if (!/^\d{13}$/.test(idNumber)) return null;

    try {
      const year = parseInt(idNumber.substring(0, 2));
      const month = parseInt(idNumber.substring(2, 4));
      const day = parseInt(idNumber.substring(4, 6));

      // Determine century (00-21 = 2000s, 22-99 = 1900s)
      const fullYear = year <= 21 ? 2000 + year : 1900 + year;

      // Validate date components
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;

      const date = new Date(fullYear, month - 1, day);

      // Check if the date is valid and not in the future
      const today = new Date();
      if (date.getFullYear() !== fullYear ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day ||
          date > today) {
        return null;
      }

      // Format as DD/MM/YYYY
      const formattedDay = day.toString().padStart(2, '0');
      const formattedMonth = month.toString().padStart(2, '0');
      return `${formattedDay}/${formattedMonth}/${fullYear}`;
    } catch (error) {
      return null;
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;

    try {
      // Parse DD/MM/YYYY format
      const parts = dateOfBirth.split('/');
      if (parts.length !== 3) return null;

      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);

      // Validate parsed values
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

      const birthDate = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age >= 0 ? age : null; // Ensure age is not negative
    } catch (error) {
      return null;
    }
  };

  // Debug function to test ID parsing and check member data (can be removed in production)
  React.useEffect(() => {
    // Test with a sample ID
    const testId = '8908310123456'; // 31/08/1989
    const extractedDOB = extractDateOfBirthFromID(testId);
    const calculatedAge = extractedDOB ? calculateAge(extractedDOB) : null;
    devLog('🧪 ID Parsing Test:', {
      testId,
      extractedDOB,
      calculatedAge
    });
  }, []);

  // Debug logging removed - backend now uses vw_membership_details which includes date_joined

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(0); // Reset to first page when sorting
  };

  const SortableTableCell: React.FC<{
    children: React.ReactNode;
    sortKey: string;
    align?: 'left' | 'right' | 'center';
  }> = ({ children, sortKey, align = 'left' }) => (
    <TableCell
      align={align}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { backgroundColor: 'action.hover' }
      }}
      onClick={() => handleSort(sortKey)}
    >
      <Box display="flex" alignItems="center" gap={1} justifyContent={align === 'right' ? 'flex-end' : 'flex-start'}>
        {children}
        {sortBy === sortKey && (
          sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
        )}
      </Box>
    </TableCell>
  );

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      let exportUrl = '/api/v1/members/export';

      // If province filter is applied, use the province-specific export endpoint
      if (filters.province) {
        const provinceCodeMap: { [key: string]: string } = {
          'Eastern Cape': 'EC',
          'Free State': 'FS',
          'Gauteng': 'GP',
          'KwaZulu-Natal': 'KZN',
          'Limpopo': 'LP',
          'Mpumalanga': 'MP',
          'Northern Cape': 'NC',
          'North West': 'NW',
          'Western Cape': 'WC'
        };

        const provinceCode = provinceCodeMap[filters.province];
        if (provinceCode) {
          exportUrl = `/api/v1/members/province/${provinceCode}/export`;
        }
      }

      const params = new URLSearchParams({
        format,
        ...(debouncedSearchTerm && { q: debouncedSearchTerm }),
        ...(filters.membershipType && { membership_type: filters.membershipType }),
        ...(filters.hierarchyLevel && { ward_code: filters.hierarchyLevel }),
        ...(selectedMembers.length > 0 && { ids: selectedMembers.join(',') }),
      });

      // This would trigger a download
      window.open(`${exportUrl}?${params.toString()}`, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleBulkAction = (action: string) => {
    setBulkAction(action);
    setBulkActionDialog(true);
  };

  const executeBulkAction = async () => {
    try {
      devLog(`Executing bulk action: ${bulkAction} on ${selectedMembers.length} members`);

      // Use real API endpoint
      await apiPost(`/members/bulk-action`, {
        action: bulkAction,
        memberIds: selectedMembers,
      });

      setBulkActionDialog(false);
      setSelectedMembers([]);
      refetch(); // Refresh the data

      devLog(`Bulk action ${bulkAction} completed successfully`);
    } catch (error) {
      console.error('Bulk action failed:', error);
      // Still close the dialog even if the action fails
      setBulkActionDialog(false);
    }
  };

  // Handle ward audit export (Attendance Register)
  const handleWardAuditExport = async (wardCode: string, format: 'excel' | 'word' | 'pdf' | 'both' = 'pdf') => {
    if (!wardCode) {
      setSnackbarMessage('Ward code is required for attendance register export');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setAuditExportLoading(true);
    setActionAnchorEl(null); // Close the action menu

    try {
      devLog(`📋 Starting Attendance Register export for ward: ${wardCode} (format: ${format})`);

      // Get the blob from the API
      const blob = await membersApi.exportWardAudit(wardCode, format);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      let extension: string;
      if (format === 'both') {
        extension = 'zip';
      } else if (format === 'excel') {
        extension = 'xlsx';
      } else if (format === 'pdf') {
        extension = 'pdf';
      } else {
        extension = 'docx';
      }
      const filename = `ATTENDANCE_REGISTER_WARD_${wardCode}_${timestamp}.${extension}`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      devLog(`✅ Attendance Register downloaded: ${filename}`);

      // Show success message
      setSnackbarMessage(
        `✅ Attendance Register for Ward ${wardCode} downloaded successfully!`
      );
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

    } catch (error: any) {
      console.error('❌ Attendance Register export failed:', error);

      let errorMessage = 'Failed to export Attendance Register';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setSnackbarMessage(`❌ ${errorMessage}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setAuditExportLoading(false);
    }
  };

  // Handle ward audit dialog
  const handleWardAuditDialogSubmit = () => {
    if (!wardCodeInput.trim()) {
      setSnackbarMessage('Please enter a ward code');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const wardCode = wardCodeInput.trim();
    setWardAuditDialog(false);
    setWardCodeInput(''); // Clear input after closing dialog
    handleWardAuditExport(wardCode, exportFormat);
  };

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Typography>Loading members...</Typography>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load members. Please try again.
        </Alert>
        <Button variant="contained" onClick={() => refetch()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <PageHeader
        title="Members Directory"
        subtitle={`Manage your organization's membership - ${totalCount} total members across all regions`}
        gradient={true}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Members' },
        ]}
        badge={{
          label: `${totalCount} Members`,
          color: 'primary',
        }}
        actions={
          <Box display="flex" gap={2}>
            <ActionButton
              icon={SupervisorAccount}
              onClick={() => navigate('/admin/users')}
              variant="outlined"
              color="secondary"
            >
              User Management
            </ActionButton>
            <ActionButton
              icon={Refresh}
              onClick={() => refetch()}
              variant="outlined"
              color="info"
            >
              Refresh
            </ActionButton>
            <ActionButton
              icon={PersonAdd}
              onClick={() => navigate('/admin/members/new')}
              gradient={true}
              vibrant={true}
            >
              Add Member
            </ActionButton>
          </Box>
        }
      />

      <Container maxWidth="xl" sx={{ pb: 4 }}>
        {/* Municipality Context Banner */}
        <MunicipalityContextBanner variant="banner" sx={{ mb: 3 }} />

        {/* Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Members"
              value={totalCount.toLocaleString()}
              subtitle="Active memberships"
              icon={People}
              color="primary"
              onClick={() => navigate('/admin/analytics')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Current Page"
              value={members.length.toString()}
              subtitle={`Page ${page + 1} of ${Math.ceil(totalCount / rowsPerPage)}`}
              icon={Analytics}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Selected"
              value={selectedMembers.length.toString()}
              subtitle="Members selected"
              icon={CheckCircle}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Filtered Results"
              value={totalCount.toLocaleString()}
              subtitle="Matching criteria"
              icon={FilterList}
              color="warning"
            />
          </Grid>
        </Grid>

      {/* Geographic Filter with Charts */}
      <GeographicFilter
        filters={geographicFilters}
        onFiltersChange={(newFilters) => {
          setGeographicFilters(newFilters);
          setPage(0); // Reset to first page when filtering
        }}
        membershipStatus={filters.membership_status}
      />

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />

            <ActionButton
              icon={FilterList}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => setFilterAnchorEl(e.currentTarget)}
              variant="outlined"
              color="secondary"
            >
              Filters
            </ActionButton>

            {(filters.membershipType || filters.hierarchyLevel || filters.province || filters.membership_status) && (
              <ActionButton
                onClick={clearFilters}
                variant="outlined"
                color="warning"
              >
                Clear Filters
              </ActionButton>
            )}

            <Box sx={{ flexGrow: 1 }} />

            <ActionButton
              icon={Download}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => setActionAnchorEl(e.currentTarget)}
              variant="outlined"
              color="info"
            >
              Export
            </ActionButton>

            {/* Ward Audit Export Button - only visible when ward is selected */}
            {geographicFilters.ward && (
              <ActionButton
                icon={Assessment}
                onClick={() => {
                  setWardCodeInput(geographicFilters.ward!); // Pre-populate with selected ward
                  setWardAuditDialog(true);
                }}
                variant="outlined"
                color="warning"
                disabled={auditExportLoading}
              >
                {auditExportLoading ? 'Downloading Attendance Register...' : `Download Ward ${geographicFilters.ward} Attendance Register`}
              </ActionButton>
            )}
          </Box>

          {/* Active Filters */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {filters.membershipType && (
              <Chip
                label={`Type: ${filters.membershipType}`}
                onDelete={() => handleFilterChange('membershipType', '')}
                size="small"
              />
            )}
            {filters.hierarchyLevel && (
              <Chip
                label={`Level: ${filters.hierarchyLevel}`}
                onDelete={() => handleFilterChange('hierarchyLevel', '')}
                size="small"
              />
            )}
            {filters.province && (
              <Chip
                label={`Province: ${filters.province}`}
                onDelete={() => handleFilterChange('province', '')}
                size="small"
              />
            )}
            {filters.membership_status && (
              <Chip
                label={`Status: ${filters.membership_status === 'all' ? 'All Members' :
                        filters.membership_status === 'active' ? 'Good Standing' :
                        filters.membership_status === 'expired' ? 'Expired' : filters.membership_status}`}
                onDelete={() => handleFilterChange('membership_status', '')}
                size="small"
                color="info"
              />
            )}
            {geographicFilters.voting_district_code && (
              <Chip
                label={`Voting District: ${geographicFilters.voting_district_code}`}
                onDelete={() => {
                  setGeographicFilters(prev => {
                    const newFilters = { ...prev };
                    delete newFilters.voting_district_code;
                    return newFilters;
                  });
                  setPage(0);
                }}
                size="small"
                color="primary"
                icon={<HowToVote />}
              />
            )}
            {geographicFilters.ward && (
              <Chip
                label={`Ward: ${geographicFilters.ward}`}
                onDelete={() => {
                  setGeographicFilters(prev => {
                    const newFilters = { ...prev };
                    delete newFilters.ward;
                    return newFilters;
                  });
                  setPage(0);
                }}
                size="small"
                color="secondary"
              />
            )}
            {geographicFilters.municipality && (
              <Chip
                label={`Municipality: ${geographicFilters.municipality}`}
                onDelete={() => {
                  setGeographicFilters(prev => {
                    const newFilters = { ...prev };
                    delete newFilters.municipality;
                    return newFilters;
                  });
                  setPage(0);
                }}
                size="small"
              />
            )}
            {geographicFilters.district && (
              <Chip
                label={`District: ${geographicFilters.district}`}
                onDelete={() => {
                  setGeographicFilters(prev => {
                    const newFilters = { ...prev };
                    delete newFilters.district;
                    return newFilters;
                  });
                  setPage(0);
                }}
                size="small"
              />
            )}
            {geographicFilters.province && (
              <Chip
                label={`Province: ${geographicFilters.province}`}
                onDelete={() => {
                  setGeographicFilters(prev => {
                    const newFilters = { ...prev };
                    delete newFilters.province;
                    return newFilters;
                  });
                  setPage(0);
                }}
                size="small"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      {selectedMembers.length > 0 && (
        <Paper sx={{ mb: 2 }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flex: '1 1 100%' }}>
              {selectedMembers.length} selected
            </Typography>
            <Tooltip title="Send Email">
              <IconButton onClick={() => handleBulkAction('email')}>
                <Email />
              </IconButton>
            </Tooltip>
            <Tooltip title="Send SMS">
              <IconButton onClick={() => handleBulkAction('sms')}>
                <Phone />
              </IconButton>
            </Tooltip>
            <Tooltip title="Update Status">
              <IconButton onClick={() => handleBulkAction('status')}>
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Selected">
              <IconButton onClick={() => handleBulkAction('export')}>
                <Download />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Paper>
      )}

      {/* Members Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedMembers.length > 0 && selectedMembers.length < members.length}
                    checked={members.length > 0 && selectedMembers.length === members.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <SortableTableCell sortKey="firstname">Member</SortableTableCell>
                <SortableTableCell sortKey="id_number">ID Number</SortableTableCell>
                <SortableTableCell sortKey="age">Age/DOB</SortableTableCell>
                <SortableTableCell sortKey="gender_name">Gender</SortableTableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Ward Code</TableCell>
                <SortableTableCell sortKey="created_at">Join Date</SortableTableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member: Member) => (
                  <TableRow
                    key={member.member_id}
                    hover
                    selected={selectedMembers.includes(member.member_id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedMembers.includes(member.member_id)}
                        onChange={() => handleSelectMember(member.member_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar>
                          {member.firstname[0]}{(member.surname || '')[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {member.firstname} {member.surname || ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.email || 'No email'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {member.id_number || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const dateOfBirth = extractDateOfBirthFromID(member.id_number || '');
                        const age = dateOfBirth ? calculateAge(dateOfBirth) : null;
                        return (
                          <Box>
                            {age !== null ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Person sx={{ fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body2" fontWeight="medium">
                                  {age} years
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Age: N/A
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <Cake sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {dateOfBirth || 'DOB: N/A'}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {member.gender_name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{member.email || 'N/A'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.cell_number || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {member.municipality_name}, {member.province_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {member.ward_code || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.ward_name || 'Ward name N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // Use date_joined from membership details, fallback to created_at
                        const joinDate = member.date_joined || member.created_at;

                        if (joinDate) {
                          try {
                            const date = new Date(joinDate);
                            // Check if the date is valid
                            if (isNaN(date.getTime())) {
                              devWarn('Invalid join date value:', joinDate, 'for member:', member.member_id);
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  Invalid Date
                                </Typography>
                              );
                            }

                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {date.toLocaleDateString('en-ZA', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                  })}
                                </Typography>
                              </Box>
                            );
                          } catch (error) {
                            console.error('Error parsing join date:', joinDate, 'for member:', member.member_id, error);
                            return (
                              <Typography variant="body2" color="text.secondary">
                                Invalid Date
                              </Typography>
                            );
                          }
                        }

                        // This should be very rare now
                        devLog('Missing join date for member:', member.member_id);

                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarToday sx={{ fontSize: 16, color: 'text.disabled' }} />
                            <Typography variant="body2" color="text.secondary">
                              No Join Date
                            </Typography>
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          setSelectedMemberId(member.member_id);
                          setActionAnchorEl(e.currentTarget);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_: unknown, newPage: number) => setPage(newPage)}
          onRowsPerPageChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
        PaperProps={{ sx: { width: 300, p: 2 } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Membership Type</InputLabel>
            <Select
              value={filters.membershipType}
              onChange={(e: any) => handleFilterChange('membershipType', e.target.value)}
              label="Membership Type"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Regular">Regular</MenuItem>
              <MenuItem value="Student">Student</MenuItem>
              <MenuItem value="Senior">Senior</MenuItem>
              <MenuItem value="Associate">Associate</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Hierarchy Level</InputLabel>
            <Select
              value={filters.hierarchyLevel}
              onChange={(e: any) => handleFilterChange('hierarchyLevel', e.target.value)}
              label="Hierarchy Level"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Ward">Ward</MenuItem>
              <MenuItem value="Branch">Branch</MenuItem>
              <MenuItem value="Regional">Regional</MenuItem>
              <MenuItem value="Provincial">Provincial</MenuItem>
              <MenuItem value="National">National</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Province</InputLabel>
            <Select
              value={filters.province}
              onChange={(e: any) => handleFilterChange('province', e.target.value)}
              label="Province"
            >
              <MenuItem value="">All Provinces</MenuItem>
              <MenuItem value="Eastern Cape">Eastern Cape</MenuItem>
              <MenuItem value="Free State">Free State</MenuItem>
              <MenuItem value="Gauteng">Gauteng</MenuItem>
              <MenuItem value="KwaZulu-Natal">KwaZulu-Natal</MenuItem>
              <MenuItem value="Limpopo">Limpopo</MenuItem>
              <MenuItem value="Mpumalanga">Mpumalanga</MenuItem>
              <MenuItem value="Northern Cape">Northern Cape</MenuItem>
              <MenuItem value="North West">North West</MenuItem>
              <MenuItem value="Western Cape">Western Cape</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Membership Status</InputLabel>
            <Select
              value={filters.membership_status}
              onChange={(e: any) => handleFilterChange('membership_status', e.target.value)}
              label="Membership Status"
            >
              <MenuItem value="">Active Only (default)</MenuItem>
              <MenuItem value="all">All Members</MenuItem>
              <MenuItem value="active">Good Standing</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Menu>

      {/* Action Menu */}
      <Menu
        anchorEl={actionAnchorEl}
        open={Boolean(actionAnchorEl)}
        onClose={() => setActionAnchorEl(null)}
      >
        {selectedMemberId ? (
          // Individual member actions
          <>
            <MenuItem onClick={() => navigate(`/admin/members/${selectedMemberId}`)}>
              <Edit sx={{ mr: 1 }} /> View/Edit
            </MenuItem>
            <MenuItem onClick={() => devLog('Send email')}>
              <Email sx={{ mr: 1 }} /> Send Email
            </MenuItem>
            <MenuItem onClick={() => devLog('Send SMS')}>
              <Phone sx={{ mr: 1 }} /> Send SMS
            </MenuItem>

            <MenuItem onClick={() => devLog('Delete member')} sx={{ color: 'error.main' }}>
              <Delete sx={{ mr: 1 }} /> Delete
            </MenuItem>
          </>
        ) : (
          // Export actions
          <>
            <MenuItem onClick={() => handleExport('csv')}>
              Export as CSV
            </MenuItem>
            <MenuItem onClick={() => handleExport('excel')}>
              Export as Excel
            </MenuItem>
            <MenuItem onClick={() => handleExport('pdf')}>
              Export as PDF
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialog} onClose={() => setBulkActionDialog(false)}>
        <DialogTitle>
          Bulk Action: {bulkAction}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This action will be applied to {selectedMembers.length} selected members.
          </Alert>
          <Typography>
            Are you sure you want to {bulkAction} the selected members?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionDialog(false)}>Cancel</Button>
          <Button onClick={executeBulkAction} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ward Attendance Register Dialog */}
      <Dialog open={wardAuditDialog} onClose={() => setWardAuditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment color="warning" />
            Download Ward Attendance Register
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            {geographicFilters.ward
              ? `Confirm the ward code below to download the Attendance Register for all members in this ward.`
              : `Enter a ward code to download the Attendance Register for all members in that ward.`
            }
          </Alert>
          <TextField
            autoFocus
            margin="dense"
            label="Ward Code"
            placeholder="e.g., 12345678 or 5-1"
            fullWidth
            variant="outlined"
            value={wardCodeInput}
            onChange={(e) => setWardCodeInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleWardAuditDialogSubmit();
              }
            }}
            helperText={geographicFilters.ward
              ? "Ward code from your current filter (you can modify if needed)"
              : "Enter the ward code for the Attendance Register"
            }
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'excel' | 'word' | 'pdf' | 'both')}
              label="Export Format"
            >
              <MenuItem value="pdf">PDF Attendance Register (Recommended)</MenuItem>
              <MenuItem value="excel">Excel Only (.xlsx)</MenuItem>
              <MenuItem value="word">Word Only (.docx)</MenuItem>
              <MenuItem value="both">Both (Excel + Word in ZIP)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setWardAuditDialog(false);
            setWardCodeInput(''); // Clear input when cancelled
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleWardAuditDialogSubmit}
            variant="contained"
            color="warning"
            disabled={auditExportLoading || !wardCodeInput.trim()}
            startIcon={<Assessment />}
          >
            {auditExportLoading ? 'Downloading...' : `Download Ward ${wardCodeInput} Attendance Register`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* File Processing Status Modal */}
      <FileProcessingStatusModal
        open={processingModalOpen}
        onClose={() => setProcessingModalOpen(false)}
        wardCode={processingWardCode}
        wardName={processingWardName}
        initialJobData={_processingJobData}
      />
      </Container>
    </Box>
  );
};

export default MembersListPage;
