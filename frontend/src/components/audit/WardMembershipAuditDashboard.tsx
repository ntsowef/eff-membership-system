import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Alert,
  Snackbar,
  Paper,
  Button,
  ButtonGroup
} from '@mui/material';
import ProvinceContextBanner from '../common/ProvinceContextBanner';
import MunicipalityContextBanner from '../common/MunicipalityContextBanner';
import { useProvinceContext } from '../../hooks/useProvinceContext';
import { useProvincePageTitle } from '../../hooks/useProvincePageTitle';
import { useMunicipalityContext } from '../../hooks/useMunicipalityContext';
import { useWardMembershipAuditStore } from '../../store/wardMembershipAuditStore';
import WardAuditOverview from './WardAuditOverview';
import WardAuditTable from './WardAuditTable';
import MunicipalityPerformanceTable from './MunicipalityPerformanceTable';
import WardTrendsAnalysis from './WardTrendsAnalysis';

interface TabPanelProps {
  children?: React.ReactNode;
  index: string;
  value: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ward-audit-tabpanel-${index}`}
      aria-labelledby={`ward-audit-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const WardMembershipAuditDashboard: React.FC = () => {
  const { uiState, setUIState } = useWardMembershipAuditStore();
  const provinceContext = useProvinceContext();
  const municipalityContext = useMunicipalityContext();
  const pageTitle = useProvincePageTitle('Ward Membership Audit');

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleTabChange = (tabName: string) => {
    setUIState({ activeTab: tabName as any });
  };

  const handleShowSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleExportSuccess = (type: string) => {
    handleShowSnackbar(`${type} report exported successfully`, 'success');
  };

  const handleExportError = (error: string) => {
    handleShowSnackbar(`Export failed: ${error}`, 'error');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Province Context Banner for Provincial Admin */}
      <ProvinceContextBanner variant="banner" sx={{ mb: 3 }} />

      {/* Municipality Context Banner for Municipality Admin */}
      <MunicipalityContextBanner variant="banner" sx={{ mb: 3 }} />

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {pageTitle}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {municipalityContext.shouldRestrictToMunicipality
            ? `Ward membership audit for ${municipalityContext.assignedMunicipality?.name || 'your municipality'} - Monitor ward performance and compliance within your municipality`
            : provinceContext.isProvincialAdmin
            ? `Comprehensive oversight of ward performance and municipality compliance within ${provinceContext.assignedProvince?.name || 'your province'}`
            : 'Comprehensive oversight of ward performance and municipality compliance with hierarchical analysis'
          }
        </Typography>
      </Box>

      {/* Navigation Tabs - Using ButtonGroup instead of MUI Tabs to avoid infinite loop */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <ButtonGroup variant="outlined" fullWidth>
            <Button
              variant={uiState.activeTab === 'overview' ? 'contained' : 'outlined'}
              onClick={() => handleTabChange('overview')}
            >
              Overview
            </Button>
            <Button
              variant={uiState.activeTab === 'wards' ? 'contained' : 'outlined'}
              onClick={() => handleTabChange('wards')}
            >
              Ward Audit
            </Button>
            <Button
              variant={uiState.activeTab === 'municipalities' ? 'contained' : 'outlined'}
              onClick={() => handleTabChange('municipalities')}
            >
              Municipality Performance
            </Button>
            <Button
              variant={uiState.activeTab === 'trends' ? 'contained' : 'outlined'}
              onClick={() => handleTabChange('trends')}
            >
              Trends Analysis
            </Button>
          </ButtonGroup>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={uiState.activeTab} index="overview">
          <WardAuditOverview
            onViewWardDetails={(standing) => {
              setUIState({
                activeTab: 'wards',
                wardFilters: {
                  ...uiState.wardFilters,
                  standing: standing as any,
                  page: 1
                }
              });
            }}
            onViewMunicipalityDetails={(performance) => {
              setUIState({
                activeTab: 'municipalities',
                municipalityFilters: {
                  ...uiState.municipalityFilters,
                  performance: performance as any,
                  page: 1
                }
              });
            }}
            onShowMessage={handleShowSnackbar}
          />
        </TabPanel>

        <TabPanel value={uiState.activeTab} index="wards">
          <WardAuditTable
            onExportSuccess={() => handleExportSuccess('Ward Audit')}
            onExportError={handleExportError}
            onShowMessage={handleShowSnackbar}
          />
        </TabPanel>

        <TabPanel value={uiState.activeTab} index="municipalities">
          <MunicipalityPerformanceTable
            onExportSuccess={() => handleExportSuccess('Municipality Performance')}
            onExportError={handleExportError}
            onShowMessage={handleShowSnackbar}
          />
        </TabPanel>

        <TabPanel value={uiState.activeTab} index="trends">
          <WardTrendsAnalysis
            onShowMessage={handleShowSnackbar}
          />
        </TabPanel>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default WardMembershipAuditDashboard;
