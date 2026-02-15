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
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  TablePagination,
} from '@mui/material';
import {
  Cake as BirthdayIcon,
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
import CascadingGeographicFilter from '../common/CascadingGeographicFilter';

interface BirthdayMember {
  member_id: number;
  membership_number: string;
  full_name: string;
  id_number: string;
  date_of_birth: string;
  birth_day: number;
  current_age: number;
  cell_number: string | null;
  has_valid_phone: boolean;
  membership_status: string;
  is_good_standing: boolean;
  expiry_date: string | null;
  province_name: string;
  municipality_name: string;
  ward_code: string;
}

interface BirthdayReportSummary {
  total_members: number;
  good_standing_with_phone: number;
  good_standing_without_phone: number;
  expired_with_phone: number;
  expired_without_phone: number;
  current_month: string;
  current_year: number;
}

type CategoryType = 'good_standing_with_phone' | 'good_standing_without_phone' | 'expired_with_phone' | 'expired_without_phone';

interface CategoryPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface BirthdayReportProps {
  onClose?: () => void;
}

const CATEGORIES: CategoryType[] = ['good_standing_with_phone', 'good_standing_without_phone', 'expired_with_phone', 'expired_without_phone'];

const BirthdayReport: React.FC<BirthdayReportProps> = ({ onClose }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Reset page when tab or filters change
  useEffect(() => {
    setPage(0);
  }, [selectedTab, selectedProvince, selectedMunicipality]);

  const currentCategory = CATEGORIES[selectedTab];

  // Handle province change - clear municipality when province changes
  const handleProvinceChange = (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    setSelectedMunicipality(''); // Clear municipality when province changes
    setPage(0);
  };

  // Handle municipality change
  const handleMunicipalityChange = (municipalityCode: string) => {
    setSelectedMunicipality(municipalityCode);
    setPage(0);
  };

  // Fetch summary only (fast query for counts)
  const { data: summaryData, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['birthday-report-summary', selectedProvince, selectedMunicipality],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedProvince) {
        params.province_code = selectedProvince;
      }
      if (selectedMunicipality) {
        params.municipality_code = selectedMunicipality;
      }
      const response = await api.get('/birthday-sms/monthly-report/summary', { params });
      return response.data?.data?.summary as BirthdayReportSummary;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch paginated category members
  const { data: categoryData, isLoading: isCategoryLoading, refetch: refetchCategory } = useQuery({
    queryKey: ['birthday-report-category', currentCategory, selectedProvince, selectedMunicipality, page, rowsPerPage],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        category: currentCategory,
        page: page + 1, // API uses 1-based pages
        limit: rowsPerPage
      };
      if (selectedProvince) {
        params.province_code = selectedProvince;
      }
      if (selectedMunicipality) {
        params.municipality_code = selectedMunicipality;
      }
      const response = await api.get('/birthday-sms/monthly-report/category', { params });
      return response.data?.data as { members: BirthdayMember[]; pagination: CategoryPagination };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!summaryData, // Only fetch after summary is loaded
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchCategory();
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, string> = {};
      if (selectedProvince) {
        params.province_code = selectedProvince;
      }
      if (selectedMunicipality) {
        params.municipality_code = selectedMunicipality;
      }

      const response = await api.get('/birthday-sms/monthly-report/export', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const month = summaryData?.current_month || 'Report';
      const year = summaryData?.current_year || new Date().getFullYear();
      // Province name mapping
      const provinceNames: Record<string, string> = {
        'EC': 'Eastern_Cape', 'FS': 'Free_State', 'GP': 'Gauteng',
        'KZN': 'KwaZulu_Natal', 'LP': 'Limpopo', 'MP': 'Mpumalanga',
        'NC': 'Northern_Cape', 'NW': 'North_West', 'WC': 'Western_Cape'
      };
      // Build filename suffix based on filters
      let filenameSuffix = '';
      if (selectedMunicipality) {
        filenameSuffix = `_${selectedMunicipality.replace(/[^a-zA-Z0-9]/g, '_')}`;
      } else if (selectedProvince) {
        filenameSuffix = `_${provinceNames[selectedProvince] || selectedProvince}`;
      }
      link.setAttribute('download', `Birthday_Report_${month}_${year}${filenameSuffix}.xlsx`);
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
          <BirthdayIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4">
              Birthday Report - {summaryData?.current_month} {summaryData?.current_year}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Members with birthdays this month, categorized by status and phone availability
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
          {onClose && (
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          )}
        </Box>
      </Box>

      {/* Geographic Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Geographic Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <CascadingGeographicFilter
              selectedProvince={selectedProvince}
              selectedMunicipality={selectedMunicipality}
              onProvinceChange={handleProvinceChange}
              onMunicipalityChange={handleMunicipalityChange}
              size="small"
              fullWidth={false}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              {selectedMunicipality
                ? `Showing birthdays for selected municipality`
                : selectedProvince
                  ? `Showing birthdays for selected province`
                  : 'Showing all birthdays for the current month (nationwide)'}
            </Typography>
            {/* Active Filter Chips */}
            {(selectedProvince || selectedMunicipality) && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedProvince && (
                  <Chip
                    label={`Province: ${selectedProvince}`}
                    size="small"
                    onDelete={() => handleProvinceChange('')}
                  />
                )}
                {selectedMunicipality && (
                  <Chip
                    label={`Municipality: ${selectedMunicipality}`}
                    size="small"
                    onDelete={() => handleMunicipalityChange('')}
                  />
                )}
              </Box>
            )}
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
                <Typography variant="h4" sx={{ mt: 1 }}>{summaryData.good_standing_with_phone}</Typography>
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
                <Typography variant="h4" sx={{ mt: 1 }}>{summaryData.good_standing_without_phone}</Typography>
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
                <Typography variant="h4" sx={{ mt: 1 }}>{summaryData.expired_with_phone}</Typography>
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
                <Typography variant="h4" sx={{ mt: 1 }}>{summaryData.expired_without_phone}</Typography>
                <Typography variant="body2">Expired - No Phone</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Loading/Error States */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load birthday report. Please try again.
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
                      <Chip label={tab.count} size="small" color={tab.color as any} />
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Paper>

          {/* Legend for birthday status */}
          <Box sx={{ mb: 2, display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>Legend:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: 'rgba(76, 175, 80, 0.15)', border: '1px solid #4caf50', borderRadius: 1 }} />
              <Typography variant="body2">Birthday Today 🎂</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: 'rgba(244, 67, 54, 0.08)', border: '1px solid #f44336', borderRadius: 1 }} />
              <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>Birthday Passed</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: 'white', border: '1px solid #ccc', borderRadius: 1 }} />
              <Typography variant="body2">Upcoming Birthday</Typography>
            </Box>
          </Box>

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
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Birthday</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Age</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cell Number</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Expiry Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Province</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Municipality</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ward</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} align="center">
                      <Typography color="text.secondary" py={3}>No members in this category</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member, index) => {
                    const today = new Date();
                    const currentDay = today.getDate();
                    const isPassed = member.birth_day < currentDay;
                    const isToday = member.birth_day === currentDay;

                    return (
                      <TableRow
                        key={member.member_id}
                        hover
                        sx={{
                          bgcolor: isToday ? 'rgba(76, 175, 80, 0.15)' : isPassed ? 'rgba(244, 67, 54, 0.08)' : 'inherit',
                          '& td': isPassed ? {
                            textDecoration: 'line-through',
                            color: 'text.disabled',
                            opacity: 0.7
                          } : isToday ? {
                            fontWeight: 'bold'
                          } : {}
                        }}
                      >
                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                        <TableCell>{member.membership_number}</TableCell>
                        <TableCell>
                          {member.full_name}
                          {isToday && <Chip label="🎂 TODAY!" size="small" color="success" sx={{ ml: 1 }} />}
                        </TableCell>
                        <TableCell>{member.id_number}</TableCell>
                        <TableCell>
                          <Tooltip title={member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : ''}>
                            <Chip
                              label={`Day ${member.birth_day}`}
                              size="small"
                              icon={<BirthdayIcon />}
                              color={isToday ? 'success' : isPassed ? 'default' : 'primary'}
                              sx={isPassed ? { opacity: 0.6 } : {}}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>{member.current_age}</TableCell>
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
                          {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>{member.province_name}</TableCell>
                        <TableCell>{member.municipality_name}</TableCell>
                        <TableCell>{member.ward_code}</TableCell>
                      </TableRow>
                    );
                  })
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
              Total members with birthdays this month: <strong>{summaryData.total_members}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing page {page + 1} of {pagination?.total_pages || 1} ({pagination?.total || 0} members in this category)
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default BirthdayReport;
