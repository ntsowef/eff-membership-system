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
  Typography,
  Stack
} from '@mui/material';
import {
  Download,
  Refresh,
  FilterList,
  Search,
  Info,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useMunicipalityContext, applyMunicipalityFilter } from '../../hooks/useMunicipalityContext';
import { useSecureApi } from '../../hooks/useSecureApi';
import { wardMembershipAuditApi, downloadBlob, generateExportFilename } from '../../services/wardMembershipAuditApi';
import {
  useWardMembershipAuditStore,
  useMunicipalityFilters,
  useUpdateMunicipalityFilters,
  useToggleMunicipalitySelection,
  useSelectedMunicipalities,
  useSelectedProvince,
  useSetSelectedProvince
} from '../../store/wardMembershipAuditStore';
import { MUNICIPALITY_PERFORMANCE_COLORS } from '../../types/wardMembershipAudit';
import type { MunicipalityPerformance } from '../../types/wardMembershipAudit';
import MunicipalityDetailsModal from './MunicipalityDetailsModal';
import ProvinceFilter from './ProvinceFilter';

interface MunicipalityPerformanceTableProps {
  onExportSuccess: () => void;
  onExportError: (error: string) => void;
  onShowMessage: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const MunicipalityPerformanceTable: React.FC<MunicipalityPerformanceTableProps> = ({
  onExportSuccess,
  onExportError
}) => {
  const {
    municipalityPerformanceData,
    municipalityPagination,
    setMunicipalityPerformanceData,
    setMunicipalityPagination,
    setMunicipalityDataLoading,
    setMunicipalityDataError,
    municipalityDataLoading,
    municipalityDataError
  } = useWardMembershipAuditStore();

  const municipalityFilters = useMunicipalityFilters();
  const updateMunicipalityFilters = useUpdateMunicipalityFilters();
  const toggleMunicipalitySelection = useToggleMunicipalitySelection();
  const selectedMunicipalities = useSelectedMunicipalities();

  // Geographic filters
  const selectedProvince = useSelectedProvince();
  const setSelectedProvince = useSetSelectedProvince();

  useProvinceContext();
  const municipalityContext = useMunicipalityContext();
  const { secureGet, getProvinceFilter } = useSecureApi();

  const [searchTerm, setSearchTerm] = useState(municipalityFilters.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMunicipalityForDetails, setSelectedMunicipalityForDetails] = useState<{ code: string; name: string } | null>(null);

  // Fetch municipality performance data with province and municipality filtering
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['municipality-performance-data', municipalityFilters, selectedProvince, getProvinceFilter(), municipalityContext.getMunicipalityFilter()],
    queryFn: async () => {
      let params = {
        ...municipalityFilters,
        // Use selected province filter first, then fall back to user's province context
        ...(selectedProvince && { province_code: selectedProvince }),
        ...(!selectedProvince && getProvinceFilter() && { province_code: getProvinceFilter() })
      };

      // Apply municipality filtering for municipality admin
      params = applyMunicipalityFilter(params, municipalityContext);

      return secureGet('/audit/ward-membership/municipalities', params);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Update store when data changes - split into separate effects to avoid infinite loops
  useEffect(() => {
    setMunicipalityDataLoading(isLoading);
  }, [isLoading, setMunicipalityDataLoading]);

  useEffect(() => {
    if (error) {
      setMunicipalityDataError(error.message || 'Failed to fetch municipality performance data');
    } else {
      setMunicipalityDataError(null);
    }
  }, [error, setMunicipalityDataError]);

  useEffect(() => {
    if (data) {
      setMunicipalityPerformanceData(data.municipalities);
      setMunicipalityPagination(data.pagination);
    }
  }, [data, setMunicipalityPerformanceData, setMunicipalityPagination]);

  // Handle pagination edge case in a separate effect to avoid infinite loops
  useEffect(() => {
    if (data?.pagination && data.pagination.current_page > data.pagination.total_pages && data.pagination.total_pages > 0) {
      updateMunicipalityFilters({ page: 1 });
    }
  }, [data?.pagination?.current_page, data?.pagination?.total_pages]); // Removed updateMunicipalityFilters from dependencies

  const handlePageChange = (_event: unknown, newPage: number) => {
    updateMunicipalityFilters({ page: newPage + 1 });
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateMunicipalityFilters({ 
      limit: parseInt(event.target.value, 10),
      page: 1 
    });
  };

  const handleSortChange = (column: string) => {
    const isCurrentColumn = municipalityFilters.sort_by === column;
    const newOrder = isCurrentColumn && municipalityFilters.sort_order === 'desc' ? 'asc' : 'desc';
    
    updateMunicipalityFilters({
      sort_by: column as any,
      sort_order: newOrder,
      page: 1
    });
  };

  const handleFilterChange = (field: string, value: any) => {
    updateMunicipalityFilters({
      [field]: value === 'all' ? undefined : value,
      page: 1
    });
  };

  const handleSearchSubmit = () => {
    updateMunicipalityFilters({
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
      municipalityPerformanceData.forEach(municipality => {
        if (!selectedMunicipalities.includes(municipality.municipality_code)) {
          toggleMunicipalitySelection(municipality.municipality_code);
        }
      });
    } else {
      municipalityPerformanceData.forEach(municipality => {
        if (selectedMunicipalities.includes(municipality.municipality_code)) {
          toggleMunicipalitySelection(municipality.municipality_code);
        }
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await wardMembershipAuditApi.exportMunicipalityPerformanceExcel(municipalityFilters);
      const filename = generateExportFilename('municipality-performance', 'excel');
      downloadBlob(blob, filename);
      onExportSuccess();
    } catch (error: any) {
      onExportError(error.message || 'Export failed');
    }
  };

  const handleViewMunicipalityDetails = (municipalityCode: string, municipalityName: string) => {
    setSelectedMunicipalityForDetails({ code: municipalityCode, name: municipalityName });
  };

  const handleCloseMunicipalityDetails = () => {
    setSelectedMunicipalityForDetails(null);
  };

  const getPerformanceColor = (performance: MunicipalityPerformance) => {
    return MUNICIPALITY_PERFORMANCE_COLORS[performance] as 'success' | 'error';
  };

  const getComplianceColor = (percentage: number | null) => {
    if (percentage === null || percentage === undefined) return 'error';
    if (percentage >= 70) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  if (municipalityDataError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {municipalityDataError}
        <Button onClick={() => refetch()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const isAllSelected = municipalityPerformanceData.length > 0 &&
    municipalityPerformanceData.every(municipality => selectedMunicipalities.includes(municipality.municipality_code));
  const isIndeterminate = selectedMunicipalities.length > 0 && !isAllSelected;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header and Controls */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Municipality Performance
            {municipalityPagination && (
              <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                ({municipalityPagination.total_records.toLocaleString()} municipalities)
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
              onClick={handleExportExcel}
              disabled={municipalityDataLoading}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => refetch()}
              disabled={municipalityDataLoading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              {/* Province Filter - Only show for National Admin users */}
              <Grid item xs={12} sm={6} md={4}>
                <ProvinceFilter
                  selectedProvince={selectedProvince}
                  onProvinceChange={setSelectedProvince}
                  label="Filter by Province"
                  showAllOption={true}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Search municipalities"
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
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Performance</InputLabel>
                  <Select
                    value={municipalityFilters.performance || 'all'}
                    label="Performance"
                    onChange={(e) => handleFilterChange('performance', e.target.value)}
                  >
                    <MenuItem value="all">All Performance Levels</MenuItem>
                    <MenuItem value="Performing Municipality">Performing</MenuItem>
                    <MenuItem value="Underperforming Municipality">Underperforming</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Province</InputLabel>
                  <Select
                    value={municipalityFilters.province_code || 'all'}
                    label="Province"
                    onChange={(e) => handleFilterChange('province_code', e.target.value)}
                  >
                    <MenuItem value="all">All Provinces</MenuItem>
                    {/* TODO: Add province options from API */}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Selection Info */}
        {selectedMunicipalities.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {selectedMunicipalities.length} municipalit{selectedMunicipalities.length !== 1 ? 'ies' : 'y'} selected
          </Alert>
        )}
      </Box>

      {/* Loading Progress */}
      {municipalityDataLoading && (
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
                  active={municipalityFilters.sort_by === 'municipality_name'}
                  direction={municipalityFilters.sort_by === 'municipality_name' ? municipalityFilters.sort_order : 'asc'}
                  onClick={() => handleSortChange('municipality_name')}
                >
                  Municipality
                </TableSortLabel>
              </TableCell>
              <TableCell>District</TableCell>
              <TableCell>Province</TableCell>
              <TableCell align="center">Ward Breakdown</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={municipalityFilters.sort_by === 'compliance_percentage'}
                  direction={municipalityFilters.sort_by === 'compliance_percentage' ? municipalityFilters.sort_order : 'asc'}
                  onClick={() => handleSortChange('compliance_percentage')}
                >
                  Compliance
                </TableSortLabel>
              </TableCell>
              <TableCell>Performance</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={municipalityFilters.sort_by === 'total_active_members'}
                  direction={municipalityFilters.sort_by === 'total_active_members' ? municipalityFilters.sort_order : 'asc'}
                  onClick={() => handleSortChange('total_active_members')}
                >
                  Active Members
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Action Required</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {municipalityPerformanceData.map((municipality) => (
              <TableRow
                key={municipality.municipality_code}
                selected={selectedMunicipalities.includes(municipality.municipality_code)}
                hover
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedMunicipalities.includes(municipality.municipality_code)}
                    onChange={() => toggleMunicipalitySelection(municipality.municipality_code)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {municipality.municipality_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {municipality.municipality_code}
                  </Typography>
                </TableCell>
                <TableCell>{municipality.district_name}</TableCell>
                <TableCell>{municipality.province_name}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Chip
                      label={`${municipality.good_standing_wards}G`}
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${municipality.acceptable_standing_wards}A`}
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${municipality.needs_improvement_wards}N`}
                      color="error"
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {municipality.total_wards} total wards
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                    <LinearProgress
                      variant="determinate"
                      value={municipality.compliance_percentage || 0}
                      sx={{ width: 80, height: 8, borderRadius: 4 }}
                      color={getComplianceColor(municipality.compliance_percentage)}
                    />
                    <Typography variant="body2" fontWeight="medium">
                      {municipality.compliance_percentage?.toFixed(1) || '0.0'}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {municipality.compliant_wards} of {municipality.total_wards} compliant
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={municipality.municipality_performance}
                    color={getPerformanceColor(municipality.municipality_performance)}
                    size="small"
                    icon={municipality.municipality_performance === 'Performing Municipality' ?
                      <TrendingUp /> : <TrendingDown />}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium">
                    {municipality.total_active_members?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg: {municipality.avg_active_per_ward?.toFixed(1) || '0.0'} per ward
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {(municipality.wards_needed_compliance || 0) > 0 ? (
                    <Chip
                      label={`${municipality.wards_needed_compliance || 0} wards needed`}
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Compliant"
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
                      onClick={() => handleViewMunicipalityDetails(municipality.municipality_code, municipality.municipality_name)}
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
      {municipalityPagination && (
        <TablePagination
          component="div"
          count={municipalityPagination.total_records}
          page={Math.max(0, Math.min(municipalityPagination.current_page - 1, municipalityPagination.total_pages - 1))}
          onPageChange={handlePageChange}
          rowsPerPage={municipalityPagination.records_per_page}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      )}

      {/* Municipality Details Modal */}
      {selectedMunicipalityForDetails && (
        <MunicipalityDetailsModal
          open={!!selectedMunicipalityForDetails}
          onClose={handleCloseMunicipalityDetails}
          municipalityCode={selectedMunicipalityForDetails.code}
          municipalityName={selectedMunicipalityForDetails.name}
        />
      )}
    </Box>
  );
};

export default MunicipalityPerformanceTable;
