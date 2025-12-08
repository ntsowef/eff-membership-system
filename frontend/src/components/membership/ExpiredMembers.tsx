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

  PersonOff,
  RestoreFromTrash
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { membershipExpirationApi } from '../../services/membershipExpirationApi';
import { useMembershipExpirationStore } from '../../store/membershipExpirationStore';
import { 
  EXPIRY_CATEGORIES, 
  CATEGORY_COLORS,
  type ExpiredMembersFilters,
  // type ExpiredMember
} from '../../types/membershipExpiration';

interface ExpiredMembersProps {
  onSendSMS?: (memberIds: number[], notificationType: string) => void;
  onBulkRenewal?: (memberIds: number[]) => void;
  onExportPDF?: (filters: ExpiredMembersFilters) => void;
}

const ExpiredMembers: React.FC<ExpiredMembersProps> = ({
  onSendSMS,
  onBulkRenewal,
  onExportPDF
}) => {
  const {
    expiredMembers,
    expiredCategorySummary,
    expiredPagination,
    expiredFilters,
    selectedExpiredMembers,
    setExpiredMembers,
    setExpiredCategorySummary,
    setExpiredPagination,
    setExpiredFilters,
    setSelectedExpiredMembers,
    toggleExpiredMember
  } = useMembershipExpirationStore();

  const [searchTerm, setSearchTerm] = useState('');

  // Fetch expired members
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['expired-members', expiredFilters],
    queryFn: () => membershipExpirationApi.getExpiredMembers(expiredFilters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Update store when data changes
  useEffect(() => {
    if (data) {
      setExpiredMembers(data.members);
      setExpiredCategorySummary(data.category_summary);
      setExpiredPagination(data.pagination);
    }
  }, [data, setExpiredMembers, setExpiredCategorySummary, setExpiredPagination]);

  const handleFilterChange = (field: keyof ExpiredMembersFilters, value: any) => {
    setExpiredFilters({
      ...expiredFilters,
      [field]: value,
      page: field !== 'page' ? 1 : value // Reset to page 1 when changing filters
    });
  };

  const handleSort = (field: string) => {
    const isAsc = expiredFilters.sort_by === field && expiredFilters.sort_order === 'asc';
    handleFilterChange('sort_by', field);
    handleFilterChange('sort_order', isAsc ? 'desc' : 'asc');
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allMemberIds = expiredMembers.map(member => member.member_id);
      setSelectedExpiredMembers(allMemberIds);
    } else {
      setSelectedExpiredMembers([]);
    }
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    handleFilterChange('page', newPage + 1);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('limit', parseInt(event.target.value, 10));
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'default';
  };

  const getDaysExpiredColor = (days: number) => {
    if (days <= 30) return 'error';
    if (days <= 90) return 'warning';
    if (days <= 365) return 'info';
    return 'default';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getSMSNotificationType = (category: string) => {
    switch (category) {
      case 'Recently Expired':
        return '7_day_grace';
      default:
        return 'expired_today';
    }
  };

  const isAllSelected = expiredMembers.length > 0 && 
    selectedExpiredMembers.length === expiredMembers.length;
  const isIndeterminate = selectedExpiredMembers.length > 0 && 
    selectedExpiredMembers.length < expiredMembers.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading expired members...
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
            Failed to load expired members: {error.message}
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
              Expired Members
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {expiredPagination?.total_records || 0} members with expired memberships
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Export to PDF">
              <IconButton onClick={() => onExportPDF?.(expiredFilters)}>
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

        {/* Category Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Expiry Category Summary
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {expiredCategorySummary.map((item) => (
              <Chip
                key={item.expiry_category}
                label={`${item.expiry_category}: ${item.count}`}
                color={getCategoryColor(item.expiry_category) as any}
                variant="outlined"
                onClick={() => handleFilterChange('category', item.expiry_category)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Category Filter</InputLabel>
            <Select
              value={expiredFilters.category || 'all'}
              label="Category Filter"
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {EXPIRY_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
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
        {selectedExpiredMembers.length > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>
              {selectedExpiredMembers.length} member(s) selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Send />}
                onClick={() => onSendSMS?.(selectedExpiredMembers, 'expired_today')}
              >
                Send Recovery SMS
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestoreFromTrash />}
                onClick={() => onBulkRenewal?.(selectedExpiredMembers)}
              >
                Restore Memberships
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
                    active={expiredFilters.sort_by === 'full_name'}
                    direction={expiredFilters.sort_order as 'asc' | 'desc'}
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
                    active={expiredFilters.sort_by === 'expiry_date'}
                    direction={expiredFilters.sort_order as 'asc' | 'desc'}
                    onClick={() => handleSort('expiry_date')}
                  >
                    Expired Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={expiredFilters.sort_by === 'days_expired'}
                    direction={expiredFilters.sort_order as 'asc' | 'desc'}
                    onClick={() => handleSort('days_expired')}
                  >
                    Days Expired
                  </TableSortLabel>
                </TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expiredMembers
                .filter(member => 
                  !searchTerm || 
                  member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  member.id_number.includes(searchTerm)
                )
                .map((member) => (
                <TableRow 
                  key={member.member_id}
                  selected={selectedExpiredMembers.includes(member.member_id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedExpiredMembers.includes(member.member_id)}
                      onChange={() => toggleExpiredMember(member.member_id)}
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
                      label={`${member.days_expired} days ago`}
                      color={getDaysExpiredColor(member.days_expired) as any}
                      size="small"
                      icon={<PersonOff />}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.expiry_category}
                      color={getCategoryColor(member.expiry_category) as any}
                      size="small"
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Send Recovery SMS">
                        <IconButton 
                          size="small"
                          onClick={() => onSendSMS?.([member.member_id], getSMSNotificationType(member.expiry_category))}
                        >
                          <Send fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Restore Membership">
                        <IconButton 
                          size="small"
                          onClick={() => onBulkRenewal?.([member.member_id])}
                        >
                          <RestoreFromTrash fontSize="small" />
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
        {expiredPagination && (
          <TablePagination
            component="div"
            count={expiredPagination.total_records}
            page={Math.max(0, Math.min((expiredPagination.current_page || 1) - 1, (expiredPagination.total_pages || 1) - 1))}
            onPageChange={handlePageChange}
            rowsPerPage={Number(expiredPagination.records_per_page)}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiredMembers;
