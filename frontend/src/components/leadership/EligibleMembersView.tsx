// EligibleMembersView Component
// Shows only members eligible for leadership positions

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress
} from '@mui/material';
import { 
  Person, 
  CheckCircle, 
  LocationOn, 
  Email, 
  Phone,
  Refresh 
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useUI } from '../../store';
import * as LeadershipService from '../../services/leadershipApi';

const { LeadershipAPI } = LeadershipService;

const EligibleMembersView: React.FC = () => {
  const { addNotification } = useUI();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [hierarchyLevel, setHierarchyLevel] = useState<string>('');
  const [entityId, setEntityId] = useState<number | undefined>(undefined);

  // Fetch eligible members
  const { data: membersData, isLoading, error, refetch } = useQuery({
    queryKey: ['eligible-leadership-members', page + 1, rowsPerPage, hierarchyLevel, entityId],
    queryFn: () => LeadershipAPI.getEligibleLeadershipMembers({
      page: page + 1,
      limit: rowsPerPage,
      hierarchy_level: hierarchyLevel as any,
      entity_id: entityId
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const members = membersData?.members || [];
  const pagination = membersData?.pagination || { total: 0, totalPages: 1 };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    refetch();
    addNotification({
      type: 'info',
      message: 'Refreshing eligible members list...'
    });
  };

  // Helper function to get hierarchy level color (currently unused)
  // const getHierarchyLevelColor = (level: string) => {
  //   switch (level) {
  //     case 'National': return 'primary';
  //     case 'Province': return 'secondary';
  //     case 'District': return 'info';
  //     case 'Municipality': return 'success';
  //     case 'Ward': return 'warning';
  //     default: return 'default';
  //   }
  // };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" color="primary">
          👑 Eligible Leadership Members
        </Typography>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          startIcon={<Refresh />}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Eligibility Criteria:</strong> Members must have <strong>Active status</strong> and <strong>6+ months membership duration</strong> to be eligible for leadership positions.
          <br />
          <strong>Total Eligible Members:</strong> {pagination.total}
        </Typography>
      </Alert>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filter by Geographic Level
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Hierarchy Level</InputLabel>
              <Select
                value={hierarchyLevel}
                onChange={(e) => setHierarchyLevel(e.target.value)}
                label="Hierarchy Level"
              >
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="National">National</MenuItem>
                <MenuItem value="Province">Province</MenuItem>
                <MenuItem value="District">District</MenuItem>
                <MenuItem value="Municipality">Municipality</MenuItem>
                <MenuItem value="Ward">Ward</MenuItem>
              </Select>
            </FormControl>
            
            {hierarchyLevel && hierarchyLevel !== 'National' && (
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Entity ID</InputLabel>
                <Select
                  value={entityId || ''}
                  onChange={(e) => setEntityId(e.target.value ? Number(e.target.value) : undefined)}
                  label="Entity ID"
                >
                  <MenuItem value="">All Entities</MenuItem>
                  <MenuItem value={1}>Entity 1</MenuItem>
                  <MenuItem value={2}>Entity 2</MenuItem>
                  <MenuItem value={3}>Entity 3</MenuItem>
                </Select>
              </FormControl>
            )}
            
            <Button
              variant="outlined"
              onClick={() => {
                setHierarchyLevel('');
                setEntityId(undefined);
                setPage(0);
              }}
            >
              Clear Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load eligible members: {error.message}
        </Alert>
      )}

      {/* Members Table */}
      {!isLoading && !error && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>ID Number</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Membership Duration</TableCell>
                  <TableCell>Eligibility Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box py={4}>
                        <Typography variant="body2" color="text.secondary">
                          No eligible members found for the selected criteria
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member: any) => (
                    <TableRow key={member.member_id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Person color="primary" />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {member.full_name || `${member.first_name} ${member.last_name}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {member.membership_number}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {member.id_number || 'Not Available'}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          {member.email && (
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                              <Email fontSize="small" color="action" />
                              <Typography variant="caption">{member.email}</Typography>
                            </Box>
                          )}
                          {member.phone && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Phone fontSize="small" color="action" />
                              <Typography variant="caption">{member.phone}</Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="caption">
                            {member.municipality_name || 'Unknown'}, {member.province_name || 'Unknown'}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {member.membership_duration_months} months
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Since: {new Date(member.membership_date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          icon={<CheckCircle />}
                          label="Eligible"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={pagination.total || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Box>
  );
};

export default EligibleMembersView;
