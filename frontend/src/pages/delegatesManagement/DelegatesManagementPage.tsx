import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Button,
  Paper,
} from '@mui/material';
import {
  Groups as GroupsIcon,
  Assessment as AssessmentIcon,
  Event as EventIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { delegatesManagementApi } from '../../services/delegatesManagementApi';
import { geographicApi } from '../../services/api';
import DelegatesOverviewTab from './DelegatesOverviewTab';
import DelegatesSummaryTab from './DelegatesSummaryTab';
import ConferenceDelegatesTab from './ConferenceDelegatesTab';
import DelegatesAuditTrailTab from './DelegatesAuditTrailTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`delegates-tabpanel-${index}`}
      aria-labelledby={`delegates-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const DelegatesManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [assemblyFilter, setAssemblyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');

  // Fetch statistics
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['delegate-statistics'],
    queryFn: () => delegatesManagementApi.getDelegateStatistics(),
  });

  // Fetch provinces for filtering
  const { data: provincesResponse } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => geographicApi.getProvinces(),
  });
  const provinces = provincesResponse?.data || [];

  // Fetch districts for filtering (when province is selected)
  const { data: districtsResponse } = useQuery({
    queryKey: ['districts', provinceFilter],
    queryFn: () => geographicApi.getDistricts(provinceFilter),
    enabled: !!provinceFilter,
  });
  const districts = districtsResponse?.data || [];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleClearFilters = () => {
    setProvinceFilter('');
    setDistrictFilter('');
    setAssemblyFilter('');
    setStatusFilter('Active');
  };

  const filters = useMemo(() => ({
    province_code: provinceFilter || undefined,
    district_code: districtFilter || undefined,
    assembly_code: assemblyFilter || undefined,
    delegate_status: statusFilter || undefined,
  }), [provinceFilter, districtFilter, assemblyFilter, statusFilter]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Delegates Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and view delegates for SRPA, PPA, and NPA conferences across the organization
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {!statsLoading && statistics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Delegates
                </Typography>
                <Typography variant="h4">{statistics.active_delegates}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {statistics.inactive_delegates} inactive
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  SRPA Delegates
                </Typography>
                <Typography variant="h4">{statistics.srpa_delegates}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Sub-Regional
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f3e5f5' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  PPA Delegates
                </Typography>
                <Typography variant="h4">{statistics.ppa_delegates}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Provincial
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  NPA Delegates
                </Typography>
                <Typography variant="h4">{statistics.npa_delegates}</Typography>
                <Typography variant="caption" color="text.secondary">
                  National
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Province"
              value={provinceFilter}
              onChange={(e) => {
                setProvinceFilter(e.target.value);
                setDistrictFilter(''); // Reset district when province changes
              }}
            >
              <MenuItem value="">All Provinces</MenuItem>
              {provinces.map((province: any) => (
                <MenuItem key={province.province_code} value={province.province_code}>
                  {province.province_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="District"
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              disabled={!provinceFilter}
            >
              <MenuItem value="">All Districts</MenuItem>
              {districts.map((district: any) => (
                <MenuItem key={district.district_code} value={district.district_code}>
                  {district.district_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Assembly Type"
              value={assemblyFilter}
              onChange={(e) => setAssemblyFilter(e.target.value)}
            >
              <MenuItem value="">All Assemblies</MenuItem>
              <MenuItem value="SRPA">SRPA (Sub-Regional)</MenuItem>
              <MenuItem value="PPA">PPA (Provincial)</MenuItem>
              <MenuItem value="NPA">NPA (National)</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Replaced">Replaced</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="delegates management tabs">
          <Tab icon={<GroupsIcon />} label="All Delegates" iconPosition="start" />
          <Tab icon={<AssessmentIcon />} label="Summary by Region" iconPosition="start" />
          <Tab icon={<EventIcon />} label="Conference Delegates" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label="Audit Trail" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <DelegatesOverviewTab filters={filters} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <DelegatesSummaryTab filters={{ province_code: provinceFilter, district_code: districtFilter }} />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <ConferenceDelegatesTab />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <DelegatesAuditTrailTab filters={filters} />
      </TabPanel>
    </Container>
  );
};

export default DelegatesManagementPage;

