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
  // TextField,
  IconButton,
  Tooltip,
  Avatar,
  Breadcrumbs,
  Link,
  LinearProgress
} from '@mui/material';
import {
  LocationCity,
  // People,
  // HowToVote,
  Warning,
  CheckCircle,
  Download,
  Refresh,
  FilterList,
  NavigateNext,
  TrendingUp,
  // TrendingDown
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import CascadingGeographicFilter from '../../components/common/CascadingGeographicFilter';

interface WardAuditSummary {
  ward_code: string;
  ward_name: string;
  municipality_code: string;
  municipality_name: string;
  total_members: number;
  active_members: number;
  registered_voters: number;
  unregistered_voters: number;
  incorrect_ward_assignments: number;
  membership_threshold_met: boolean;
  threshold_percentage: number;
  issues_count: number;
}

interface AuditFilters {
  province_code?: string;
  municipality_code?: string;
}

const WardAuditReport: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Fetch ward audit data
  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['ward-audit', page, rowsPerPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', (page + 1).toString());
      params.append('limit', rowsPerPage.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/audit/wards?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const wards: WardAuditSummary[] = auditData?.wards || [];
  const pagination = auditData?.pagination || { total: 0, totalPages: 0 };
  const summary = auditData?.summary || {};

  // const _handleFilterChange = (field: keyof AuditFilters, value: string) => {
  //   setFilters(prev => ({
  //     ...prev,
  //     [field]: value || undefined
  //   }));
  //   setPage(0);
  // };

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

  const getThresholdColor = (percentage: number) => {
    if (percentage >= 100) return theme.palette.success.main;
    if (percentage >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getThresholdIcon = (met: boolean) => {
    return met ? <CheckCircle color="success" /> : <Warning color="error" />;
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', 'wards');
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
      link.download = `ward_audit_${new Date().toISOString().split('T')[0]}.csv`;
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
          <Typography color="text.primary">Ward Audit Report</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Ward Audit Report
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Ward-level membership analysis and threshold monitoring
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
                    <LocationCity />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{summary.total_wards?.toLocaleString() || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Wards
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
                    <Typography variant="h6">{summary.wards_meeting_threshold?.toLocaleString() || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Meeting Threshold
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
                    <Typography variant="h6">{summary.wards_with_issues?.toLocaleString() || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Wards with Issues
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
                    <TrendingUp />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{summary.threshold_compliance_rate || 0}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Compliance Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Geographic Filters
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Filter ward audit data by selecting a province and municipality. The municipality dropdown will populate based on your province selection.
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
                  <TableCell>Ward</TableCell>
                  <TableCell>Municipality</TableCell>
                  <TableCell align="center">Total Members</TableCell>
                  <TableCell align="center">Active Members</TableCell>
                  <TableCell align="center">Registered Voters</TableCell>
                  <TableCell align="center">Threshold Progress</TableCell>
                  <TableCell align="center">Issues</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {wards.map((ward) => (
                  <TableRow key={ward.ward_code} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {ward.ward_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ward.ward_code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{ward.municipality_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ward.municipality_code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">
                        {ward.total_members.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2">
                          {ward.active_members.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round((ward.active_members / ward.total_members) * 100)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2">
                          {ward.registered_voters.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ward.unregistered_voters} unregistered
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          {getThresholdIcon(ward.membership_threshold_met)}
                          <Typography variant="body2" fontWeight="bold">
                            {ward.threshold_percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(ward.threshold_percentage, 100)}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: theme.palette.grey[200],
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getThresholdColor(ward.threshold_percentage)
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {ward.total_members}/101 members
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {ward.issues_count > 0 ? (
                        <Chip
                          label={ward.issues_count}
                          color="error"
                          size="small"
                          onClick={() => navigate(`/admin/audit/members?ward_code=${ward.ward_code}`)}
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
                          onClick={() => navigate(`/admin/audit/ward/${ward.ward_code}`)}
                        >
                          Details
                        </Button>
                        <Button
                          size="small"
                          onClick={() => navigate(`/admin/dashboard/hierarchical/ward/${ward.ward_code}`)}
                        >
                          Dashboard
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
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

export default WardAuditReport;
