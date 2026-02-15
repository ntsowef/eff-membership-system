import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Autocomplete,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  TablePagination,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  HowToVote as VoterIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Phone as PhoneIcon,
  PhoneDisabled as NoPhoneIcon,
  CheckCircle as ActiveIcon,
  Cancel as ExpiredIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

interface VoterRegistrationMember {
  member_id: number;
  membership_number: string;
  full_name: string;
  id_number: string;
  cell_number: string | null;
  has_valid_phone: boolean;
  membership_status: string;
  is_good_standing: boolean;
  expiry_date: string | null;
  voting_district_code: string | null;
  is_registered_voter: boolean;
  province_code: string;
  province_name: string;
  municipality_code: string;
  municipality_name: string;
  ward_code: string;
}

interface ReportSummary {
  total_members: number;
  good_standing_with_phone: number;
  good_standing_without_phone: number;
  expired_with_phone: number;
  expired_without_phone: number;
  registered_voters: number;
  not_registered_voters: number;
  region_name: string;
  region_type: 'country' | 'province' | 'municipality';
  generated_date: string;
}

interface RegionSummary {
  code: string;
  name: string;
  good_standing_with_phone: number;
  good_standing_without_phone: number;
  expired_with_phone: number;
  expired_without_phone: number;
  total: number;
}

type CategoryType = 'good_standing_with_phone' | 'good_standing_without_phone' | 'expired_with_phone' | 'expired_without_phone';
type VoterStatusType = 'all' | 'registered' | 'not_registered';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface Province {
  province_code: string;
  province_name: string;
}

interface Municipality {
  municipality_code: string;
  municipality_name: string;
}

interface VoterRegistrationReportProps {
  onClose?: () => void;
}

const CATEGORIES: CategoryType[] = ['good_standing_with_phone', 'good_standing_without_phone', 'expired_with_phone', 'expired_without_phone'];

const VoterRegistrationReport: React.FC<VoterRegistrationReportProps> = ({ onClose }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [voterStatus, setVoterStatus] = useState<VoterStatusType>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [selectedTab, selectedProvince, selectedMunicipality, voterStatus]);

  // Reset municipality when province changes
  useEffect(() => {
    setSelectedMunicipality(null);
  }, [selectedProvince]);

  const currentCategory = CATEGORIES[selectedTab];

  // Fetch provinces
  const { data: provincesData } = useQuery({
    queryKey: ['provinces-list'],
    queryFn: async () => {
      const response = await api.get('/geographic/provinces');
      return response.data?.data || response.data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const provinces: Province[] = Array.isArray(provincesData) ? provincesData : [];

  // Fetch municipalities based on selected province
  const { data: municipalitiesData } = useQuery({
    queryKey: ['municipalities-by-province', selectedProvince?.province_code],
    queryFn: async () => {
      if (!selectedProvince) {
        const response = await api.get('/geographic/municipalities');
        return response.data?.data || response.data || [];
      }
      const response = await api.get(`/geographic/municipalities?province=${selectedProvince.province_code}`);
      return response.data?.data || response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const municipalities: Municipality[] = Array.isArray(municipalitiesData) ? municipalitiesData : [];

  // Fetch summary
  const { data: summaryResult, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['voter-registration-summary', selectedProvince?.province_code, selectedMunicipality?.municipality_code, voterStatus],
    queryFn: async () => {
      const params: Record<string, string> = { voter_status: voterStatus };
      if (selectedMunicipality) params.municipality_code = selectedMunicipality.municipality_code;
      else if (selectedProvince) params.province_code = selectedProvince.province_code;
      const response = await api.get('/reports/voter-registration/summary', { params });
      return response.data?.data as { summary: ReportSummary; regions?: RegionSummary[] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const summaryData = summaryResult?.summary;
  const regions = summaryResult?.regions;

  // Fetch paginated category members
  const { data: categoryData, isLoading: isCategoryLoading, refetch: refetchCategory } = useQuery({
    queryKey: ['voter-registration-category', currentCategory, selectedProvince?.province_code, selectedMunicipality?.municipality_code, voterStatus, page, rowsPerPage],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        category: currentCategory,
        voter_status: voterStatus,
        page: page + 1,
        limit: rowsPerPage
      };
      if (selectedMunicipality) params.municipality_code = selectedMunicipality.municipality_code;
      else if (selectedProvince) params.province_code = selectedProvince.province_code;
      const response = await api.get('/reports/voter-registration/category', { params });
      return response.data?.data as { members: VoterRegistrationMember[]; pagination: Pagination };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!summaryData,
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchCategory();
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, string> = { voter_status: voterStatus };
      if (selectedMunicipality) params.municipality_code = selectedMunicipality.municipality_code;
      else if (selectedProvince) params.province_code = selectedProvince.province_code;

      const response = await api.get('/reports/voter-registration/export-excel', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const regionSuffix = selectedMunicipality?.municipality_name || selectedProvince?.province_name || 'South_Africa';
      link.setAttribute('download', `Voter_Registration_Report_${regionSuffix.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, string> = { voter_status: voterStatus, include_charts: 'true' };
      if (selectedMunicipality) params.municipality_code = selectedMunicipality.municipality_code;
      else if (selectedProvince) params.province_code = selectedProvince.province_code;

      const response = await api.get('/reports/voter-registration/export-pdf', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const regionSuffix = selectedMunicipality?.municipality_name || selectedProvince?.province_name || 'South_Africa';
      link.setAttribute('download', `Voter_Registration_Report_${regionSuffix.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleVoterStatusChange = (_event: React.MouseEvent<HTMLElement>, newValue: VoterStatusType | null) => {
    if (newValue !== null) {
      setVoterStatus(newValue);
    }
  };

  const tabLabels = [
    { label: 'Good Standing + Phone', count: summaryData?.good_standing_with_phone || 0, color: 'success' },
    { label: 'Good Standing - No Phone', count: summaryData?.good_standing_without_phone || 0, color: 'warning' },
    { label: 'Expired + Phone', count: summaryData?.expired_with_phone || 0, color: 'info' },
    { label: 'Expired - No Phone', count: summaryData?.expired_without_phone || 0, color: 'error' },
  ];

  const isLoading = isSummaryLoading;
  const error = summaryError;
  const members = categoryData?.members || [];
  const pagination = categoryData?.pagination;

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <VoterIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4">
              Voter Registration Status Report
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {summaryData?.region_name || 'South Africa'} - {summaryData?.generated_date || new Date().toISOString().split('T')[0]}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={isExporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExportExcel}
            disabled={isExporting || isLoading}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={isExporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExportPDF}
            disabled={isExporting || isLoading}
          >
            Export PDF
          </Button>
          {onClose && (
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <Autocomplete
              options={provinces}
              getOptionLabel={(option) => option.province_name}
              value={selectedProvince}
              onChange={(_, newValue) => setSelectedProvince(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Province" placeholder="All Provinces" size="small" />
              )}
              isOptionEqualToValue={(option, value) => option.province_code === value.province_code}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Autocomplete
              options={municipalities}
              getOptionLabel={(option) => option.municipality_name}
              value={selectedMunicipality}
              onChange={(_, newValue) => setSelectedMunicipality(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Municipality" placeholder="All Municipalities" size="small" />
              )}
              isOptionEqualToValue={(option, value) => option.municipality_code === value.municipality_code}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={voterStatus}
              exclusive
              onChange={handleVoterStatusChange}
              size="small"
              fullWidth
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="registered">Registered to Vote</ToggleButton>
              <ToggleButton value="not_registered">Not Registered</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              Total: <strong>{summaryData?.total_members?.toLocaleString() || 0}</strong>
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      {summaryData && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ActiveIcon color="success" />
                  <PhoneIcon color="success" />
                </Box>
                <Typography variant="h4" sx={{ mt: 1 }}>{summaryData.good_standing_with_phone.toLocaleString()}</Typography>
                <Typography variant="body2">Good Standing + Phone (SMS Eligible)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ActiveIcon color="success" />
                  <NoPhoneIcon color="warning" />
                </Box>
                <Typography variant="h4" sx={{ mt: 1 }}>{summaryData.good_standing_without_phone.toLocaleString()}</Typography>
                <Typography variant="body2">Good Standing - No Phone</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ExpiredIcon color="error" />
                  <PhoneIcon color="info" />
                </Box>
                <Typography variant="h4" sx={{ mt: 1 }}>{summaryData.expired_with_phone.toLocaleString()}</Typography>
                <Typography variant="body2">Expired + Phone</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ExpiredIcon color="error" />
                  <NoPhoneIcon color="error" />
                </Box>
                <Typography variant="h4" sx={{ mt: 1 }}>{summaryData.expired_without_phone.toLocaleString()}</Typography>
                <Typography variant="body2">Expired - No Phone</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Voter Registration Stats */}
      {summaryData && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VoterIcon color="success" />
                <Typography>
                  Registered to Vote: <strong>{summaryData.registered_voters.toLocaleString()}</strong>
                  {' '}({((summaryData.registered_voters / (summaryData.total_members || 1)) * 100).toFixed(1)}%)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VoterIcon color="error" />
                <Typography>
                  Not Registered: <strong>{summaryData.not_registered_voters.toLocaleString()}</strong>
                  {' '}({((summaryData.not_registered_voters / (summaryData.total_members || 1)) * 100).toFixed(1)}%)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Loading/Error States */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load voter registration report. Please try again.
        </Alert>
      )}

      {/* Tabs and Data Table */}
      {summaryData && !isLoading && (
        <>
          <Paper sx={{ mb: 2 }}>
            <Tabs value={selectedTab} onChange={handleTabChange} variant="fullWidth">
              {tabLabels.map((tab, index) => (
                <Tab
                  key={index}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tab.label}
                      <Chip label={tab.count.toLocaleString()} size="small" color={tab.color as any} />
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Paper>

          <TableContainer component={Paper} sx={{ position: 'relative' }}>
            {isCategoryLoading && (
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <CircularProgress />
              </Box>
            )}
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>#</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Member ID</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Full Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID Number</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cell Number</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Voter</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Province</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Municipality</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ward</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography color="text.secondary" py={3}>No members in this category</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member, index) => (
                    <TableRow key={member.member_id} hover>
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>{member.membership_number}</TableCell>
                      <TableCell>{member.full_name}</TableCell>
                      <TableCell>{member.id_number}</TableCell>
                      <TableCell>
                        {member.cell_number || <Typography color="error" variant="body2">N/A</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.membership_status}
                          size="small"
                          color={member.is_good_standing ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={member.is_registered_voter ? 'Registered to Vote' : 'Not Registered'}>
                          <Chip
                            label={member.is_registered_voter ? 'Yes' : 'No'}
                            size="small"
                            color={member.is_registered_voter ? 'success' : 'default'}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>{member.province_name}</TableCell>
                      <TableCell>{member.municipality_name}</TableCell>
                      <TableCell>{member.ward_code}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[25, 50, 100]}
              component="div"
              count={pagination?.total || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>

          {/* Total Count */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total members: <strong>{summaryData.total_members.toLocaleString()}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing page {page + 1} of {pagination?.total_pages || 1} ({pagination?.total?.toLocaleString() || 0} members in this category)
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default VoterRegistrationReport;

