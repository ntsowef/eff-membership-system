// MemberSelectorDebug Component
// Debug version to identify why modal shows no data

import React, { useState } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  Box, 
  Typography, 
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useUI } from '../../store';
import * as LeadershipService from '../../services/leadershipApi';

const { LeadershipAPI } = LeadershipService;
type MemberFilters = LeadershipService.MemberFilters;

const MemberSelectorDebug: React.FC = () => {
  const { addNotification } = useUI();
  const [open, setOpen] = useState(false);

  // Simple API call
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['debug-members'],
    queryFn: () => LeadershipAPI.getMembers({ page: 1, limit: 10 }),
    enabled: open,
  });

  const members = membersData?.members || [];
  const pagination = membersData?.pagination || { total: 0 };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Console logging
  React.useEffect(() => {
    if (open) {
      console.log('🐛 Debug Modal Data:', {
        isLoading,
        error: error?.message,
        membersData,
        members,
        membersLength: members.length,
        pagination,
        firstMember: members[0]
      });
    }
  }, [open, isLoading, error, membersData, members, pagination]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="primary">
        🐛 MemberSelector Debug
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Debug version to identify modal data display issue:</strong>
          <br />
          • Simple API call without complex filtering
          <br />
          • Raw data display in modal
          <br />
          • Console logging for debugging
        </Typography>
      </Alert>

      <Button
        variant="contained"
        onClick={handleOpen}
        startIcon={<Person />}
      >
        Open Debug Modal
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { height: '90vh', maxHeight: '800px' }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">Debug Member Data</Typography>
        </DialogTitle>

        <DialogContent dividers>
          {/* Debug Info */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> Loading: {isLoading ? 'Yes' : 'No'},
              Error: {error ? 'Yes' : 'No'},
              Members: {members.length},
              Total: {pagination.total}
              <br />
              <strong>Sample Member Status:</strong> {members[0]?.membership_status || 'undefined'}
              <br />
              <strong>Sample Member Gender:</strong> {members[0]?.gender_name || members[0]?.gender || 'undefined'}
            </Typography>
          </Alert>

          {/* Loading State */}
          {isLoading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Loading members...
            </Alert>
          )}

          {/* Error State */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error: {error.message}
            </Alert>
          )}

          {/* Raw Data Display */}
          {membersData && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>Raw API Response:</Typography>
              <Box component="pre" sx={{ 
                bgcolor: 'grey.100', 
                p: 2, 
                borderRadius: 1, 
                overflow: 'auto',
                fontSize: '0.75rem',
                maxHeight: 200
              }}>
                {JSON.stringify(membersData, null, 2)}
              </Box>
            </Box>
          )}

          {/* Simple Table */}
          {members.length > 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>ID Number</TableCell>
                    <TableCell>Email</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member: any, index: number) => (
                    <TableRow key={member.member_id || index}>
                      <TableCell>{member.member_id || 'No ID'}</TableCell>
                      <TableCell>
                        {member.full_name || 
                         `${member.firstname || member.first_name || ''} ${member.surname || member.last_name || ''}`.trim() || 
                         'No Name'}
                      </TableCell>
                      <TableCell>{member.id_number || 'No ID Number'}</TableCell>
                      <TableCell>{member.email || 'No Email'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* No Data Message */}
          {!isLoading && !error && members.length === 0 && (
            <Alert severity="warning">
              No members found. Check API response above.
            </Alert>
          )}

        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MemberSelectorDebug;
