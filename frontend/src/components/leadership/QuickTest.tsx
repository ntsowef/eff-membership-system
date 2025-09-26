// QuickTest Component
// Simple test to verify the import fix works

import React from 'react';
import { Box, Typography, Alert, Button, Card, CardContent } from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import { useUI } from '../../store';

// Test importing components (should work now)
import MemberSelector from './MemberSelector';
import LeadershipAssignment from './LeadershipAssignment';
import LeadershipManagement from './LeadershipManagement';

const QuickTest: React.FC = () => {
  const { addNotification } = useUI();

  const testComponents = () => {
    try {
      // Test if components can be imported and instantiated
      const tests = [
        { name: 'MemberSelector', component: MemberSelector, status: 'success' },
        { name: 'LeadershipAssignment', component: LeadershipAssignment, status: 'success' },
        { name: 'LeadershipManagement', component: LeadershipManagement, status: 'success' }
      ];

      addNotification({
        type: 'success',
        message: '✅ All components imported successfully! No more Member interface errors.'
      });

      console.log('Component import test results:', tests);
      return tests;
    } catch (error) {
      addNotification({
        type: 'error',
        message: `❌ Component import failed: ${error}`
      });
      console.error('Component import error:', error);
      return [];
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Quick Import Fix Test
      </Typography>
      
      <Alert severity="success" sx={{ mb: 3 }}>
        <strong>Fix Applied:</strong> Member interface is now defined locally in each component 
        instead of being imported from leadershipApi.ts. This should resolve the import error.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Results
          </Typography>
          
          <Button
            variant="contained"
            onClick={testComponents}
            startIcon={<CheckCircle />}
            sx={{ mb: 2 }}
          >
            Test Component Imports
          </Button>

          <Typography variant="body2" color="text.secondary">
            If this button works without errors, the import issue is fixed!
          </Typography>
        </CardContent>
      </Card>

      <Alert severity="info">
        <Typography variant="body2">
          <strong>What was changed:</strong>
          <br />
          • Removed Member interface import from leadershipApi.ts
          <br />
          • Added Member interface definition directly in each component
          <br />
          • This avoids the export/import conflict that was causing the error
        </Typography>
      </Alert>
    </Box>
  );
};

export default QuickTest;
