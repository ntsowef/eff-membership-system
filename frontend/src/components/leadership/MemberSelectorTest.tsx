// MemberSelectorTest Component
// Test component to verify MemberSelector works without geographic constraints

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  Alert
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { useUI } from '../../store';
import MemberSelector from './MemberSelector';

const MemberSelectorTest: React.FC = () => {
  const { addNotification } = useUI();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const handleMemberSelect = (member: any) => {
    setSelectedMember(member);
    setSelectorOpen(false);
    
    addNotification({
      type: 'success',
      message: `✅ Member selected: ${member.full_name || `${member.firstname || member.first_name} ${member.surname || member.last_name}`}`
    });
  };

  const testWithoutGeographicFilter = () => {
    setSelectedMember(null);
    setSelectorOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="primary">
        👥 MemberSelector Test
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Testing MemberSelector component:</strong>
          <br />
          • Fixed API response structure mismatch
          <br />
          • Fixed field name inconsistencies (first_name vs firstname)
          <br />
          • Disabled geographic filtering by default
          <br />
          • Enhanced error handling and empty states
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test MemberSelector
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={testWithoutGeographicFilter}
              startIcon={<Person />}
            >
              Open MemberSelector
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            <strong>Expected Results:</strong>
            <br />
            • Members should display in the table
            <br />
            • Pagination should show correct counts
            <br />
            • No "No members match current filters" error
            <br />
            • Geographic filtering disabled by default
          </Typography>
        </CardContent>
      </Card>

      {selectedMember && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.main">
              ✅ Selected Member
            </Typography>
            
            <Box sx={{ 
              bgcolor: 'grey.50', 
              p: 2, 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}>
              <strong>Name:</strong> {selectedMember.full_name || `${selectedMember.firstname || selectedMember.first_name} ${selectedMember.surname || selectedMember.last_name}`}
              <br />
              <strong>ID:</strong> {selectedMember.member_id}
              <br />
              <strong>ID Number:</strong> {selectedMember.id_number}
              <br />
              <strong>Contact:</strong> {selectedMember.email || 'No email'} | {selectedMember.cell_number || selectedMember.phone || 'No phone'}
              <br />
              <strong>Location:</strong> {selectedMember.municipality_name || 'Unknown'}, {selectedMember.province_name || 'Unknown'}
              <br />
              <strong>Status:</strong> {selectedMember.membership_status || 'Active'}
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Debug Information
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            • Check browser console for detailed API response logging
            <br />
            • Look for "🔍 LeadershipAPI.getMembers response:" messages
            <br />
            • Look for "🔍 MemberSelector data received:" messages
            <br />
            • Look for "ℹ️ Geographic filtering disabled" messages
          </Typography>
        </CardContent>
      </Card>

      {/* MemberSelector Component */}
      <MemberSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleMemberSelect}
        title="Test Member Selection"
        filterByLevel={undefined} // No geographic filtering
        entityId={undefined}
        excludeMemberIds={[]}
      />
    </Box>
  );
};

export default MemberSelectorTest;
