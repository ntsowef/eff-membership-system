// DatabaseTest Component
// Test component to verify database queries work correctly after schema fixes

import React, { useState } from 'react';
import { Box, Typography, Alert, Button, Card, CardContent, CircularProgress } from '@mui/material';
import { CheckCircle, Storage } from '@mui/icons-material';
import { useUI } from '../../store';
import * as LeadershipService from '../../services/leadershipApi';

const { LeadershipAPI } = LeadershipService;

const DatabaseTest: React.FC = () => {
  const { addNotification } = useUI();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testAppointmentsAPI = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('Testing leadership appointments API...');
      
      const appointments = await LeadershipAPI.getCurrentAppointments({ limit: 5 } as any);
      
      setResults({
        success: true,
        data: appointments,
        message: `Successfully fetched ${appointments.appointments?.length || 0} appointments`
      });
      
      addNotification({
        type: 'success',
        message: `✅ Database test successful! Fetched ${appointments.appointments?.length || 0} appointments`
      });
      
    } catch (error: any) {
      console.error('Database test error:', error);
      
      setResults({
        success: false,
        error: error.message,
        details: error.response?.data || error
      });
      
      addNotification({
        type: 'error',
        message: `❌ Database test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testPositionsAPI = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('Testing leadership positions API...');
      
      const positions = await LeadershipAPI.getPositions();
      
      setResults({
        success: true,
        data: { positions },
        message: `Successfully fetched ${positions?.length || 0} leadership positions`
      });
      
      addNotification({
        type: 'success',
        message: `✅ Positions test successful! Fetched ${positions?.length || 0} positions`
      });
      
    } catch (error: any) {
      console.error('Positions test error:', error);
      
      setResults({
        success: false,
        error: error.message,
        details: error.response?.data || error
      });
      
      addNotification({
        type: 'error',
        message: `❌ Positions test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testStructuresAPI = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('Testing organizational structures API...');
      
      const structures = await LeadershipAPI.getOrganizationalStructures();
      
      setResults({
        success: true,
        data: { structures },
        message: `Successfully fetched ${structures?.length || 0} organizational structures`
      });
      
      addNotification({
        type: 'success',
        message: `✅ Structures test successful! Fetched ${structures?.length || 0} structures`
      });
      
    } catch (error: any) {
      console.error('Structures test error:', error);
      
      setResults({
        success: false,
        error: error.message,
        details: error.response?.data || error
      });
      
      addNotification({
        type: 'error',
        message: `❌ Structures test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="primary">
        🗄️ Database Schema Test
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Testing database queries after schema fixes:</strong>
          <br />
          • Fixed 'regions' table references → 'districts' table
          <br />
          • Fixed 'membership_number' column → computed field
          <br />
          • Fixed 'phone_number' → 'cell_number' column mapping
          <br />
          • Fixed 'p.name' → 'p.province_name' column reference
          <br />
          • Updated TypeScript interfaces: 'Region' → 'District'
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Database Test Controls
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={testAppointmentsAPI}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
            >
              Test Appointments
            </Button>
            
            <Button
              variant="outlined"
              onClick={testPositionsAPI}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Storage />}
            >
              Test Positions
            </Button>
            
            <Button
              variant="outlined"
              onClick={testStructuresAPI}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Storage />}
              color="secondary"
            >
              Test Structures
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            These tests verify that the leadership database queries work correctly 
            after fixing the 'regions' table references.
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

export default DatabaseTest;
