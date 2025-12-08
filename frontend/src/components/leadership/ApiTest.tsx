// ApiTest Component
// Test component to verify API calls work correctly with proper parameters

import React, { useState } from 'react';
import { Box, Typography, Alert, Button, Card, CardContent, CircularProgress } from '@mui/material';
import { CheckCircle, Refresh } from '@mui/icons-material';
import { useUI } from '../../store';
import * as LeadershipService from '../../services/leadershipApi';
import { devLog } from '../../utils/logger';

const { LeadershipAPI } = LeadershipService;
type MemberFilters = LeadershipService.MemberFilters;

const ApiTest: React.FC = () => {
  const { addNotification } = useUI();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testMembersAPI = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      // Test with minimal, valid parameters
      const filters: MemberFilters = {
        page: 1,
        limit: 5, // Small limit for testing
        q: undefined // No search term
      };

      devLog('Testing members API with filters:', filters);

      const response = await LeadershipAPI.getMembers(filters);

      setResults({
        success: true,
        data: response,
        message: `Successfully fetched ${response.members?.length || 0} members`
      });

      addNotification({
        type: 'success',
        message: `✅ API test successful! Fetched ${response.members?.length || 0} members`
      });
      
    } catch (error: any) {
      console.error('API test error:', error);
      
      setResults({
        success: false,
        error: error.message,
        details: error.response?.data || error
      });
      
      addNotification({
        type: 'error',
        message: `❌ API test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testWithSearch = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      const filters: MemberFilters = {
        page: 1,
        limit: 5,
        q: 'john' // Test search functionality
      };

      devLog('Testing members API with search:', filters);

      const response = await LeadershipAPI.getMembers(filters);
      
      setResults({
        success: true,
        data: response,
        message: `Search test: Found ${response.members?.length || 0} members matching 'john'`
      });
      
      addNotification({
        type: 'success',
        message: `✅ Search test successful! Found ${response.members?.length || 0} members`
      });
      
    } catch (error: any) {
      console.error('Search test error:', error);
      
      setResults({
        success: false,
        error: error.message,
        details: error.response?.data || error
      });
      
      addNotification({
        type: 'error',
        message: `❌ Search test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testPositionsAPI = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      devLog('Testing positions API...');

      const positions = await LeadershipAPI.getPositions();
      
      setResults({
        success: true,
        data: { positions },
        message: `Successfully fetched ${positions?.length || 0} leadership positions`
      });
      
      addNotification({
        type: 'success',
        message: `✅ Positions API test successful! Fetched ${positions?.length || 0} positions`
      });
      
    } catch (error: any) {
      console.error('Positions API test error:', error);
      
      setResults({
        success: false,
        error: error.message,
        details: error.response?.data || error
      });
      
      addNotification({
        type: 'error',
        message: `❌ Positions API test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="primary">
        🧪 API Test Suite
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Testing API calls with corrected parameters:</strong>
          <br />
          • Using 'q' instead of 'search' for search queries
          <br />
          • Removed unsupported 'membership_status' parameter
          <br />
          • Using proper pagination parameters
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            API Test Controls
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={testMembersAPI}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
            >
              Test Members API
            </Button>
            
            <Button
              variant="outlined"
              onClick={testWithSearch}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
            >
              Test Search
            </Button>
            
            <Button
              variant="outlined"
              onClick={testPositionsAPI}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
              color="secondary"
            >
              Test Positions API
            </Button>
          </Box>
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

export default ApiTest;
