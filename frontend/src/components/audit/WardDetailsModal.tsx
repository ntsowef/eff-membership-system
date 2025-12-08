import React from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Alert
} from '@mui/material';
import {
  Close,
  Download,
  CheckCircle,
  Warning,
  Error,
  Lightbulb
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { wardMembershipAuditApi, downloadBlob } from '../../services/wardMembershipAuditApi';
import { WARD_STANDING_COLORS } from '../../types/wardMembershipAudit';
import type { WardStanding } from '../../types/wardMembershipAudit';
import { showWarning, showError } from '../../utils/sweetAlert';

// No registration needed for Recharts

interface WardDetailsModalProps {
  open: boolean;
  onClose: () => void;
  wardCode: string;
  wardName: string;
}

const WardDetailsModal: React.FC<WardDetailsModalProps> = ({
  open,
  onClose,
  wardCode,
  wardName
}) => {
  // Fetch ward details
  const { data: wardDetails, isLoading, error } = useQuery({
    queryKey: ['ward-details', wardCode],
    queryFn: () => wardMembershipAuditApi.getWardDetails(wardCode),
    enabled: open && !!wardCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleExportPDF = async () => {
    try {
      const blob = await wardMembershipAuditApi.exportWardDetailReport(wardCode, 'pdf');
      const filename = `ward-${wardCode}-details-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);
    } catch (error: any) {
      console.error('Export failed:', error);
      // Handle 501 Not Implemented response
      if (error.response?.status === 501) {
        showWarning('Export feature is not yet implemented. This feature will be available in a future update.', 'Coming Soon');
      } else {
        showError('Export failed. Please try again.');
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await wardMembershipAuditApi.exportWardDetailReport(wardCode, 'excel');
      const filename = `ward-${wardCode}-details-${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(blob, filename);
    } catch (error: any) {
      console.error('Export failed:', error);
      // Handle 501 Not Implemented response
      if (error.response?.status === 501) {
        showWarning('Export feature is not yet implemented. This feature will be available in a future update.', 'Coming Soon');
      } else {
        showError('Export failed. Please try again.');
      }
    }
  };

  const getStandingColor = (standing: WardStanding) => {
    return WARD_STANDING_COLORS[standing] as 'success' | 'warning' | 'error';
  };

  // Helper function to get trend icon (currently unused but kept for future use)
  // const getTrendIcon = (trend: GrowthTrend) => {
  //   switch (trend) {
  //     case 'Growing':
  //       return <TrendingUp color="success" />;
  //     case 'Declining':
  //       return <TrendingDown color="error" />;
  //     case 'Stable':
  //       return <TrendingFlat color="info" />;
  //     default:
  //       return <TrendingFlat />;
  //   }
  // };

  const getRecommendationIcon = (recommendation: string) => {
    if (recommendation.toLowerCase().includes('priority') || recommendation.toLowerCase().includes('alert')) {
      return <Error color="error" />;
    } else if (recommendation.toLowerCase().includes('target') || recommendation.toLowerCase().includes('goal')) {
      return <Warning color="warning" />;
    } else if (recommendation.toLowerCase().includes('status') || recommendation.toLowerCase().includes('maintain')) {
      return <CheckCircle color="success" />;
    } else {
      return <Lightbulb color="info" />;
    }
  };

  // Prepare chart data for Recharts
  const chartData = wardDetails?.historical_trends ?
    wardDetails.historical_trends.map(trend => ({
      month: new Date(trend.trend_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      activeMembers: trend.active_members,
      totalMembers: trend.total_members,
      standing: trend.monthly_standing
    })).reverse() : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Ward Details: {wardName}
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Loading ward details...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load ward details. Please try again.
          </Alert>
        )}

        {wardDetails && (
          <Box sx={{ pb: 2 }}>
            {/* Ward Information */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Ward Information
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Ward Code</Typography>
                      <Typography variant="body1" fontWeight="medium">{wardDetails.ward_info.ward_code}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Municipality</Typography>
                      <Typography variant="body1">{wardDetails.ward_info.municipality_name}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">District</Typography>
                      <Typography variant="body1">{wardDetails.ward_info.district_name}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Province</Typography>
                      <Typography variant="body1">{wardDetails.ward_info.province_name}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Current Standing</Typography>
                      <Chip
                        label={wardDetails.ward_info.ward_standing}
                        color={getStandingColor(wardDetails.ward_info.ward_standing)}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Membership Breakdown
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Active Members</Typography>
                      <Typography variant="h4" color="success.main">
                        {wardDetails.ward_info.active_members.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Expired Members</Typography>
                      <Typography variant="body1" color="warning.main">
                        {wardDetails.ward_info.expired_members.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Inactive Members</Typography>
                      <Typography variant="body1" color="error.main">
                        {wardDetails.ward_info.inactive_members.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Total Members</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {wardDetails.ward_info.total_members.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Active Percentage</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={wardDetails.ward_info.active_percentage}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          color={wardDetails.ward_info.active_percentage >= 70 ? 'success' : 'warning'}
                        />
                        <Typography variant="body2">
                          {wardDetails.ward_info.active_percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Target Achievement */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Target Achievement Progress
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Target Achievement: {wardDetails.ward_info.target_achievement_percentage.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(wardDetails.ward_info.target_achievement_percentage, 100)}
                    sx={{ mt: 1, height: 12, borderRadius: 6 }}
                    color={wardDetails.ward_info.target_achievement_percentage >= 100 ? 'success' : 'warning'}
                  />
                </Box>
                {wardDetails.ward_info.members_needed_next_level > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>{wardDetails.ward_info.members_needed_next_level} more active members</strong> needed to reach the next standing level.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Historical Trends Chart */}
            {chartData.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Historical Membership Trends (Last 12 Months)
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="activeMembers"
                          stroke="#4BC0C0"
                          strokeWidth={2}
                          name="Active Members"
                        />
                        <Line
                          type="monotone"
                          dataKey="totalMembers"
                          stroke="#9966FF"
                          strokeWidth={2}
                          name="Total Members"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Municipality Comparison */}
            {wardDetails.municipality_comparison.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Comparison with Other Wards in {wardDetails.ward_info.municipality_name}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Ward Name</TableCell>
                          <TableCell align="right">Active Members</TableCell>
                          <TableCell>Standing</TableCell>
                          <TableCell align="right">Target Achievement</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {wardDetails.municipality_comparison.map((ward) => (
                          <TableRow key={ward.ward_code}>
                            <TableCell>{ward.ward_name}</TableCell>
                            <TableCell align="right">{ward.active_members.toLocaleString()}</TableCell>
                            <TableCell>
                              <Chip
                                label={ward.ward_standing}
                                color={getStandingColor(ward.ward_standing)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">{ward.target_achievement_percentage.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {wardDetails.recommendations.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Action Items & Recommendations
                  </Typography>
                  <List>
                    {wardDetails.recommendations.map((recommendation, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          {getRecommendationIcon(recommendation)}
                        </ListItemIcon>
                        <ListItemText primary={recommendation} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
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

export default WardDetailsModal;
