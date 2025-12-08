import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
} from '@mui/material';
import {
  Assessment,
  PictureAsPdf,
  TableChart,
  TrendingUp,
  People,
  LocationOn,
  Event,
  Download,
  Close,
  Dashboard,
  // Lightbulb,
  Person,
  Compare,
  CalendarMonth,
  Groups,
  CalendarToday,
} from '@mui/icons-material';
import PerformanceDashboard from '../../components/reports/PerformanceDashboard';
import StrategicInsights from '../../components/reports/StrategicInsights';
import MemberDirectory from '../../components/reports/MemberDirectory';
import DemographicsReport from '../../components/reports/DemographicsReport';
import ProvincialDistributionReport from '../../components/reports/ProvincialDistributionReport';
import RegionalComparisonReport from '../../components/reports/RegionalComparisonReport';
import MonthlySummaryReport from '../../components/reports/MonthlySummaryReport';
import { reportsApi } from '../../services/reportsApi';

const ReportsPage: React.FC = () => {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [strategicInsightsOpen, setStrategicInsightsOpen] = useState(false);
  const [memberDirectoryOpen, setMemberDirectoryOpen] = useState(false);
  const [demographicsReportOpen, setDemographicsReportOpen] = useState(false);
  const [provincialDistributionOpen, setProvincialDistributionOpen] = useState(false);
  const [regionalComparisonOpen, setRegionalComparisonOpen] = useState(false);
  const [monthlySummaryOpen, setMonthlySummaryOpen] = useState(false);

  // Excel Reports State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedExcelReport, setSelectedExcelReport] = useState<string | null>(null);
  const [reportFilters, setReportFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    province_code: '',
    municipality_code: '',
    ward_code: '',
  });

  // Excel Report Download Handler
  const handleDownloadExcelReport = async (reportType: string) => {
    setIsDownloading(true);
    setDownloadingReport(reportType);

    try {
      let result;
      switch (reportType) {
        case 'ward-audit':
          result = await reportsApi.downloadWardAuditReport({
            province_code: reportFilters.province_code,
            municipality_code: reportFilters.municipality_code,
          });
          break;
        case 'daily-report':
          result = await reportsApi.downloadDailyReport({
            date: reportFilters.date,
          });
          break;
        case 'srpa-delegates':
          result = await reportsApi.downloadSRPADelegatesReport({
            province_code: reportFilters.province_code,
            municipality_code: reportFilters.municipality_code,
            ward_code: reportFilters.ward_code,
          });
          break;
        default:
          throw new Error('Unknown report type');
      }

      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success',
      });
      setFilterDialogOpen(false);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to download report',
        severity: 'error',
      });
    } finally {
      setIsDownloading(false);
      setDownloadingReport(null);
    }
  };

  const handleOpenFilterDialog = (reportType: string) => {
    setSelectedExcelReport(reportType);
    setFilterDialogOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const reportCategories = [
    {
      title: 'Membership Reports',
      icon: <People color="primary" />,
      reports: [
        { name: 'Member Directory', description: 'Complete list of all members with contact details', format: 'PDF/Excel' },
        { name: 'Membership Growth Report', description: 'Monthly and yearly membership growth analysis', format: 'PDF' },
        { name: 'Demographics Report', description: 'Age, gender, and geographic distribution analysis', format: 'PDF/Excel' },
        { name: 'Inactive Members Report', description: 'List of inactive members for re-engagement', format: 'Excel' },
      ],
    },
    {
      title: 'Geographic Reports',
      icon: <LocationOn color="primary" />,
      reports: [
        { name: 'Provincial Distribution', description: 'Member distribution across provinces', format: 'PDF' },
        { name: 'Ward Performance Report', description: 'Performance metrics by ward', format: 'PDF/Excel' },
        { name: 'Expansion Opportunities', description: 'Areas with growth potential', format: 'PDF' },
        { name: 'Regional Comparison', description: 'Comparative analysis across regions', format: 'PDF' },
      ],
    },
    {
      title: 'Activity Reports',
      icon: <Event color="primary" />,
      reports: [
        { name: 'Meeting Attendance', description: 'Meeting attendance rates and trends', format: 'PDF/Excel' },
        { name: 'Election Participation', description: 'Voting participation and results', format: 'PDF' },
        { name: 'Engagement Metrics', description: 'Member engagement and activity levels', format: 'PDF' },
        { name: 'Leadership Report', description: 'Leadership positions and appointments', format: 'PDF/Excel' },
      ],
    },
    {
      title: 'Analytics Reports',
      icon: <TrendingUp color="primary" />,
      reports: [
        { name: 'Performance Dashboard', description: 'Key performance indicators summary', format: 'PDF' },
        { name: 'Trend Analysis', description: 'Historical trends and projections', format: 'PDF' },
        { name: 'Risk Assessment', description: 'Risk factors and mitigation strategies', format: 'PDF' },
        { name: 'Strategic Insights', description: 'Business intelligence recommendations', format: 'PDF' },
      ],
    },
  ];

  const handleGenerateReport = (reportName: string) => {
    console.log(`Generating report: ${reportName}`);

    // Handle Performance Dashboard specially
    if (reportName === 'Performance Dashboard') {
      setDashboardOpen(true);
      return;
    }

    // Handle Strategic Insights specially
    if (reportName === 'Strategic Insights') {
      setStrategicInsightsOpen(true);
      return;
    }

    // Handle Member Directory specially
    if (reportName === 'Member Directory') {
      setMemberDirectoryOpen(true);
      return;
    }

    // Handle Demographics Report specially
    if (reportName === 'Demographics Report') {
      setDemographicsReportOpen(true);
      return;
    }

    // Handle Provincial Distribution Report specially
    if (reportName === 'Provincial Distribution') {
      setProvincialDistributionOpen(true);
      return;
    }

    // Handle Regional Comparison Report specially
    if (reportName === 'Regional Comparison') {
      setRegionalComparisonOpen(true);
      return;
    }

    // Handle Monthly Summary Report specially
    if (reportName === 'Monthly Summary') {
      setMonthlySummaryOpen(true);
      return;
    }

    // TODO: Implement other report generation logic
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment color="primary" />
          Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate comprehensive reports and export data for analysis and decision-making.
        </Typography>
      </Box>

      {/* Excel Reports Section */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableChart />
          Excel Reports (Professional Format)
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
          Download professionally formatted Excel reports with multiple worksheets, borders, and styling
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Assessment color="primary" />
                  <Typography variant="h6">Ward Audit Report</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Provincial and municipality-level membership audit with detailed statistics (2 sheets)
                </Typography>
                <Chip label="2 Worksheets" size="small" color="primary" sx={{ mb: 2 }} />
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={isDownloading && downloadingReport === 'ward-audit' ? <CircularProgress size={16} /> : <Download />}
                  onClick={() => handleOpenFilterDialog('ward-audit')}
                  disabled={isDownloading}
                >
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CalendarToday color="primary" />
                  <Typography variant="h6">Daily Report</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ward-level membership compliance analysis by municipality/district with IEC wards master list (2 sheets)
                </Typography>
                <Chip label="2 Worksheets" size="small" color="primary" sx={{ mb: 2 }} />
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={isDownloading && downloadingReport === 'daily-report' ? <CircularProgress size={16} /> : <Download />}
                  onClick={() => handleOpenFilterDialog('daily-report')}
                  disabled={isDownloading}
                >
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Groups color="primary" />
                  <Typography variant="h6">SRPA Delegates</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Sub-Regional People's Assembly delegates organized by province with national summary (10 sheets)
                </Typography>
                <Chip label="10 Worksheets" size="small" color="primary" sx={{ mb: 2 }} />
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={isDownloading && downloadingReport === 'srpa-delegates' ? <CircularProgress size={16} /> : <Download />}
                  onClick={() => handleOpenFilterDialog('srpa-delegates')}
                  disabled={isDownloading}
                >
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Quick Actions</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PictureAsPdf />}
              onClick={() => handleGenerateReport('Monthly Summary')}
              sx={{ py: 1.5 }}
            >
              Monthly Summary
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Person />}
              onClick={() => handleGenerateReport('Member Directory')}
              sx={{ py: 1.5 }}
            >
              Member Directory
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Assessment />}
              onClick={() => handleGenerateReport('Demographics Report')}
              sx={{ py: 1.5 }}
            >
              Demographics Report
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<LocationOn />}
              onClick={() => handleGenerateReport('Provincial Distribution')}
              sx={{ py: 1.5 }}
            >
              Provincial Distribution
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Compare />}
              onClick={() => handleGenerateReport('Regional Comparison')}
              sx={{ py: 1.5 }}
            >
              Regional Comparison
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<CalendarMonth />}
              onClick={() => handleGenerateReport('Monthly Summary')}
              sx={{ py: 1.5 }}
            >
              Monthly Summary
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<Dashboard />}
              onClick={() => handleGenerateReport('Performance Dashboard')}
              sx={{ py: 1.5 }}
            >
              Performance Dashboard
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Report Categories */}
      <Grid container spacing={3}>
        {reportCategories.map((category, index) => (
          <Grid item xs={12} lg={6} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {category.icon}
                  {category.title}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List dense>
                  {category.reports.map((report, reportIndex) => (
                    <ListItem
                      key={reportIndex}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon>
                        <Download color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2">{report.name}</Typography>
                            <Chip label={report.format} size="small" variant="outlined" />
                          </Box>
                        }
                        secondary={report.description}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleGenerateReport(report.name)}
                        sx={{ ml: 1 }}
                      >
                        Generate
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Status Information */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="h6" gutterBottom>Report Generation Status</Typography>
        <Typography variant="body2">
          Reports are generated in real-time based on current data. Large reports may take a few moments to process.
          All reports include data as of the current date and time.
        </Typography>
      </Paper>

      {/* Performance Dashboard Dialog */}
      <Dialog
        open={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Performance Dashboard
          <IconButton onClick={() => setDashboardOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <PerformanceDashboard />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDashboardOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<Download />}>
            Export Dashboard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Strategic Insights Dialog */}
      <Dialog
        open={strategicInsightsOpen}
        onClose={() => setStrategicInsightsOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Strategic Insights Report
          <IconButton onClick={() => setStrategicInsightsOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <StrategicInsights />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStrategicInsightsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Member Directory Dialog */}
      <Dialog
        open={memberDirectoryOpen}
        onClose={() => setMemberDirectoryOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Member Directory Report
          <IconButton onClick={() => setMemberDirectoryOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <MemberDirectory />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDirectoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Demographics Report Dialog */}
      <Dialog
        open={demographicsReportOpen}
        onClose={() => setDemographicsReportOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Demographics Report
          <IconButton onClick={() => setDemographicsReportOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <DemographicsReport />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDemographicsReportOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Provincial Distribution Report Dialog */}
      <Dialog
        open={provincialDistributionOpen}
        onClose={() => setProvincialDistributionOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Provincial Distribution Report
          <IconButton onClick={() => setProvincialDistributionOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <ProvincialDistributionReport />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProvincialDistributionOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Regional Comparison Report Dialog */}
      <Dialog
        open={regionalComparisonOpen}
        onClose={() => setRegionalComparisonOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Regional Comparison Report
          <IconButton onClick={() => setRegionalComparisonOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <RegionalComparisonReport />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegionalComparisonOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Monthly Summary Report Dialog */}
      <Dialog
        open={monthlySummaryOpen}
        onClose={() => setMonthlySummaryOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Monthly Summary Report
          <IconButton onClick={() => setMonthlySummaryOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <MonthlySummaryReport />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMonthlySummaryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Excel Report Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedExcelReport === 'ward-audit' && 'Ward Audit Report Filters'}
          {selectedExcelReport === 'daily-report' && 'Daily Report Filters'}
          {selectedExcelReport === 'srpa-delegates' && 'SRPA Delegates Report Filters'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(selectedExcelReport === 'ward-audit' || selectedExcelReport === 'srpa-delegates') && (
              <>
                <TextField
                  label="Province Code (Optional)"
                  value={reportFilters.province_code}
                  onChange={(e) => setReportFilters({ ...reportFilters, province_code: e.target.value })}
                  fullWidth
                  placeholder="e.g., GP, WC, EC"
                  helperText="Leave empty for all provinces"
                />
                <TextField
                  label="Municipality Code (Optional)"
                  value={reportFilters.municipality_code}
                  onChange={(e) => setReportFilters({ ...reportFilters, municipality_code: e.target.value })}
                  fullWidth
                  placeholder="e.g., JHB, CPT"
                  helperText="Leave empty for all municipalities"
                />
              </>
            )}
            {selectedExcelReport === 'srpa-delegates' && (
              <TextField
                label="Ward Code (Optional)"
                value={reportFilters.ward_code}
                onChange={(e) => setReportFilters({ ...reportFilters, ward_code: e.target.value })}
                fullWidth
                placeholder="e.g., 79790001"
                helperText="Leave empty for all wards"
              />
            )}
            <Alert severity="info">
              {selectedExcelReport === 'ward-audit' && 'This report contains 2 worksheets: Provincial Summary and Municipality Detail'}
              {selectedExcelReport === 'daily-report' && 'This report contains 2 worksheets: Municipality/District Analysis and IEC Wards Master List (~4,400 wards)'}
              {selectedExcelReport === 'srpa-delegates' && 'This report contains 10 worksheets: 9 provinces + National Summary'}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => selectedExcelReport && handleDownloadExcelReport(selectedExcelReport)}
            disabled={isDownloading}
            startIcon={isDownloading ? <CircularProgress size={16} /> : <Download />}
          >
            Download Excel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReportsPage;
