import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Pagination,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../services/api';

interface VotingStationMembersModalProps {
  open: boolean;
  onClose: () => void;
  votingStationId: string;
  votingStationName: string;
  memberCount: number;
}

const VotingStationMembersModal: React.FC<VotingStationMembersModalProps> = ({
  open,
  onClose,
  votingStationId,
  votingStationName,
  memberCount,
}) => {
  const [page, setPage] = React.useState(1);
  const limit = 20;

  // Fetch members for this voting station
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['members-by-voting-station', votingStationId, page],
    queryFn: () => searchApi.getMembersByVotingStation(votingStationId, {
      page,
      limit
    }),
    enabled: open && !!votingStationId,
  });

  const members = membersData?.data?.members || [];
  const stationInfo = membersData?.data?.station_info;
  const pagination = membersData?.data?.pagination;

  const handlePageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const formatMembershipDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'suspended':
        return 'warning';
      case 'terminated':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="div">
              Members at Voting Station
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {votingStationName} (ID: {votingStationId}) - {memberCount} members
            </Typography>
            {stationInfo && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  <PlaceIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                  {stationInfo.address}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {stationInfo.voting_district_name}, {stationInfo.ward_name}, {stationInfo.municipal_name}, {stationInfo.district_name}, {stationInfo.province_name}
                </Typography>
              </Box>
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error loading members. Please try again.
          </Alert>
        )}

        {!isLoading && !error && members.length === 0 && (
          <Alert severity="info">
            No members found at this voting station.
          </Alert>
        )}

        {!isLoading && !error && members.length > 0 && (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Member Info</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>ID Number</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Membership Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member: any) => (
                    <TableRow key={member.member_id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon fontSize="small" color="primary" />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {member.full_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                              <BadgeIcon fontSize="inherit" />
                              {member.membership_number}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {member.email && (
                            <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                              <EmailIcon fontSize="inherit" />
                              {member.email}
                            </Typography>
                          )}
                          {member.cell_number && (
                            <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                              <PhoneIcon fontSize="inherit" />
                              {member.cell_number}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {member.id_number || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.membership_status || 'Unknown'}
                          size="small"
                          color={getStatusColor(member.membership_status) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatMembershipDate(member.membership_date)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {pagination && pagination.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={pagination.totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}

            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                Showing {members.length} of {pagination?.total || 0} members
                {pagination && ` (Page ${pagination.page} of ${pagination.totalPages})`}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VotingStationMembersModal;
