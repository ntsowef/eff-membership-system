import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  TextField,

  Chip,
  CircularProgress,
  Alert,

  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  PictureAsPdf,
  Assessment,
  People,
  Download,
  Refresh,
  FilterList,
  Clear,
  BarChart,
  PieChart,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { devLog } from '../../utils/logger';

interface DemographicsData {
  gender: {
    male: number;
    female: number;
    other: number;
    total: number;
  };
  age_groups: Array<{
    age_group: string;
    member_count: number;
    percentage: number;
  }>;
  race: Array<{
    race_name: string;
    count: number;
    percentage: number;
  }>;
  language: Array<{
    language_name: string;
    count: number;
    percentage: number;
  }>;
  occupation: Array<{
    category_name: string;
    count: number;
    percentage: number;
  }>;
  qualification: Array<{
    qualification_name: string;
    count: number;
    percentage: number;
  }>;
}

interface DemographicsFilters {
  ward_code?: string;
  municipality_code?: string;
  district_code?: string;
  province_code?: string;
}

const DemographicsReport: React.FC = () => {
  const [filters, setFilters] = useState<DemographicsFilters>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    title: 'Demographics Report',
    include_charts: true,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch demographics data
  const { data: demographicsData, isLoading, error, refetch } = useQuery({
    queryKey: ['demographics', filters, refreshKey],
    queryFn: async () => {
      const response = await api.get('/statistics/demographics', { params: filters });
      devLog('Demographics API Response:', response.data);

      // Handle the nested data structure: response.data.data.demographics
      if (response.data && response.data.data && response.data.data.demographics) {
        return response.data.data.demographics as DemographicsData;
      }

      // Fallback for direct demographics structure
      if (response.data && response.data.demographics) {
        return response.data.demographics as DemographicsData;
      }

      throw new Error('Invalid demographics data structure');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleFilterChange = (field: keyof DemographicsFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const params = new URLSearchParams({
        ...filters,
        title: pdfOptions.title,
        include_charts: pdfOptions.include_charts.toString(),
      });

      // Remove empty parameters
      Object.keys(params).forEach(key => {
        if (!params.get(key)) {
          params.delete(key);
        }
      });

      const response = await fetch(`/api/v1/statistics/demographics/report/pdf?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const scope = filters.ward_code ? `ward-${filters.ward_code}` :
                   filters.municipality_code ? `municipality-${filters.municipality_code}` :
                   filters.district_code ? `district-${filters.district_code}` :
                   filters.province_code ? `province-${filters.province_code}` :
                   'national';
      
      link.download = `demographics-report-${scope}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setPdfDialogOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 400, gap: 2 }}>
        <CircularProgress size={60} />
        <Typography variant="body1" color="text.secondary">
          Loading demographics data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    console.error('Demographics data error:', error);
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load demographics data: {error instanceof Error ? error.message : 'Unknown error'}
        <Button onClick={() => refetch()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!demographicsData) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No demographics data available. Please check your filters or try refreshing.
        <Button onClick={() => refetch()} sx={{ ml: 2 }}>
          Refresh
        </Button>
      </Alert>
    );
  }

  const totalMembers = demographicsData?.gender?.total || 0;

  // Safety checks for data structure
  const genderData = demographicsData?.gender || { male: 0, female: 0, other: 0, total: 0 };
  const ageGroupsData = demographicsData?.age_groups || [];
  const raceData = demographicsData?.race || [];
  const languageData = demographicsData?.language || [];
  const occupationData = demographicsData?.occupation || [];
  const qualificationData = demographicsData?.qualification || [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Assessment color="primary" />
            Demographics Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive demographic analysis of membership data
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={isGeneratingPDF ? <CircularProgress size={16} /> : <PictureAsPdf />}
            onClick={() => setPdfDialogOpen(true)}
            disabled={isGeneratingPDF}
          >
            Generate PDF Report
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList />
          Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
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
              label="District Code"
              value={filters.district_code || ''}
              onChange={(e) => handleFilterChange('district_code', e.target.value)}
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
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={handleClearFilters}
              disabled={Object.keys(filters).length === 0}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
        
        {/* Active Filters */}
        {Object.entries(filters).filter(([_, value]) => value).length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Active Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {Object.entries(filters).filter(([_, value]) => value).map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${key.replace('_', ' ')}: ${value}`}
                  onDelete={() => handleFilterChange(key as keyof DemographicsFilters, '')}
                  size="small"
                />
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Total Members
              </Typography>
              <Typography variant="h4">
                {totalMembers.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Gender Split
              </Typography>
              <Typography variant="body1">
                {totalMembers > 0 ? ((genderData.male / totalMembers) * 100).toFixed(1) : 0}% Male
              </Typography>
              <Typography variant="body1">
                {totalMembers > 0 ? ((genderData.female / totalMembers) * 100).toFixed(1) : 0}% Female
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Largest Age Group
              </Typography>
              <Typography variant="body1">
                {(() => {
                  const largestGroup = ageGroupsData.reduce((max, group) =>
                    group.member_count > max.member_count ? group : max,
                    { age_group: 'N/A', member_count: 0 }
                  );
                  return largestGroup.age_group;
                })()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(() => {
                  const largestGroup = ageGroupsData.reduce((max, group) =>
                    group.member_count > max.member_count ? group : max,
                    { age_group: 'N/A', member_count: 0 }
                  );
                  return largestGroup.member_count.toLocaleString();
                })()} members
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Primary Language
              </Typography>
              <Typography variant="body1">
                {languageData[0]?.language_name || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {languageData[0]?.percentage || 0}% of members
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Demographics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Gender Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People />
                Gender Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Male</Typography>
                  <Typography variant="body2">
                    {genderData.male.toLocaleString()} ({totalMembers > 0 ? ((genderData.male / totalMembers) * 100).toFixed(1) : 0}%)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Female</Typography>
                  <Typography variant="body2">
                    {genderData.female.toLocaleString()} ({totalMembers > 0 ? ((genderData.female / totalMembers) * 100).toFixed(1) : 0}%)
                  </Typography>
                </Box>
                {genderData.other > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Other</Typography>
                    <Typography variant="body2">
                      {genderData.other.toLocaleString()} ({totalMembers > 0 ? ((genderData.other / totalMembers) * 100).toFixed(1) : 0}%)
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Age Groups */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart />
                Age Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                {ageGroupsData.map((ageGroup, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{ageGroup.age_group}</Typography>
                    <Typography variant="body2">
                      {ageGroup.member_count.toLocaleString()} ({ageGroup.percentage.toFixed(1)}%)
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Race Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChart />
                Race Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                {raceData.slice(0, 5).map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{item.race_name}</Typography>
                    <Typography variant="body2">
                      {item.count.toLocaleString()} ({item.percentage}%)
                    </Typography>
                  </Box>
                ))}
                {raceData.length > 5 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    ... and {raceData.length - 5} other races
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Language Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Language Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                {languageData.slice(0, 8).map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{item.language_name}</Typography>
                    <Typography variant="body2">
                      {item.count.toLocaleString()} ({item.percentage}%)
                    </Typography>
                  </Box>
                ))}
                {languageData.length > 8 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    ... and {languageData.length - 8} other languages
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Occupation Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Occupation Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                {occupationData.slice(0, 6).map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{item.category_name}</Typography>
                    <Typography variant="body2">
                      {item.count.toLocaleString()} ({item.percentage}%)
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Education/Qualification Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Education Level
              </Typography>
              <Box sx={{ mt: 2 }}>
                {qualificationData.length > 0 ? (
                  qualificationData.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{item.qualification_name}</Typography>
                      <Typography variant="body2">
                        {item.count.toLocaleString()} ({item.percentage}%)
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Limited education data available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* PDF Generation Dialog */}
      <Dialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Demographics Report PDF</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Report Title"
              value={pdfOptions.title}
              onChange={(e) => setPdfOptions(prev => ({ ...prev, title: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={pdfOptions.include_charts}
                  onChange={(e) => setPdfOptions(prev => ({ ...prev, include_charts: e.target.checked }))}
                />
              }
              label="Include Charts and Visualizations"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            startIcon={isGeneratingPDF ? <CircularProgress size={16} /> : <Download />}
          >
            Generate PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DemographicsReport;
