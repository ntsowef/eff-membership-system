// GeographicFilterTest Component
// Test component to verify geographic filtering works correctly

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Alert, 
  Button, 
  Card, 
  CardContent, 
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress 
} from '@mui/material';
import { CheckCircle, LocationOn, Search } from '@mui/icons-material';
import { useUI } from '../../store';
import * as LeadershipService from '../../services/leadershipApi';

const { LeadershipAPI } = LeadershipService;
type MemberFilters = LeadershipService.MemberFilters;

const GeographicFilterTest: React.FC = () => {
  const { addNotification } = useUI();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  // Filter state
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [geographicCode, setGeographicCode] = useState<string>('');

  const testGeographicFilter = async () => {
    if (!filterLevel || !geographicCode) {
      addNotification({
        type: 'warning',
        message: 'Please select a filter level and enter a geographic code'
      });
      return;
    }

    setLoading(true);
    setResults(null);
    
    try {
      // Build filters based on selected level
      const filters: MemberFilters = {
        page: 1,
        limit: 10
      };

      switch (filterLevel) {
        case 'Province':
          filters.province_code = geographicCode;
          break;
        case 'District':
          filters.district_code = geographicCode;
          break;
        case 'Municipality':
          filters.municipality_code = geographicCode;
          break;
        case 'Ward':
          filters.ward_code = geographicCode;
          break;
      }

      console.log('Testing geographic filter:', { filterLevel, geographicCode, filters });
      
      const response = await LeadershipAPI.getMembers(filters);
      
      setResults({
        success: true,
        data: response,
        message: `Found ${response.members?.length || 0} members in ${filterLevel}: ${geographicCode}`
      });
      
      addNotification({
        type: 'success',
        message: `✅ Geographic filter test successful! Found ${response.members?.length || 0} members`
      });
      
    } catch (error: any) {
      console.error('Geographic filter test error:', error);
      
      setResults({
        success: false,
        error: error.message,
        details: error.response?.data || error
      });
      
      addNotification({
        type: 'error',
        message: `❌ Geographic filter test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testCommonCodes = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      // Test with common South African province codes
      const testCases = [
        { level: 'Province', code: 'GP', name: 'Gauteng' },
        { level: 'Province', code: 'WC', name: 'Western Cape' },
        { level: 'Province', code: 'KZN', name: 'KwaZulu-Natal' }
      ];

      const testResults = [];
      
      for (const testCase of testCases) {
        try {
          const filters: MemberFilters = {
            page: 1,
            limit: 5,
            province_code: testCase.code
          };
          
          const response = await LeadershipAPI.getMembers(filters);
          testResults.push({
            ...testCase,
            success: true,
            memberCount: response.members?.length || 0
          });
        } catch (error) {
          testResults.push({
            ...testCase,
            success: false,
            error: error.message
          });
        }
      }
      
      setResults({
        success: true,
        data: { testResults },
        message: `Tested ${testResults.length} common province codes`
      });
      
      const successCount = testResults.filter(r => r.success).length;
      addNotification({
        type: successCount > 0 ? 'success' : 'warning',
        message: `✅ Common codes test: ${successCount}/${testResults.length} successful`
      });
      
    } catch (error: any) {
      console.error('Common codes test error:', error);
      
      setResults({
        success: false,
        error: error.message,
        details: error
      });
      
      addNotification({
        type: 'error',
        message: `❌ Common codes test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="primary">
        🗺️ Geographic Filter Test
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Testing geographic filtering implementation:</strong>
          <br />
          • Fixed entity ID mapping to use proper geographic codes
          <br />
          • Supports Province, District, Municipality, and Ward filtering
          <br />
          • Uses backend-compatible parameter validation
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Manual Geographic Filter Test
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Filter Level</InputLabel>
              <Select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                label="Filter Level"
              >
                <MenuItem value="Province">Province</MenuItem>
                <MenuItem value="District">District</MenuItem>
                <MenuItem value="Municipality">Municipality</MenuItem>
                <MenuItem value="Ward">Ward</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Geographic Code"
              value={geographicCode}
              onChange={(e) => setGeographicCode(e.target.value)}
              placeholder="e.g., GP, WC, KZN"
              sx={{ minWidth: 200 }}
            />
            
            <Button
              variant="contained"
              onClick={testGeographicFilter}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Search />}
            >
              Test Filter
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            <strong>Example codes:</strong> GP (Gauteng), WC (Western Cape), KZN (KwaZulu-Natal)
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Common Codes Test
          </Typography>
          
          <Button
            variant="outlined"
            onClick={testCommonCodes}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LocationOn />}
            sx={{ mb: 2 }}
          >
            Test Common Province Codes
          </Button>
          
          <Typography variant="body2" color="text.secondary">
            Tests filtering with common South African province codes (GP, WC, KZN)
          </Typography>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Results
            </Typography>
            
            {results.success ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>✅ Success:</strong> {results.message}
                </Typography>
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>❌ Error:</strong> {results.error}
                </Typography>
              </Alert>
            )}
            
            <Box component="pre" sx={{ 
              bgcolor: 'grey.100', 
              p: 2, 
              borderRadius: 1, 
              overflow: 'auto',
              fontSize: '0.875rem',
              maxHeight: 400
            }}>
              {JSON.stringify(results, null, 2)}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default GeographicFilterTest;
