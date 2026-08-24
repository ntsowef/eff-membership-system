import React, { useState } from 'react';
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
  TablePagination,
  Paper,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Grid,
  Snackbar
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api, apiGet } from '../../services/api';

interface WardInfo {
  ward_code: string;
  ward_name: string;
  ward_number: string;
  municipality_name: string;
  district_name: string;
  province_name: string;
}

interface Member {
  member_id: number;
  membership_number: string;
  firstname: string;
  surname: string;
  full_name: string;
  id_number: string;
  email: string;
  cell_number: string;
  gender_name: string;
  date_of_birth: string;
  membership_type: string;
  date_joined: string;
  expiry_date: string;
  membership_status: string;
  voting_district_name: string;
  voting_station_name: string;
}

interface WardMembersData {
  ward_info: WardInfo;
  members: Member[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface WardMembersModalProps {
  open: boolean;
  onClose: () => void;
  wardCode: string;
  wardName?: string;
}

const WardMembersModal: React.FC<WardMembersModalProps> = ({ open, onClose, wardCode, wardName }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [search, setSearch] = useState('');
  const [membershipStatus, setMembershipStatus] = useState('all');
  const [sortBy, setSortBy] = useState('firstname');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Fetch ward members
  const { data, isLoading, error } = useQuery<WardMembersData>({
    queryKey: ['ward-members', wardCode, page, rowsPerPage, search, membershipStatus, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(search && { search }),
        membership_status: membershipStatus,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      const response = await apiGet<{ data: WardMembersData }>(`/members/ward/${wardCode}?${params}`);
      if (!response.data?.data) {
        throw new Error('No data returned from API');
      }
      return response.data.data;
    },
    enabled: open && !!wardCode,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleStatusChange = (value: string) => {
    setMembershipStatus(value);
    setPage(0);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      // Authenticated Blob download (window.open cannot send the Authorization header)
      const response = await api.get(`/members/ward/${wardCode}/download`, {
        params: {
          ...(search && { search }),
          membership_status: membershipStatus
        },
        responseType: 'blob',
        timeout: 300000 // 5 minutes for large wards
      });

      // Detect JSON error responses returned as a blob
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData?.message || errorData?.error?.message || 'Download failed');
      }

      // Use the filename from Content-Disposition if available
      const disposition = response.headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : `Ward_${wardCode}_Members_${new Date().toISOString().split('T')[0]}.xlsx`;

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      let message = 'Failed to download ward members';
      // Axios errors with blob responseType wrap JSON errors in a Blob
      const blobData = err?.response?.data;
      if (blobData instanceof Blob) {
        try {
          const errorData = JSON.parse(await blobData.text());
          message = errorData?.message || errorData?.error?.message || message;
        } catch {
          // keep default message
        }
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      } else if (err?.message) {
        message = err.message;
      }
      console.error('❌ Ward members download failed:', err);
      setDownloadError(message);
    } finally {
      setDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good Standing':
        return 'success';
      case 'Expired':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="span">
              Ward Members: {data?.ward_info?.ward_name || wardName || wardCode}
            </Typography>
            {data?.ward_info && (
              <Typography variant="body2" color="text.secondary">
                {data.ward_info.municipality_name}, {data.ward_info.district_name}, {data.ward_info.province_name}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Filters */}
        <Box mb={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, ID, membership number..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Membership Status</InputLabel>
                <Select
                  value={membershipStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  label="Membership Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="good_standing">Good Standing</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(0);
                  }}
                  label="Sort By"
                >
                  <MenuItem value="firstname">First Name</MenuItem>
                  <MenuItem value="surname">Surname</MenuItem>
                  <MenuItem value="membership_number">Membership Number</MenuItem>
                  <MenuItem value="expiry_date">Expiry Date</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={isLoading || downloading || !data?.members?.length}
              >
                {downloading ? 'Downloading...' : 'Download'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Loading State */}
        {isLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load ward members. Please try again.
          </Alert>
        )}

        {/* Members Table */}
        {!isLoading && !error && data && (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>Membership #</strong></TableCell>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>ID Number</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Expiry Date</strong></TableCell>
                    <TableCell><strong>Voting District</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary" py={3}>
                          No members found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.members.map((member: Member) => (
                      <TableRow key={member.member_id} hover>
                        <TableCell>{member.membership_number}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <PersonIcon fontSize="small" color="action" />
                            <Box>
                              <Typography variant="body2">
                                {member.firstname} {member.surname}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {member.gender_name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {member.id_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            {member.email && (
                              <Tooltip title={member.email}>
                                <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                  <EmailIcon fontSize="small" sx={{ fontSize: 14 }} />
                                  <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>
                                    {member.email}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            )}
                            {member.cell_number && (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <PhoneIcon fontSize="small" sx={{ fontSize: 14 }} />
                                <Typography variant="caption">{member.cell_number}</Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={member.membership_status}
                            color={getStatusColor(member.membership_status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {member.expiry_date
                              ? new Date(member.expiry_date).toLocaleDateString()
                              : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8rem">
                            {member.voting_district_name || 'N/A'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {data.pagination && (
              <TablePagination
                component="div"
                count={data.pagination.total}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[25, 50, 100, 200]}
              />
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Download error notification */}
      <Snackbar
        open={!!downloadError}
        autoHideDuration={6000}
        onClose={() => setDownloadError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setDownloadError(null)} sx={{ width: '100%' }}>
          {downloadError}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default WardMembersModal;

