import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  useTheme,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Avatar,
  Breadcrumbs,
  Link,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Business,
  Warning,
  CheckCircle,
  Download,
  Refresh,
  FilterList,
  NavigateNext,
  Assessment
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import CascadingGeographicFilter from '../../components/common/CascadingGeographicFilter';

interface MunicipalityAuditSummary {
  municipality_code: string;
  municipality_name: string;
  province_code: string;
  province_name: string;
  total_wards: number;
  wards_meeting_threshold: number;
  threshold_compliance_percentage: number;
  total_members: number;
  total_registered_voters: number;
  wards_over_101_members: number;
  high_priority_issues: number;
  last_audit_date: string;
}

interface AuditFilters {
  province_code?: string;
  municipality_code?: string;
}

const MunicipalityAuditReport: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [showFilters, setShowFilters] = useState(true);

  // Fetch municipality audit data from ward-membership-audit API
  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['municipality-audit', page, rowsPerPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', (page + 1).toString());
      params.append('limit', rowsPerPage.toString());

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      // Use ward-membership-audit API which has real data
      const response = await api.get(`/audit/ward-membership/municipalities?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Map response from ward-membership-audit format to expected format
  const municipalitiesRaw = auditData?.data?.municipalities || [];
  const municipalities: MunicipalityAuditSummary[] = municipalitiesRaw.map((m: any) => ({
    municipality_code: m.municipality_code,
    municipality_name: m.municipality_name,
    province_code: m.province_code || '',
    province_name: m.province_name,
    total_wards: m.total_wards || 0,
    wards_meeting_threshold: m.compliant_wards || 0,
    threshold_compliance_percentage: m.compliance_percentage ?? 0,
    total_members: m.total_all_members || 0,
    total_registered_voters: 0,
    wards_over_101_members: m.good_standing_wards || 0,
    high_priority_issues: m.needs_improvement_wards || 0,
    last_audit_date: m.last_updated
  }));

  const paginationRaw = auditData?.data?.pagination || {};
  const pagination = {
    total: paginationRaw.total_records || 0,
    totalPages: paginationRaw.total_pages || 0
  };

  // Calculate summary from municipalities data
  const summary = {
    total_municipalities: pagination.total,
    municipalities_meeting_70_percent: municipalitiesRaw.filter((m: any) => m.compliance_percentage >= 70).length,
    municipalities_with_high_issues: municipalitiesRaw.filter((m: any) => m.needs_improvement_wards > 5).length,
    average_compliance_rate: municipalitiesRaw.length > 0
      ? municipalitiesRaw.reduce((sum: number, m: any) => sum + (m.compliance_percentage || 0), 0) / municipalitiesRaw.length
      : 0,
    total_members_audited: municipalitiesRaw.reduce((sum: number, m: any) => sum + (m.total_all_members || 0), 0)
  };

  const handleProvinceChange = (provinceCode: string) => {
    setFilters(prev => ({
      ...prev,
      province_code: provinceCode || undefined,
      municipality_code: undefined // Clear municipality when province changes
    }));
    setPage(0);
  };

  const handleMunicipalityChange = (municipalityCode: string) => {
    setFilters(prev => ({
      ...prev,
      municipality_code: municipalityCode || undefined
    }));
    setPage(0);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 70) return theme.palette.success.main;
    if (percentage >= 50) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getComplianceStatus = (percentage: number) => {
    if (percentage >= 70) return { label: 'Compliant', color: 'success' as const };
    if (percentage >= 50) return { label: 'Partial', color: 'warning' as const };
    return { label: 'Non-Compliant', color: 'error' as const };
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', 'municipalities');
      params.append('format', 'csv');
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get(`/audit/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `municipality_audit_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 2 }}>
          <Link
            color="inherit"
            href="#"
            onClick={() => navigate('/admin/audit')}
            sx={{ textDecoration: 'none' }}
          >
            Audit Dashboard
          </Link>
          <Typography color="text.primary">Municipality Audit Report</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Municipality Audit Report
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Municipality-level threshold monitoring and compliance analysis
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="Toggle Filters">
              <IconButton onClick={() => setShowFilters(!showFilters)}>
                <FilterList />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh Data">
              <IconButton onClick={() => refetch()}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    <Business />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{summary.total_municipalities?.toLocaleString() || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Municipalities
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{summary.municipalities_meeting_70_percent?.toLocaleString() || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Meeting 70% Threshold
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                    <Warning />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{summary.municipalities_with_high_issues?.toLocaleString() || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      High Priority Issues
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                    <Assessment />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{summary.average_compliance_rate || 0}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Compliance
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Compliance Alert */}
        {summary.average_compliance_rate < 70 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold">
              Average compliance rate is below 70% threshold
            </Typography>
            <Typography variant="body2">
              {summary.municipalities_meeting_70_percent || 0} out of {summary.total_municipalities || 0} municipalities 
              are meeting the 70% ward threshold requirement.
            </Typography>
          </Alert>
        )}

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Geographic Filters
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Filter municipality audit data by selecting a province and municipality. The municipality dropdown will populate based on your province selection.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <CascadingGeographicFilter
                  selectedProvince={filters.province_code}
                  selectedMunicipality={filters.municipality_code}
                  onProvinceChange={handleProvinceChange}
                  onMunicipalityChange={handleMunicipalityChange}
                  size="small"
                  fullWidth={false}
                />
              </Grid>
            </Grid>
            {(filters.province_code || filters.municipality_code) && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                  <Typography variant="body2" color="text.secondary" component="span">
                    <strong>Active Filters:</strong>
                  </Typography>
                  {filters.province_code && (
                    <Chip
                      label={`Province: ${filters.province_code}`}
                      size="small"
                      onDelete={() => handleProvinceChange('')}
                    />
                  )}
                  {filters.municipality_code && (
                    <Chip
                      label={`Municipality: ${filters.municipality_code}`}
                      size="small"
                      onDelete={() => handleMunicipalityChange('')}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        )}

        {/* Data Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Municipality</TableCell>
                  <TableCell>Province</TableCell>
                  <TableCell align="center">Total Wards</TableCell>
                  <TableCell align="center">Wards Meeting Threshold</TableCell>
                  <TableCell align="center">Compliance Rate</TableCell>
                  <TableCell align="center">Total Members</TableCell>
                  <TableCell align="center">Issues</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {municipalities.map((municipality) => {
                  const complianceStatus = getComplianceStatus(municipality.threshold_compliance_percentage);
                  
                  return (
                    <TableRow key={municipality.municipality_code} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {municipality.municipality_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {municipality.municipality_code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{municipality.province_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {municipality.province_code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold">
                          {municipality.total_wards.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {municipality.wards_meeting_threshold.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {municipality.wards_over_101_members} over 101
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                            <Chip
                              label={complianceStatus.label}
                              color={complianceStatus.color}
                              size="small"
                            />
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(municipality.threshold_compliance_percentage, 100)}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: theme.palette.grey[200],
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getComplianceColor(municipality.threshold_compliance_percentage)
                              }
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {municipality.threshold_compliance_percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {municipality.total_members.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {municipality.total_registered_voters.toLocaleString()} voters
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {municipality.high_priority_issues > 0 ? (
                          <Chip
                            label={municipality.high_priority_issues}
                            color="error"
                            size="small"
                            onClick={() => navigate(`/admin/audit/members?municipality_code=${municipality.municipality_code}`)}
                            clickable
                          />
                        ) : (
                          <Chip
                            label="None"
                            color="success"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            onClick={() => navigate(`/admin/audit/wards?municipality_code=${municipality.municipality_code}`)}
                          >
                            View Wards
                          </Button>
                          <Button
                            size="small"
                            onClick={() => navigate(`/admin/dashboard/hierarchical/municipality/${municipality.municipality_code}`)}
                          >
                            Dashboard
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={pagination.total || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </Paper>
      </Box>
    </Container>
  );
};

export default MunicipalityAuditReport;
