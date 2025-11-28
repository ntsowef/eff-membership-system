import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import wardAuditApi from '../../services/wardAuditApi';
import type { MunicipalityDelegateReport as ReportType, WardComplianceSummary } from '../../types/wardAudit';

const MunicipalityDelegateReport: React.FC = () => {
  const { municipalityCode } = useParams<{ municipalityCode: string }>();
  const navigate = useNavigate();
  
  // Fetch municipality delegate report
  const { 
    data: report, 
    isLoading,
    error 
  } = useQuery({
    queryKey: ['municipality-delegate-report', municipalityCode],
    queryFn: () => wardAuditApi.getMunicipalityDelegateReport(municipalityCode!),
    enabled: !!municipalityCode,
  });
  
  const handleViewWardDetails = (wardCode: string) => {
    navigate(`/admin/ward-audit/ward/${wardCode}`);
  };
  
  const handleExportReport = () => {
    // TODO: Implement export functionality (CSV/PDF)
    console.log('Export report:', report);
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || !report) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load municipality delegate report. Please try again.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom>
            Municipality Delegate Report
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {report.municipality_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {report.district_code} • {report.province_code}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportReport}
        >
          Export Report
        </Button>
      </Box>
      
      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Wards
              </Typography>
              <Typography variant="h3">
                {report.total_wards}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Compliant Wards
              </Typography>
              <Typography variant="h3" color="success.main">
                {report.compliant_wards}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={report.compliance_percentage} 
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {report.compliance_percentage.toFixed(1)}% compliance rate
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Non-Compliant Wards
              </Typography>
              <Typography variant="h3" color="error.main">
                {report.non_compliant_wards}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Delegates
              </Typography>
              <Typography variant="h3">
                {report.total_srpa_delegates + report.total_ppa_delegates + report.total_npa_delegates}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Across all assemblies
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Delegate Breakdown */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                SRPA Delegates
              </Typography>
              <Typography variant="h3" color="primary.main">
                {report.total_srpa_delegates}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Sub-Regional People's Assembly
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                PPA Delegates
              </Typography>
              <Typography variant="h3" color="primary.main">
                {report.total_ppa_delegates}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Provincial People's Assembly
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                NPA Delegates
              </Typography>
              <Typography variant="h3" color="primary.main">
                {report.total_npa_delegates}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                National People's Assembly
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Ward-by-Ward Breakdown */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Ward-by-Ward Breakdown
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ward</TableCell>
                <TableCell align="center">Members</TableCell>
                <TableCell align="center">VDs Compliant</TableCell>
                <TableCell align="center">Criterion 1</TableCell>
                <TableCell align="center">Approved</TableCell>
                <TableCell align="center">SRPA</TableCell>
                <TableCell align="center">PPA</TableCell>
                <TableCell align="center">NPA</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.wards.map((ward: WardComplianceSummary) => (
                <TableRow key={ward.ward_code} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {ward.ward_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ward.ward_code}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={ward.total_members}
                      size="small"
                      color={ward.meets_member_threshold ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {ward.compliant_voting_districts} / {ward.total_voting_districts}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {ward.criterion_1_compliant ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <CancelIcon color="error" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {ward.is_compliant ? (
                      <Chip label="Yes" size="small" color="success" />
                    ) : (
                      <Chip label="No" size="small" color="default" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={ward.srpa_delegates} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={ward.ppa_delegates} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={ward.npa_delegates} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleViewWardDetails(ward.ward_code)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Summary Notes */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'info.light' }}>
        <Typography variant="h6" gutterBottom>
          Report Summary
        </Typography>
        <Typography variant="body2" paragraph>
          This municipality has <strong>{report.total_wards}</strong> wards, with{' '}
          <strong>{report.compliant_wards}</strong> ({report.compliance_percentage.toFixed(1)}%) 
          approved as compliant.
        </Typography>
        <Typography variant="body2" paragraph>
          A total of <strong>{report.total_srpa_delegates + report.total_ppa_delegates + report.total_npa_delegates}</strong>{' '}
          delegates have been selected across all assemblies:
        </Typography>
        <ul>
          <li>
            <Typography variant="body2">
              <strong>SRPA:</strong> {report.total_srpa_delegates} delegates
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>PPA:</strong> {report.total_ppa_delegates} delegates
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>NPA:</strong> {report.total_npa_delegates} delegates
            </Typography>
          </li>
        </ul>
        {report.non_compliant_wards > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>{report.non_compliant_wards}</strong> ward(s) still require compliance approval. 
              Please review and address any outstanding issues.
            </Typography>
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default MunicipalityDelegateReport;

