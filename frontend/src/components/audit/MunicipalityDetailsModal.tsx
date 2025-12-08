import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Stack
} from '@mui/material';
import {
  Close,
  Download,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
  Error,
  Lightbulb,
  Assessment
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { wardMembershipAuditApi, downloadBlob } from '../../services/wardMembershipAuditApi';
import { WARD_STANDING_COLORS, MUNICIPALITY_PERFORMANCE_COLORS } from '../../types/wardMembershipAudit';
import type { WardStanding, MunicipalityPerformance } from '../../types/wardMembershipAudit';

// Colors for pie chart
const COLORS = ['#4caf50', '#ff9800', '#f44336'];

interface MunicipalityDetailsModalProps {
  open: boolean;
  onClose: () => void;
  municipalityCode: string;
  municipalityName: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`municipality-tabpanel-${index}`}
      aria-labelledby={`municipality-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const MunicipalityDetailsModal: React.FC<MunicipalityDetailsModalProps> = ({
  open,
  onClose,
  municipalityCode,
  municipalityName
}) => {
  const [tabValue, setTabValue] = useState(0);

  // Fetch municipality details
  const { data: municipalityDetails, isLoading, error } = useQuery({
    queryKey: ['municipality-details', municipalityCode],
    queryFn: () => wardMembershipAuditApi.getMunicipalityDetails(municipalityCode),
    enabled: open && !!municipalityCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleExportPDF = async () => {
    try {
      const blob = await wardMembershipAuditApi.exportMunicipalityDetailReport(municipalityCode, 'pdf');
      const filename = `municipality-${municipalityCode}-details-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);
    } catch (error: any) {
      console.error('Export failed:', error);
      // Handle 501 Not Implemented response
      if (error.response?.status === 501) {
        alert('Export feature is not yet implemented. This feature will be available in a future update.');
      } else {
        alert('Export failed. Please try again.');
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await wardMembershipAuditApi.exportMunicipalityDetailReport(municipalityCode, 'excel');
      const filename = `municipality-${municipalityCode}-details-${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(blob, filename);
    } catch (error: any) {
      console.error('Export failed:', error);
      // Handle 501 Not Implemented response
      if (error.response?.status === 501) {
        alert('Export feature is not yet implemented. This feature will be available in a future update.');
      } else {
        alert('Export failed. Please try again.');
      }
    }
  };

  const getStandingColor = (standing: WardStanding) => {
    return WARD_STANDING_COLORS[standing] as 'success' | 'warning' | 'error';
  };

  const getPerformanceColor = (performance: MunicipalityPerformance) => {
    return MUNICIPALITY_PERFORMANCE_COLORS[performance] as 'success' | 'error';
  };

  const getRecommendationIcon = (recommendation: string) => {
    if (recommendation.toLowerCase().includes('priority') || recommendation.toLowerCase().includes('alert')) {
      return <Error color="error" />;
    } else if (recommendation.toLowerCase().includes('target') || recommendation.toLowerCase().includes('focus')) {
      return <Warning color="warning" />;
    } else if (recommendation.toLowerCase().includes('status') || recommendation.toLowerCase().includes('maintain')) {
      return <CheckCircle color="success" />;
    } else {
      return <Lightbulb color="info" />;
    }
  };

  // Prepare ward standing distribution chart data
  const wardStandingData = municipalityDetails ? [
    {
      name: 'Good Standing',
      value: municipalityDetails.municipality_info.good_standing_wards,
      color: COLORS[0]
    },
    {
      name: 'Acceptable Standing',
      value: municipalityDetails.municipality_info.acceptable_standing_wards,
      color: COLORS[1]
    },
    {
      name: 'Needs Improvement',
      value: municipalityDetails.municipality_info.needs_improvement_wards,
      color: COLORS[2]
    }
  ] : [];

  // Prepare historical trends chart data
  const trendsData = municipalityDetails?.historical_trends ?
    municipalityDetails.historical_trends.map(trend => ({
      month: new Date(trend.trend_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      totalActiveMembers: trend.total_active_members,
      totalMembers: trend.total_all_members,
      wardsTracked: trend.wards_tracked
    })).reverse() : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { minHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Municipality Details: {municipalityName}
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Loading municipality details...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load municipality details. Please try again.
          </Alert>
        )}

        {municipalityDetails && (
          <Box>
            {/* Municipality Overview */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Municipality Information
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Municipality Code</Typography>
                      <Typography variant="body1" fontWeight="medium">{municipalityDetails.municipality_info.municipality_code}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">District</Typography>
                      <Typography variant="body1">{municipalityDetails.municipality_info.district_name}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Province</Typography>
                      <Typography variant="body1">{municipalityDetails.municipality_info.province_name}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Performance Status</Typography>
                      <Chip
                        label={municipalityDetails.municipality_info.municipality_performance}
                        color={getPerformanceColor(municipalityDetails.municipality_info.municipality_performance)}
                        size="small"
                        icon={municipalityDetails.municipality_info.municipality_performance === 'Performing Municipality' ? 
                          <TrendingUp /> : <TrendingDown />}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Ward Summary
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Total Wards</Typography>
                      <Typography variant="h4" color="primary">
                        {municipalityDetails.municipality_info.total_wards}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip
                        label={`${municipalityDetails.municipality_info.good_standing_wards} Good`}
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${municipalityDetails.municipality_info.acceptable_standing_wards} Acceptable`}
                        color="warning"
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${municipalityDetails.municipality_info.needs_improvement_wards} Needs Improvement`}
                        color="error"
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Compliance Rate</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={municipalityDetails.municipality_info.compliance_percentage}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          color={municipalityDetails.municipality_info.compliance_percentage >= 70 ? 'success' : 'error'}
                        />
                        <Typography variant="body2" fontWeight="medium">
                          {municipalityDetails.municipality_info.compliance_percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Membership Statistics
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Total Active Members</Typography>
                      <Typography variant="h4" color="success.main">
                        {municipalityDetails.municipality_info.total_active_members.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Average per Ward</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {municipalityDetails.municipality_info.avg_active_per_ward.toFixed(1)} members
                      </Typography>
                    </Box>
                    {municipalityDetails.municipality_info.wards_needed_compliance > 0 && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>{municipalityDetails.municipality_info.wards_needed_compliance} more wards</strong> need to reach compliance for 70% target.
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabs for detailed information */}
            <Paper sx={{ mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="municipality details tabs">
                <Tab label="Ward Breakdown" icon={<Assessment />} />
                <Tab label="Performance Analytics" icon={<TrendingUp />} />
                <Tab label="Recommendations" icon={<Lightbulb />} />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                {/* Ward Breakdown Table */}
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Ward Name</TableCell>
                        <TableCell align="right">Active Members</TableCell>
                        <TableCell align="right">Total Members</TableCell>
                        <TableCell>Standing</TableCell>
                        <TableCell align="right">Target Achievement</TableCell>
                        <TableCell align="right">Members Needed</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {municipalityDetails.wards_breakdown.map((ward) => (
                        <TableRow key={ward.ward_code}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {ward.ward_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ward.ward_code}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {ward.active_members.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {ward.total_members.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({ward.active_percentage.toFixed(1)}% active)
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ward.ward_standing}
                              color={getStandingColor(ward.ward_standing)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(ward.target_achievement_percentage, 100)}
                                sx={{ width: 60, height: 6, borderRadius: 3 }}
                                color={ward.target_achievement_percentage >= 100 ? 'success' : 'warning'}
                              />
                              <Typography variant="body2">
                                {ward.target_achievement_percentage.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            {ward.members_needed_next_level > 0 ? (
                              <Chip
                                label={`+${ward.members_needed_next_level}`}
                                color="warning"
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                label="Target Met"
                                color="success"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {/* Performance Analytics */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Ward Standing Distribution
                        </Typography>
                        {wardStandingData.length > 0 && (
                          <Box sx={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={wardStandingData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {wardStandingData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Historical Trends (Last 12 Months)
                        </Typography>
                        {trendsData.length > 0 && (
                          <Box sx={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendsData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                  type="monotone"
                                  dataKey="totalActiveMembers"
                                  stroke="#4BC0C0"
                                  strokeWidth={2}
                                  name="Total Active Members"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                {/* Recommendations */}
                <List>
                  {municipalityDetails.recommendations.map((recommendation, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {getRecommendationIcon(recommendation)}
                      </ListItemIcon>
                      <ListItemText primary={recommendation} />
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleExportExcel} startIcon={<Download />}>
          Export Excel
        </Button>
        <Button onClick={handleExportPDF} startIcon={<Download />}>
          Export PDF
        </Button>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MunicipalityDetailsModal;
