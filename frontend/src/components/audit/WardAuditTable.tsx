import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
  LinearProgress,
  Alert,
  Grid,
  Typography
} from '@mui/material';
import {
  Download,
  Refresh,
  FilterList,
  Search,
  Info
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useMunicipalityContext, applyMunicipalityFilter } from '../../hooks/useMunicipalityContext';
import { useSecureApi } from '../../hooks/useSecureApi';
import { wardMembershipAuditApi, downloadBlob, generateExportFilename } from '../../services/wardMembershipAuditApi';
import {
  useWardMembershipAuditStore,
  useWardFilters,
  useUpdateWardFilters,
  useToggleWardSelection,
  useSelectedWards,
  useSelectedProvince,
  useSelectedMunicipality,
  useSetSelectedProvince,
  useSetSelectedMunicipality
} from '../../store/wardMembershipAuditStore';
import { WARD_STANDING_COLORS } from '../../types/wardMembershipAudit';
import type { WardStanding } from '../../types/wardMembershipAudit';
import WardDetailsModal from './WardDetailsModal';
import ProvinceFilter from './ProvinceFilter';
import MunicipalityFilter from './MunicipalityFilter';
import { devLog } from '../../utils/logger';

interface WardAuditTableProps {
  onExportSuccess: () => void;
  onExportError: (error: string) => void;
  onShowMessage: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const WardAuditTable: React.FC<WardAuditTableProps> = ({
  onExportSuccess,
  onExportError
}) => {
  const {
    wardAuditData,
    wardPagination,
    setWardAuditData,
    setWardPagination,
    setWardDataLoading,
    setWardDataError,
    wardDataLoading,
    wardDataError
  } = useWardMembershipAuditStore();

  const wardFilters = useWardFilters();
  const updateWardFilters = useUpdateWardFilters();
  const toggleWardSelection = useToggleWardSelection();
  const selectedWards = useSelectedWards();

  // Geographic filters
  const selectedProvince = useSelectedProvince();
  const selectedMunicipality = useSelectedMunicipality();
  const setSelectedProvince = useSetSelectedProvince();
  const setSelectedMunicipality = useSetSelectedMunicipality();

  useProvinceContext();
  const municipalityContext = useMunicipalityContext();
  const { secureGet, getProvinceFilter } = useSecureApi();

  const [searchTerm, setSearchTerm] = useState(wardFilters.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWardForDetails, setSelectedWardForDetails] = useState<{ code: string; name: string } | null>(null);

  // Fetch ward audit data with province and municipality filtering
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ward-audit-data', wardFilters, selectedProvince, selectedMunicipality, getProvinceFilter(), municipalityContext.getMunicipalityFilter()],
    queryFn: async () => {
      let params = {
        ...wardFilters,
        // Use selected province filter first, then fall back to user's province context
        ...(selectedProvince && { province_code: selectedProvince }),
        ...(!selectedProvince && getProvinceFilter() && { province_code: getProvinceFilter() }),
        // Use selected municipality filter
        ...(selectedMunicipality && { municipality_code: selectedMunicipality })
      };

      // Apply municipality filtering for municipality admin (this will override the selected filters for municipal admins)
      params = applyMunicipalityFilter(params, municipalityContext);

      return secureGet('/audit/ward-membership/wards', params);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Update store when data changes - split into separate effects to avoid infinite loops
  useEffect(() => {
    setWardDataLoading(isLoading);
  }, [isLoading, setWardDataLoading]);

  useEffect(() => {
    if (error) {
      setWardDataError(error.message || 'Failed to fetch ward audit data');
    } else {
      setWardDataError(null);
    }
  }, [error, setWardDataError]);

  useEffect(() => {
    if (data) {
      setWardAuditData(data.wards);
      setWardPagination(data.pagination);
    }
  }, [data, setWardAuditData, setWardPagination]);

  // Handle pagination edge case in a separate effect to avoid infinite loops
  useEffect(() => {
    if (data?.pagination && data.pagination.current_page > data.pagination.total_pages && data.pagination.total_pages > 0) {
      updateWardFilters({ page: 1 });
    }
  }, [data?.pagination?.current_page, data?.pagination?.total_pages]); // Removed updateWardFilters from dependencies

  const handlePageChange = (_event: unknown, newPage: number) => {
    updateWardFilters({ page: newPage + 1 });
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateWardFilters({ 
      limit: parseInt(event.target.value, 10),
      page: 1 
    });
  };

  const handleSortChange = (column: string) => {
    const isCurrentColumn = wardFilters.sort_by === column;
    const newOrder = isCurrentColumn && wardFilters.sort_order === 'desc' ? 'asc' : 'desc';
    
    updateWardFilters({
      sort_by: column as any,
      sort_order: newOrder,
      page: 1
    });
  };

  const handleFilterChange = (field: string, value: any) => {
    updateWardFilters({
      [field]: value === 'all' ? undefined : value,
      page: 1
    });
  };

  const handleSearchSubmit = () => {
    updateWardFilters({
      search: searchTerm || undefined,
      page: 1
    });
  };

  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      wardAuditData.forEach(ward => {
        if (!selectedWards.includes(ward.ward_code)) {
          toggleWardSelection(ward.ward_code);
        }
      });
    } else {
      wardAuditData.forEach(ward => {
        if (selectedWards.includes(ward.ward_code)) {
          toggleWardSelection(ward.ward_code);
        }
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      devLog('🔄 Starting PDF export with filters:', wardFilters);
      const blob = await wardMembershipAuditApi.exportWardAuditPDF(wardFilters);
      const filename = generateExportFilename('ward-audit', 'pdf');
      downloadBlob(blob, filename);
      onExportSuccess();
    } catch (error: any) {
      console.error('❌ Export failed:', error);

      // Check if it's an authentication error
      if (error.response?.status === 401) {
        onExportError('Authentication failed. Please log out and log back in, then try again.');
      } else {
        onExportError(error.message || 'Export failed');
      }
    }
  };

  const handleViewWardDetails = (wardCode: string, wardName: string) => {
    setSelectedWardForDetails({ code: wardCode, name: wardName });
  };

  const handleCloseWardDetails = () => {
    setSelectedWardForDetails(null);
  };

  const getStandingColor = (standing: WardStanding) => {
    return WARD_STANDING_COLORS[standing] as 'success' | 'warning' | 'error';
  };

  const getTargetAchievementColor = (percentage: number) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  if (wardDataError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {wardDataError}
        <Button onClick={() => refetch()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const isAllSelected = wardAuditData.length > 0 && wardAuditData.every(ward => selectedWards.includes(ward.ward_code));
  const isIndeterminate = selectedWards.length > 0 && !isAllSelected;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header and Controls */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Ward Audit Data
            {wardPagination && (
              <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                ({wardPagination.total_records.toLocaleString()} wards)
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportPDF}
              disabled={wardDataLoading}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => refetch()}
              disabled={wardDataLoading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              {/* Province Filter - Only show for National Admin and Provincial Admin users */}
              <Grid item xs={12} sm={6} md={3}>
                <ProvinceFilter
                  selectedProvince={selectedProvince}
                  onProvinceChange={setSelectedProvince}
                  label="Filter by Province"
                  showAllOption={true}
                  size="small"
                />
              </Grid>
              {/* Municipality Filter - Only show for National Admin and Provincial Admin users */}
              <Grid item xs={12} sm={6} md={3}>
                <MunicipalityFilter
                  selectedProvince={selectedProvince}
                  selectedMunicipality={selectedMunicipality}
                  onMunicipalityChange={setSelectedMunicipality}
                  label="Filter by Municipality"
                  showAllOption={true}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search wards"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={handleSearchSubmit}>
                        <Search />
                      </IconButton>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Standing</InputLabel>
                  <Select
                    value={wardFilters.standing || 'all'}
                    label="Standing"
                    onChange={(e) => handleFilterChange('standing', e.target.value)}
                  >
                    <MenuItem value="all">All Standings</MenuItem>
                    <MenuItem value="Good Standing">Good Standing</MenuItem>
                    <MenuItem value="Acceptable Standing">Acceptable Standing</MenuItem>
                    <MenuItem value="Needs Improvement">Needs Improvement</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {/* Removed old municipality and province filters - now using dedicated filter components above */}
            </Grid>
          </Paper>
        )}

        {/* Selection Info */}
        {selectedWards.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {selectedWards.length} ward{selectedWards.length !== 1 ? 's' : ''} selected
          </Alert>
        )}
      </Box>

      {/* Loading Progress */}
      {wardDataLoading && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={wardFilters.sort_by === 'ward_name'}
                  direction={wardFilters.sort_by === 'ward_name' ? wardFilters.sort_order : 'asc'}
                  onClick={() => handleSortChange('ward_name')}
                >
                  Ward
                </TableSortLabel>
              </TableCell>
              <TableCell>Municipality</TableCell>
              <TableCell>Province</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={wardFilters.sort_by === 'active_members'}
                  direction={wardFilters.sort_by === 'active_members' ? wardFilters.sort_order : 'asc'}
                  onClick={() => handleSortChange('active_members')}
                >
                  Active Members
                </TableSortLabel>
              </TableCell>
              <TableCell>Standing</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={wardFilters.sort_by === 'target_achievement_percentage'}
                  direction={wardFilters.sort_by === 'target_achievement_percentage' ? wardFilters.sort_order : 'asc'}
                  onClick={() => handleSortChange('target_achievement_percentage')}
                >
                  Target Achievement
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Members Needed</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wardAuditData.map((ward) => (
              <TableRow
                key={ward.ward_code}
                selected={selectedWards.includes(ward.ward_code)}
                hover
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedWards.includes(ward.ward_code)}
                    onChange={() => toggleWardSelection(ward.ward_code)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {ward.ward_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ward.ward_code}
                  </Typography>
                </TableCell>
                <TableCell>{ward.municipality_name}</TableCell>
                <TableCell>{ward.province_name}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium">
                    {ward.active_members.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    of {ward.total_members.toLocaleString()} total
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={ward.ward_standing}
                    color={getStandingColor(ward.ward_standing)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(ward.target_achievement_percentage, 100)}
                      sx={{ width: 60, height: 6, borderRadius: 3 }}
                      color={getTargetAchievementColor(ward.target_achievement_percentage)}
                    />
                    <Typography variant="body2">
                      {ward.target_achievement_percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {ward.members_needed_next_level > 0 ? (
                    <Chip
                      label={`+${ward.members_needed_next_level}`}
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Target Met"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewWardDetails(ward.ward_code, ward.ward_name)}
                    >
                      <Info />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {wardPagination && (
        <TablePagination
          component="div"
          count={wardPagination.total_records}
          page={Math.max(0, Math.min(wardPagination.current_page - 1, wardPagination.total_pages - 1))}
          onPageChange={handlePageChange}
          rowsPerPage={wardPagination.records_per_page}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      )}

      {/* Ward Details Modal */}
      {selectedWardForDetails && (
        <WardDetailsModal
          open={!!selectedWardForDetails}
          onClose={handleCloseWardDetails}
          wardCode={selectedWardForDetails.code}
          wardName={selectedWardForDetails.name}
        />
      )}
    </Box>
  );
};

export default WardAuditTable;
