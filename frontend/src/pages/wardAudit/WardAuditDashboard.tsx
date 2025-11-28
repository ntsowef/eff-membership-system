import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  HowToVote as HowToVoteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import wardAuditApi from '../../services/wardAuditApi';
import type { WardComplianceSummary, Municipality } from '../../types/wardAudit';

const WardAuditDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // State for cascading filters
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  
  // Hardcoded provinces (you can fetch from API if needed)
  const provinces = [
    { code: 'EC', name: 'Eastern Cape' },
    { code: 'FS', name: 'Free State' },
    { code: 'GP', name: 'Gauteng' },
    { code: 'KZN', name: 'KwaZulu-Natal' },
    { code: 'LP', name: 'Limpopo' },
    { code: 'MP', name: 'Mpumalanga' },
    { code: 'NC', name: 'Northern Cape' },
    { code: 'NW', name: 'North West' },
    { code: 'WC', name: 'Western Cape' },
  ];
  
  // Fetch municipalities when province is selected
  const { data: municipalities = [], isLoading: municipalitiesLoading } = useQuery({
    queryKey: ['ward-audit-municipalities', selectedProvince],
    queryFn: () => wardAuditApi.getMunicipalitiesByProvince(selectedProvince),
    enabled: !!selectedProvince,
  });
  
  // Fetch wards when municipality is selected
  const { 
    data: wards = [], 
    isLoading: wardsLoading,
    error: wardsError 
  } = useQuery({
    queryKey: ['ward-audit-wards', selectedMunicipality],
    queryFn: () => wardAuditApi.getWardsByMunicipality(selectedMunicipality),
    enabled: !!selectedMunicipality,
  });
  
  // Calculate statistics
  const stats = {
    totalWards: wards.length,
    compliantWards: wards.filter(w => w.is_compliant).length,
    nonCompliantWards: wards.filter(w => !w.is_compliant).length,
    criterion1Compliant: wards.filter(w => w.criterion_1_compliant).length,
    totalSrpaDelegates: wards.reduce((sum, w) => sum + (w.srpa_delegates || 0), 0),
    totalPpaDelegates: wards.reduce((sum, w) => sum + (w.ppa_delegates || 0), 0),
    totalNpaDelegates: wards.reduce((sum, w) => sum + (w.npa_delegates || 0), 0),
  };
  
  const compliancePercentage = stats.totalWards > 0 
    ? Math.round((stats.compliantWards / stats.totalWards) * 100) 
    : 0;
  
  const handleProvinceChange = (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    setSelectedMunicipality(''); // Reset municipality when province changes
  };
  
  const handleMunicipalityChange = (municipalityCode: string) => {
    setSelectedMunicipality(municipalityCode);
  };
  
  const handleViewWardDetails = (wardCode: string) => {
    navigate(`/admin/ward-audit/ward/${wardCode}`);
  };
  
  const handleViewMunicipalityReport = () => {
    if (selectedMunicipality) {
      navigate(`/admin/ward-audit/municipality/${selectedMunicipality}`);
    }
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Ward Audit System
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive ward compliance tracking and delegate management
        </Typography>
      </Box>
      
      {/* Cascading Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Geographic Filters
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Province</InputLabel>
              <Select
                value={selectedProvince}
                onChange={(e) => handleProvinceChange(e.target.value)}
                label="Province"
              >
                <MenuItem value="">
                  <em>Select Province</em>
                </MenuItem>
                {provinces.map((province) => (
                  <MenuItem key={province.code} value={province.code}>
                    {province.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={!selectedProvince}>
              <InputLabel>Municipality / Sub-Region</InputLabel>
              <Select
                value={selectedMunicipality}
                onChange={(e) => handleMunicipalityChange(e.target.value)}
                label="Municipality / Sub-Region"
              >
                <MenuItem value="">
                  <em>Select Municipality</em>
                </MenuItem>
                {municipalitiesLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Loading...
                  </MenuItem>
                ) : (
                  municipalities.map((municipality: Municipality) => (
                    <MenuItem key={municipality.municipality_code} value={municipality.municipality_code}>
                      {municipality.municipality_name}
                      {municipality.municipality_type === 'Metro Sub-Region' && ' (Sub-Region)'}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              onClick={handleViewMunicipalityReport}
              disabled={!selectedMunicipality || wards.length === 0}
              fullWidth
            >
              View Municipality Report
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Statistics Cards */}
      {selectedMunicipality && wards.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Wards
                </Typography>
                <Typography variant="h4">{stats.totalWards}</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Compliant Wards
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.compliantWards}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {compliancePercentage}% compliance rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Criterion 1 Met
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {stats.criterion1Compliant}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  200+ members & VD compliance
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Delegates
                </Typography>
                <Typography variant="h4">
                  {stats.totalSrpaDelegates + stats.totalPpaDelegates + stats.totalNpaDelegates}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  SRPA: {stats.totalSrpaDelegates} | PPA: {stats.totalPpaDelegates} | NPA: {stats.totalNpaDelegates}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Wards Table */}
      {selectedMunicipality && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Wards in {municipalities.find(m => m.municipality_code === selectedMunicipality)?.municipality_name}
          </Typography>
          
          {wardsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : wardsError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to load wards. Please try again.
            </Alert>
          ) : wards.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No wards found for this municipality.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ward</TableCell>
                    <TableCell align="center">Members</TableCell>
                    <TableCell align="center">VDs</TableCell>
                    <TableCell align="center">Criterion 1</TableCell>
                    <TableCell align="center">Approved</TableCell>
                    <TableCell align="center">Delegates</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wards.map((ward: WardComplianceSummary) => (
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
                          <Chip label="Approved" size="small" color="success" />
                        ) : (
                          <Chip label="Pending" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="SRPA">
                            <Chip label={ward.srpa_delegates} size="small" />
                          </Tooltip>
                          <Tooltip title="PPA">
                            <Chip label={ward.ppa_delegates} size="small" />
                          </Tooltip>
                          <Tooltip title="NPA">
                            <Chip label={ward.npa_delegates} size="small" />
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewWardDetails(ward.ward_code)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
      
      {/* Empty State */}
      {!selectedProvince && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <HowToVoteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Select a Province to Begin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a province from the dropdown above to view ward audit data
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default WardAuditDashboard;

