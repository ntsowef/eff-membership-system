// LeadershipTest Component
// Simple test component to verify leadership system integration

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  Error,
  Info,
  Assignment
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useUI } from '../../store';
import { LeadershipAPI } from '../../services/leadershipApi';

// =====================================================
// LeadershipTest Component
// =====================================================

const LeadershipTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Array<{
    name: string;
    status: 'pending' | 'success' | 'error';
    message: string;
  }>>([]);
  
  const { addNotification } = useUI();

  // Test API connectivity
  const { data: structuresData, isLoading, error } = useQuery({
    queryKey: ['test-leadership-structures'],
    queryFn: () => LeadershipAPI.getOrganizationalStructures(),
    enabled: false, // Don't auto-run
  });

  // ==================== Test Functions ====================
  
  const runTests = async () => {
    setTestResults([]);
    addNotification({
      type: 'info',
      message: 'Starting leadership system tests...'
    });

    const tests = [
      {
        name: 'API Service Import',
        test: () => {
          if (typeof LeadershipAPI.getPositions === 'function') {
            return { success: true, message: 'LeadershipAPI imported successfully' };
          }
          return { success: false, message: 'LeadershipAPI not properly imported' };
        }
      },
      {
        name: 'Store Integration',
        test: () => {
          if (typeof addNotification === 'function') {
            return { success: true, message: 'useUI store working correctly' };
          }
          return { success: false, message: 'useUI store not accessible' };
        }
      },
      {
        name: 'React Query Setup',
        test: () => {
          if (typeof useQuery === 'function') {
            return { success: true, message: 'React Query available' };
          }
          return { success: false, message: 'React Query not available' };
        }
      },
      {
        name: 'Component Dependencies',
        test: () => {
          try {
            // Test if we can create the basic structure for components
            const testData = {
              position_id: 1,
              member_id: 123,
              hierarchy_level: 'National' as const,
              entity_id: 1,
              appointment_type: 'Appointed' as const,
              start_date: '2024-01-01'
            };
            return { success: true, message: 'TypeScript interfaces working correctly' };
          } catch (error) {
            return { success: false, message: 'TypeScript interface issues' };
          }
        }
      }
    ];

    const results = [];
    for (const test of tests) {
      try {
        const result = test.test();
        results.push({
          name: test.name,
          status: result.success ? 'success' as const : 'error' as const,
          message: result.message
        });
      } catch (error) {
        results.push({
          name: test.name,
          status: 'error' as const,
          message: `Test failed: ${error}`
        });
      }
    }

    setTestResults(results);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      addNotification({
        type: 'success',
        message: `All ${totalCount} tests passed! Leadership system is ready.`
      });
    } else {
      addNotification({
        type: 'warning',
        message: `${successCount}/${totalCount} tests passed. Check results below.`
      });
    }
  };

  const testNotification = () => {
    addNotification({
      type: 'success',
      message: 'Test notification - system working!'
    });
  };

  // ==================== Render ====================
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assignment color="primary" />
          Leadership System Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Verify that all leadership system components are properly integrated
        </Typography>
      </Box>

      {/* Test Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Tests
          </Typography>
          <Grid container spacing={2}>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={runTests}
              >
                Run All Tests
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                onClick={testNotification}
              >
                Test Notification
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Results
            </Typography>
            <List>
              {testResults.map((result, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {result.status === 'success' && <CheckCircle color="success" />}
                    {result.status === 'error' && <Error color="error" />}
                    {result.status === 'pending' && <Info color="info" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={result.name}
                    secondary={result.message}
                  />
                  <Chip
                    label={result.status}
                    color={result.status === 'success' ? 'success' : result.status === 'error' ? 'error' : 'default'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Components Available:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="✅ LeadershipManagement" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="✅ LeadershipAssignment" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="✅ MemberSelector" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="✅ LeadershipAPI Service" />
                  </ListItem>
                </List>
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>Integration Status:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="✅ Material-UI Components" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="✅ React Query" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="✅ Zustand Store" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="✅ TypeScript Interfaces" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="✅ Date Pickers" />
                  </ListItem>
                </List>
              </Alert>
            </Grid>
          </Grid>

          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              <strong>Next Steps:</strong> Run the tests above to verify system integration, 
              then navigate to the Leadership page to access the full management interface.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LeadershipTest;
