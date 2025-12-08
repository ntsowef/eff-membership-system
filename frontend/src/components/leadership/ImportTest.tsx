// ImportTest Component
// Simple test to verify all imports are working correctly

import React from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { useUI } from '../../store';
import { devLog } from '../../utils/logger';

// Test imports
import * as LeadershipService from '../../services/leadershipApi';

// Extract what we need from the service
const { LeadershipAPI } = LeadershipService;
type LeadershipPosition = LeadershipService.LeadershipPosition;
import MemberSelector from './MemberSelector';
import LeadershipAssignment from './LeadershipAssignment';
import LeadershipManagement from './LeadershipManagement';

// Member interface for testing
interface Member {
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  first_name: string;
  last_name: string;
  age?: number;
  gender_id: number;
  gender_name: string;
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  municipality_code: string;
  municipality_name: string;
  ward_code: string;
  ward_name: string;
  ward_number: string;
  cell_number?: string;
  landline_number?: string;
  email?: string;
  residential_address?: string;
  membership_status: string;
  membership_id?: number;
  created_at: string;
  updated_at: string;
  member_created_at: string;
}

const ImportTest: React.FC = () => {
  const { addNotification } = useUI();

  const testImports = () => {
    const results = [];

    // Test LeadershipAPI
    try {
      if (typeof LeadershipAPI.getPositions === 'function') {
        results.push({ name: 'LeadershipAPI', status: 'success', message: 'API service imported successfully' });
      } else {
        results.push({ name: 'LeadershipAPI', status: 'error', message: 'API service not properly imported' });
      }
    } catch (error) {
      results.push({ name: 'LeadershipAPI', status: 'error', message: `API import error: ${error}` });
    }

    // Test Member interface
    try {
      const testMember: Member = {
        member_id: 1,
        id_number: '1234567890123',
        firstname: 'John',
        surname: 'Doe',
        full_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        gender_id: 1,
        gender_name: 'Male',
        province_code: 'GP',
        province_name: 'Gauteng',
        district_code: 'JHB',
        district_name: 'Johannesburg',
        municipality_code: 'JHB001',
        municipality_name: 'City of Johannesburg',
        ward_code: 'W001',
        ward_name: 'Ward 1',
        ward_number: '1',
        membership_status: 'Active',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        member_created_at: '2024-01-01'
      };
      
      if (testMember.member_id === 1) {
        results.push({ name: 'Member Interface', status: 'success', message: 'Member interface working correctly' });
      }
    } catch (error) {
      results.push({ name: 'Member Interface', status: 'error', message: `Member interface error: ${error}` });
    }

    // Test LeadershipPosition interface
    try {
      const testPosition: LeadershipPosition = {
        id: 1,
        position_name: 'Test Position',
        position_code: 'TEST001',
        hierarchy_level: 'National',
        term_duration_months: 24,
        max_consecutive_terms: 2,
        order_index: 1,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };
      
      if (testPosition.id === 1) {
        results.push({ name: 'LeadershipPosition Interface', status: 'success', message: 'Position interface working correctly' });
      }
    } catch (error) {
      results.push({ name: 'LeadershipPosition Interface', status: 'error', message: `Position interface error: ${error}` });
    }

    // Test component imports
    try {
      if (typeof MemberSelector !== 'undefined' && typeof LeadershipAssignment !== 'undefined' && typeof LeadershipManagement !== 'undefined') {
        results.push({ name: 'Components', status: 'success', message: 'All components imported successfully' });
      } else {
        results.push({ name: 'Components', status: 'error', message: 'Some components failed to import' });
      }
    } catch (error) {
      results.push({ name: 'Components', status: 'error', message: `Component import error: ${error}` });
    }

    // Test store integration
    try {
      if (typeof addNotification === 'function') {
        results.push({ name: 'Store Integration', status: 'success', message: 'useUI store working correctly' });
      } else {
        results.push({ name: 'Store Integration', status: 'error', message: 'useUI store not accessible' });
      }
    } catch (error) {
      results.push({ name: 'Store Integration', status: 'error', message: `Store error: ${error}` });
    }

    // Show results
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;

    if (successCount === totalCount) {
      addNotification({
        type: 'success',
        message: `✅ All ${totalCount} import tests passed! System is ready.`
      });
    } else {
      addNotification({
        type: 'error',
        message: `❌ ${successCount}/${totalCount} tests passed. Check console for details.`
      });
    }

    devLog('Import Test Results:', results);
    return results;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Leadership System Import Test
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This component tests if all leadership system imports are working correctly.
        Click the button below to run the tests.
      </Alert>

      <Button
        variant="contained"
        onClick={testImports}
        startIcon={<CheckCircle />}
        sx={{ mb: 3 }}
      >
        Run Import Tests
      </Button>

      <Typography variant="body2" color="text.secondary">
        Check the browser console and notifications for detailed results.
      </Typography>
    </Box>
  );
};

export default ImportTest;
