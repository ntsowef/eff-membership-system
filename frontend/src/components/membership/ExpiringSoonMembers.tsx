import React, { useEffect, useState } from 'react';
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
  TablePagination,
  Chip,
  Button,
  IconButton,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  TableSortLabel
} from '@mui/material';
import {
  Send,
  Refresh,
  FileDownload,
  Phone,
  Email,
  LocationOn,
  Schedule,
  Warning
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { membershipExpirationApi } from '../../services/membershipExpirationApi';
import { useMembershipExpirationStore } from '../../store/membershipExpirationStore';
import { 
  RENEWAL_PRIORITIES, 
  PRIORITY_COLORS,
  type ExpiringSoonFilters,
  type ExpiringSoonMember
} from '../../types/membershipExpiration';

interface ExpiringSoonMembersProps {
  onSendSMS?: (memberIds: number[], notificationType: string) => void;
  onBulkRenewal?: (memberIds: number[]) => void;
  onExportPDF?: (filters: ExpiringSoonFilters) => void;
}

const ExpiringSoonMembers: React.FC<ExpiringSoonMembersProps> = ({
  onSendSMS,
  onBulkRenewal,
  onExportPDF
}) => {
  const {
    expiringSoonMembers,
    expiringSoonPrioritySummary,
    expiringSoonPagination,
    expiringSoonFilters,
    selectedExpiringSoonMembers,
    setExpiringSoonMembers,
    setExpiringSoonPrioritySummary,
    setExpiringSoonPagination,
    setExpiringSoonFilters,
    setSelectedExpiringSoonMembers,
    toggleExpiringSoonMember
  } = useMembershipExpirationStore();

  const [searchTerm, setSearchTerm] = useState('');

  // Fetch expiring soon members
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['expiring-soon-members', expiringSoonFilters],
    queryFn: () => membershipExpirationApi.getExpiringSoonMembers(expiringSoonFilters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Update store when data changes
  useEffect(() => {
    if (data) {
      setExpiringSoonMembers(data.members);
      setExpiringSoonPrioritySummary(data.priority_summary);
      setExpiringSoonPagination(data.pagination);
    }
  }, [data, setExpiringSoonMembers, setExpiringSoonPrioritySummary, setExpiringSoonPagination]);

  const handleFilterChange = (field: keyof ExpiringSoonFilters, value: any) => {
    setExpiringSoonFilters({
      ...expiringSoonFilters,
      [field]: value,
      page: field !== 'page' ? 1 : value // Reset to page 1 when changing filters
    });
  };

  const handleSort = (field: string) => {
    const isAsc = expiringSoonFilters.sort_by === field && expiringSoonFilters.sort_order === 'asc';
    handleFilterChange('sort_by', field);
    handleFilterChange('sort_order', isAsc ? 'desc' : 'asc');
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allMemberIds = expiringSoonMembers.map(member => member.member_id);
      setSelectedExpiringSoonMembers(allMemberIds);
    } else {
      setSelectedExpiringSoonMembers([]);
    }
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    handleFilterChange('page', newPage + 1);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('limit', parseInt(event.target.value, 10));
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || 'default';
  };

  const getDaysUntilExpiryColor = (days: number) => {
    if (days <= 7) return 'error';
    if (days <= 14) return 'warning';
    return 'info';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const isAllSelected = expiringSoonMembers.length > 0 && 
    selectedExpiringSoonMembers.length === expiringSoonMembers.length;
  const isIndeterminate = selectedExpiringSoonMembers.length > 0 && 
    selectedExpiringSoonMembers.length < expiringSoonMembers.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading expiring members...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Retry
              </Button>
            }
          >
            Failed to load expiring members: {error.message}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Members Expiring Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {expiringSoonPagination?.total_records || 0} members expiring within 30 days
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Export to PDF">
              <IconButton onClick={() => onExportPDF?.(expiringSoonFilters)}>
                <FileDownload />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh Data">
              <IconButton onClick={() => refetch()}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Priority Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Priority Summary
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {expiringSoonPrioritySummary.map((item) => (
              <Chip
                key={item.renewal_priority}
                label={`${item.renewal_priority}: ${item.count}`}
                color={getPriorityColor(item.renewal_priority) as any}
                variant="outlined"
                onClick={() => handleFilterChange('priority', item.renewal_priority)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Priority Filter</InputLabel>
            <Select
              value={expiringSoonFilters.priority || 'all'}
              label="Priority Filter"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <MenuItem value="all">All Priorities</MenuItem>
              {RENEWAL_PRIORITIES.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Search Members"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
        </Box>

        {/* Bulk Actions */}
        {selectedExpiringSoonMembers.length > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>
              {selectedExpiringSoonMembers.length} member(s) selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Send />}
                onClick={() => onSendSMS?.(selectedExpiringSoonMembers, '30_day_reminder')}
              >
                Send SMS Reminder
              </Button>
              <Button
                variant="outlined"
                onClick={() => onBulkRenewal?.(selectedExpiringSoonMembers)}
              >
                Bulk Renewal
              </Button>
            </Stack>
          </Box>
        )}

        {/* Members Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={expiringSoonFilters.sort_by === 'full_name'}
                    direction={expiringSoonFilters.sort_order as 'asc' | 'desc'}
                    onClick={() => handleSort('full_name')}
                  >
                    Member Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>ID Number</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={expiringSoonFilters.sort_by === 'expiry_date'}
                    direction={expiringSoonFilters.sort_order as 'asc' | 'desc'}
                    onClick={() => handleSort('expiry_date')}
                  >
                    Expiry Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={expiringSoonFilters.sort_by === 'days_until_expiry'}
                    direction={expiringSoonFilters.sort_order as 'asc' | 'desc'}
                    onClick={() => handleSort('days_until_expiry')}
                  >
                    Days Left
                  </TableSortLabel>
                </TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expiringSoonMembers
                .filter(member => 
                  !searchTerm || 
                  member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  member.id_number.includes(searchTerm)
                )
                .map((member) => (
                <TableRow 
                  key={member.member_id}
                  selected={selectedExpiringSoonMembers.includes(member.member_id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedExpiringSoonMembers.includes(member.member_id)}
                      onChange={() => toggleExpiringSoonMember(member.member_id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {member.full_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {member.id_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {member.cell_number && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="caption">
                            {member.cell_number}
                          </Typography>
                        </Box>
                      )}
                      {member.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="caption">
                            {member.email}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" display="block">
                          Ward {member.ward_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.municipality_name}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(member.expiry_date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${member.days_until_expiry} days`}
                      color={getDaysUntilExpiryColor(member.days_until_expiry) as any}
                      size="small"
                      icon={<Schedule />}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.renewal_priority}
                      color={getPriorityColor(member.renewal_priority) as any}
                      size="small"
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Send SMS">
                        <IconButton 
                          size="small"
                          onClick={() => onSendSMS?.([member.member_id], '30_day_reminder')}
                        >
                          <Send fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {expiringSoonPagination && (
          <TablePagination
            component="div"
            count={expiringSoonPagination.total_records}
            page={(expiringSoonPagination.current_page || 1) - 1}
            onPageChange={handlePageChange}
            rowsPerPage={expiringSoonPagination.records_per_page}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiringSoonMembers;
