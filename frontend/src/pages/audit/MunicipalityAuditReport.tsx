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
  TextField,
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
  // LocationCity,
  // People,
  // TrendingUp,
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
}

const MunicipalityAuditReport: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Fetch municipality audit data
  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['municipality-audit', page, rowsPerPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', (page + 1).toString());
      params.append('limit', rowsPerPage.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/audit/municipalities?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const municipalities: MunicipalityAuditSummary[] = auditData?.municipalities || [];
  const pagination = auditData?.pagination || { total: 0, totalPages: 0 };
  const summary = auditData?.summary || {};

  const handleFilterChange = (field: keyof AuditFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
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
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Province Code"
                  value={filters.province_code || ''}
                  onChange={(e) => handleFilterChange('province_code', e.target.value)}
                  size="small"
                />
              </Grid>
            </Grid>
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
