import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { geographicApi } from '../../services/api';
import { devLog } from '../../utils/logger';

const APIDebugTest: React.FC = () => {
  const [testParams, setTestParams] = useState({
    provinceCode: 'KZN',
    districtCode: 'ETH',
    municipalCode: 'ETH',
    wardCode: '59500105'
  });
  const [activeTest, setActiveTest] = useState<string>('');

  // Test provinces
  const { data: provinces, isLoading: provincesLoading, error: provincesError } = useQuery({
    queryKey: ['debug-provinces'],
    queryFn: () => {
      devLog('🌍 API Call: getProvinces()');
      return geographicApi.getProvinces();
    },
    enabled: activeTest === 'provinces',
  });

  // Test districts
  const { data: districts, isLoading: districtsLoading, error: districtsError } = useQuery({
    queryKey: ['debug-districts', testParams.provinceCode],
    queryFn: () => {
      devLog('🏘️ API Call: getDistricts(' + testParams.provinceCode + ')');
      return geographicApi.getDistricts(testParams.provinceCode);
    },
    enabled: activeTest === 'districts',
  });

  // Test municipalities
  const { data: municipalities, isLoading: municipalitiesLoading, error: municipalitiesError } = useQuery({
    queryKey: ['debug-municipalities', testParams.districtCode],
    queryFn: () => {
      devLog('🏢 API Call: getMunicipalities(' + testParams.districtCode + ')');
      return geographicApi.getMunicipalities(testParams.districtCode);
    },
    enabled: activeTest === 'municipalities',
  });

  // Test wards
  const { data: wards, isLoading: wardsLoading, error: wardsError } = useQuery({
    queryKey: ['debug-wards', testParams.municipalCode],
    queryFn: () => {
      devLog('🏘️ API Call: getWards(' + testParams.municipalCode + ')');
      return geographicApi.getWards(testParams.municipalCode);
    },
    enabled: activeTest === 'wards',
  });

  // Test voting districts
  const { data: votingDistricts, isLoading: votingDistrictsLoading, error: votingDistrictsError } = useQuery({
    queryKey: ['debug-voting-districts', testParams.wardCode],
    queryFn: () => {
      devLog('🗳️ API Call: getVotingDistrictsByWard(' + testParams.wardCode + ')');
      return geographicApi.getVotingDistrictsByWard(testParams.wardCode);
    },
    enabled: activeTest === 'voting-districts',
  });

  const runTest = (testType: string) => {
    setActiveTest(testType);
  };

  const renderTestResult = (testType: string, data: any, loading: boolean, error: any) => {
    if (!activeTest || activeTest !== testType) return null;

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {testType.charAt(0).toUpperCase() + testType.slice(1)} Test Results
          </Typography>
          
          {loading && (
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={20} />
              <Typography>Loading {testType}...</Typography>
            </Box>
          )}
          
          {error && (
            <Alert severity="error">
              <Typography variant="body2">
                <strong>Error:</strong> {error.message}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Check browser console for detailed error information
              </Typography>
            </Alert>
          )}
          
          {data && !loading && !error && (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Success!</strong> Retrieved {data.data?.length || 0} {testType}
                </Typography>
              </Alert>
              
              <Box 
                component="pre" 
                sx={{ 
                  backgroundColor: 'grey.100', 
                  p: 2, 
                  borderRadius: 1, 
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: 300
                }}
              >
                {JSON.stringify(data, null, 2)}
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        API Debug Test
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          This page tests each API endpoint individually to debug any issues.
          Check the browser console for detailed API call logs.
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Parameters
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Province Code"
                value={testParams.provinceCode}
                onChange={(e) => setTestParams(prev => ({ ...prev, provinceCode: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="District Code"
                value={testParams.districtCode}
                onChange={(e) => setTestParams(prev => ({ ...prev, districtCode: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Municipal Code"
                value={testParams.municipalCode}
                onChange={(e) => setTestParams(prev => ({ ...prev, municipalCode: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Ward Code"
                value={testParams.wardCode}
                onChange={(e) => setTestParams(prev => ({ ...prev, wardCode: e.target.value }))}
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            API Tests
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button 
              variant={activeTest === 'provinces' ? 'contained' : 'outlined'}
              onClick={() => runTest('provinces')}
            >
              Test Provinces
            </Button>
            <Button 
              variant={activeTest === 'districts' ? 'contained' : 'outlined'}
              onClick={() => runTest('districts')}
            >
              Test Districts
            </Button>
            <Button 
              variant={activeTest === 'municipalities' ? 'contained' : 'outlined'}
              onClick={() => runTest('municipalities')}
            >
              Test Municipalities
            </Button>
            <Button 
              variant={activeTest === 'wards' ? 'contained' : 'outlined'}
              onClick={() => runTest('wards')}
            >
              Test Wards
            </Button>
            <Button 
              variant={activeTest === 'voting-districts' ? 'contained' : 'outlined'}
              onClick={() => runTest('voting-districts')}
            >
              Test Voting Districts
            </Button>
          </Box>
        </CardContent>
      </Card>

      {renderTestResult('provinces', provinces, provincesLoading, provincesError)}
      {renderTestResult('districts', districts, districtsLoading, districtsError)}
      {renderTestResult('municipalities', municipalities, municipalitiesLoading, municipalitiesError)}
      {renderTestResult('wards', wards, wardsLoading, wardsError)}
      {renderTestResult('voting-districts', votingDistricts, votingDistrictsLoading, votingDistrictsError)}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Expected Flow
          </Typography>
          
          <Typography variant="body2" paragraph>
            1. <strong>Provinces:</strong> Should return 9 provinces
          </Typography>
          <Typography variant="body2" paragraph>
            2. <strong>Districts:</strong> Should return districts for KZN province
          </Typography>
          <Typography variant="body2" paragraph>
            3. <strong>Municipalities:</strong> Should return municipalities for ETH district
          </Typography>
          <Typography variant="body2" paragraph>
            4. <strong>Wards:</strong> Should return 111 wards for ETH municipality
          </Typography>
          <Typography variant="body2" paragraph>
            5. <strong>Voting Districts:</strong> Should return 28 voting districts for ward 59500105
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default APIDebugTest;
