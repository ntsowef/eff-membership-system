import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  Container,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assessment,
  Warning,
  CheckCircle,
  Error,
  Info,
  Download,
  Refresh,
  FilterList,
  People,
  LocationCity,
  Business,
  HowToVote
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

interface AuditOverview {
  total_members: number;
  active_members: number;
  inactive_members: number;
  registered_voters: number;
  unregistered_voters: number;
  incorrect_ward_assignments: number;
  wards_meeting_threshold: number;
  total_wards: number;
  municipalities_compliant: number;
  total_municipalities: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
}

interface AuditFilters {
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
  membership_status?: string;
}

const MemberAuditDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Fetch audit overview
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['audit-overview', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.province_code) params.append('province_code', filters.province_code);
      if (filters.municipality_code) params.append('municipality_code', filters.municipality_code);
      
      const response = await api.get(`/audit/overview?${params.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const overview: AuditOverview = overviewData?.overview || {
    total_members: 0,
    active_members: 0,
    inactive_members: 0,
    registered_voters: 0,
    unregistered_voters: 0,
    incorrect_ward_assignments: 0,
    wards_meeting_threshold: 0,
    total_wards: 0,
    municipalities_compliant: 0,
    total_municipalities: 0,
    critical_issues: 0,
    high_issues: 0,
    medium_issues: 0,
    low_issues: 0
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFilterChange = (field: keyof AuditFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const handleExport = async (type: 'members' | 'wards' | 'municipalities', format: 'json' | 'csv' = 'csv') => {
    try {
      const params = new URLSearchParams();
      params.append('type', type);
      params.append('format', format);
      if (filters.province_code) params.append('province_code', filters.province_code);
      if (filters.municipality_code) params.append('municipality_code', filters.municipality_code);
      if (filters.ward_code) params.append('ward_code', filters.ward_code);
      if (filters.membership_status) params.append('membership_status', filters.membership_status);

      const response = await api.get(`/audit/export?${params.toString()}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_audit_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_audit_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    onClick?: () => void;
  }> = ({ title, value, icon, color, subtitle, onClick }) => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { elevation: 4 } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight="bold" color={color}>
              {value.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const IssuesSummaryCard: React.FC = () => {
    const totalIssues = overview.critical_issues + overview.high_issues + overview.medium_issues + overview.low_issues;
    
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Issues Summary
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Error color="error" fontSize="small" />
                <Typography variant="body2">Critical Issues</Typography>
              </Box>
              <Chip 
                label={overview.critical_issues} 
                color="error" 
                size="small"
                onClick={() => navigate('/admin/audit/members?severity=critical')}
                clickable
              />
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Warning color="warning" fontSize="small" />
                <Typography variant="body2">High Priority</Typography>
              </Box>
              <Chip 
                label={overview.high_issues} 
                color="warning" 
                size="small"
                onClick={() => navigate('/admin/audit/members?severity=high')}
                clickable
              />
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Info color="info" fontSize="small" />
                <Typography variant="body2">Medium Priority</Typography>
              </Box>
              <Chip 
                label={overview.medium_issues} 
                color="info" 
                size="small"
                onClick={() => navigate('/admin/audit/members?severity=medium')}
                clickable
              />
            </Box>
            <Box mt={2} pt={2} borderTop={1} borderColor="divider">
              <Typography variant="body2" fontWeight="bold">
                Total Issues: {totalIssues.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (overviewLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Member Audit System
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive validation and monitoring of member data integrity
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="Toggle Filters">
              <IconButton onClick={() => setShowFilters(!showFilters)}>
                <FilterList />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh Data">
              <IconButton onClick={() => refetchOverview()}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExport('members', 'csv')}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Province Code"
                  value={filters.province_code || ''}
                  onChange={(e) => handleFilterChange('province_code', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Municipality Code"
                  value={filters.municipality_code || ''}
                  onChange={(e) => handleFilterChange('municipality_code', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Ward Code"
                  value={filters.ward_code || ''}
                  onChange={(e) => handleFilterChange('ward_code', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
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

        {/* Overview Statistics */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Members"
              value={overview.total_members}
              icon={<People />}
              color={theme.palette.primary.main}
              subtitle={`${overview.active_members} active`}
              onClick={() => navigate('/admin/audit/members')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Registered Voters"
              value={overview.registered_voters}
              icon={<HowToVote />}
              color={theme.palette.success.main}
              subtitle={`${overview.unregistered_voters} unregistered`}
              onClick={() => navigate('/admin/audit/members?issue_type=no_voting_registration')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Wards Meeting Threshold"
              value={overview.wards_meeting_threshold}
              icon={<LocationCity />}
              color={theme.palette.info.main}
              subtitle={`${Math.round((overview.wards_meeting_threshold / overview.total_wards) * 100)}% compliance`}
              onClick={() => navigate('/admin/audit/wards')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Compliant Municipalities"
              value={overview.municipalities_compliant}
              icon={<Business />}
              color={theme.palette.warning.main}
              subtitle={`${Math.round((overview.municipalities_compliant / overview.total_municipalities) * 100)}% meeting 70%`}
              onClick={() => navigate('/admin/audit/municipalities')}
            />
          </Grid>
        </Grid>

        {/* Issues Summary */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <IssuesSummaryCard />
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={() => navigate('/admin/audit/members')}
                    fullWidth
                  >
                    View Member Audit Report
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LocationCity />}
                    onClick={() => navigate('/admin/audit/wards')}
                    fullWidth
                  >
                    Ward Analysis Report
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Business />}
                    onClick={() => navigate('/admin/audit/municipalities')}
                    fullWidth
                  >
                    Municipality Threshold Report
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => handleExport('members', 'csv')}
                    fullWidth
                  >
                    Export All Data
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alert for Critical Issues */}
        {overview.critical_issues > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold">
              {overview.critical_issues} critical issues require immediate attention!
            </Typography>
            <Typography variant="body2">
              These include members assigned to incorrect wards and other high-priority data integrity issues.
            </Typography>
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/admin/audit/members?severity=critical')}
              sx={{ mt: 1 }}
            >
              View Critical Issues
            </Button>
          </Alert>
        )}
      </Box>
    </Container>
  );
};

export default MemberAuditDashboard;
