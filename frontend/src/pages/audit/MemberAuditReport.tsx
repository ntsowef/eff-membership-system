import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Avatar,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Error,
  Warning,
  Info,
  CheckCircle,
  Download,
  Refresh,
  FilterList,
  Person,
  LocationOn,
  HowToVote,
  NavigateNext
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

interface MemberAuditResult {
  member_id: number;
  membership_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_status: string;
  is_active: boolean;
  ward_code: string;
  ward_name: string;
  voting_district_code?: string;
  voting_district_name?: string;
  residential_address?: string;
  issue_type: string;
  issue_description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AuditFilters {
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
  membership_status?: string;
  severity?: string;
  issue_type?: string;
}

const MemberAuditReport: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState<AuditFilters>({
    severity: searchParams.get('severity') || undefined,
    issue_type: searchParams.get('issue_type') || undefined
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch member audit data
  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['member-audit', page, rowsPerPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', (page + 1).toString());
      params.append('limit', rowsPerPage.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/audit/members?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const members: MemberAuditResult[] = auditData?.members || [];
  const pagination = auditData?.pagination || { total: 0, totalPages: 0 };
  const summary = auditData?.summary || {};

  const handleFilterChange = (field: keyof AuditFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
    setPage(0); // Reset to first page when filters change
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Error fontSize="small" />;
      case 'high': return <Warning fontSize="small" />;
      case 'medium': return <Info fontSize="small" />;
      case 'low': return <CheckCircle fontSize="small" />;
      default: return <Info fontSize="small" />;
    }
  };

  const getIssueTypeLabel = (issueType: string) => {
    switch (issueType) {
      case 'inactive_membership': return 'Inactive Membership';
      case 'no_voting_registration': return 'Not Registered to Vote';
      case 'incorrect_ward_assignment': return 'Incorrect Ward Assignment';
      case 'valid': return 'No Issues';
      default: return issueType;
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', 'members');
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
      link.download = `member_audit_${new Date().toISOString().split('T')[0]}.csv`;
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
          <Typography color="text.primary">Member Audit Report</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Member Audit Report
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Individual member status validation and issue identification
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
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{pagination.total?.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Members
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
                  <Avatar sx={{ bgcolor: theme.palette.error.main }}>
                    <Error />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{summary.total_issues?.toLocaleString() || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Issues
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
                    <Typography variant="h6">
                      {summary.severity_breakdown?.critical || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Critical Issues
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
                    <HowToVote />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {summary.severity_breakdown?.medium || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Voting Issues
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={filters.severity || ''}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                    label="Severity"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Issue Type</InputLabel>
                  <Select
                    value={filters.issue_type || ''}
                    onChange={(e) => handleFilterChange('issue_type', e.target.value)}
                    label="Issue Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="inactive_membership">Inactive Membership</MenuItem>
                    <MenuItem value="no_voting_registration">No Voting Registration</MenuItem>
                    <MenuItem value="incorrect_ward_assignment">Incorrect Ward Assignment</MenuItem>
                    <MenuItem value="valid">No Issues</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Province Code"
                  value={filters.province_code || ''}
                  onChange={(e) => handleFilterChange('province_code', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Municipality Code"
                  value={filters.municipality_code || ''}
                  onChange={(e) => handleFilterChange('municipality_code', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Ward Code"
                  value={filters.ward_code || ''}
                  onChange={(e) => handleFilterChange('ward_code', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Membership Status</InputLabel>
                  <Select
                    value={filters.membership_status || ''}
                    onChange={(e) => handleFilterChange('membership_status', e.target.value)}
                    label="Membership Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
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
                  <TableCell>Member</TableCell>
                  <TableCell>Membership Status</TableCell>
                  <TableCell>Ward</TableCell>
                  <TableCell>Voting District</TableCell>
                  <TableCell>Issue</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.member_id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {member.first_name} {member.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.membership_number}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {member.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.membership_status}
                        color={member.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{member.ward_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.ward_code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {member.voting_district_code ? (
                        <Box>
                          <Typography variant="body2">
                            {member.voting_district_name || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.voting_district_code}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not Registered
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {getIssueTypeLabel(member.issue_type)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.issue_description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getSeverityIcon(member.severity)}
                        label={member.severity.toUpperCase()}
                        color={getSeverityColor(member.severity) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => navigate(`/admin/members/${member.member_id}`)}
                      >
                        View Details
                      </Button>
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

export default MemberAuditReport;
