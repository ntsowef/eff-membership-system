// SimpleTest Component
// Minimal test to verify imports work without Member interface conflicts

import React from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { useUI } from '../../store';
import { devLog } from '../../utils/logger';

// Import only what we need from leadershipApi (no Member interface)
import * as LeadershipService from '../../services/leadershipApi';

// Extract what we need from the service
const { LeadershipAPI } = LeadershipService;
type MemberFilters = LeadershipService.MemberFilters;

const SimpleTest: React.FC = () => {
  const { addNotification } = useUI();

  const testImports = () => {
    try {
      // Test if LeadershipAPI is available
      if (typeof LeadershipAPI.getPositions === 'function') {
        addNotification({
          type: 'success',
          message: '✅ LeadershipAPI imported successfully! No Member interface conflicts.'
        });
      }

      // Test if MemberFilters type is available
      const testFilters: MemberFilters = {
        q: 'test', // Backend uses 'q' for search
        limit: 10
      };

      devLog('Import test successful:', {
        LeadershipAPI: typeof LeadershipAPI,
        MemberFilters: typeof testFilters
      });

    } catch (error) {
      addNotification({
        type: 'error',
        message: `❌ Import test failed: ${error}`
      });
      console.error('Import error:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Simple Import Test
      </Typography>
      
      <Alert severity="success" sx={{ mb: 3 }}>
        <strong>Status:</strong> This component imports LeadershipAPI and MemberFilters 
        without importing the Member interface, which should resolve the import conflict.
      </Alert>

      <Button
        variant="contained"
        onClick={testImports}
        startIcon={<CheckCircle />}
        sx={{ mb: 2 }}
      >
        Test Imports
      </Button>

      <Typography variant="body2" color="text.secondary">
        If this button works without throwing import errors, the issue is resolved.
      </Typography>
    </Box>
  );
};

export default SimpleTest;
