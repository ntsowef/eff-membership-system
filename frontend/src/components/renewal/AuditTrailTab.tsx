/**
 * Audit Trail Tab Component
 * Displays audit trail with timeline view and filters
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Refresh,
  Search,
  History,
  CheckCircle,
  Payment,
  Gavel,
  Warning,
  Edit,
  Settings,

} from '@mui/icons-material';
import { getAllAuditTrail } from '../../services/renewalBulkUploadService';
import type { AuditTrailEntry } from '../../types/renewalBulkUpload';

const AuditTrailTab: React.FC = () => {
  const [auditEntries, setAuditEntries] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      const response = await getAllAuditTrail();
      if (response.success) {
        setAuditEntries(response.data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Status Change':
        return <CheckCircle />;
      case 'Payment':
        return <Payment />;
      case 'Approval':
        return <Gavel />;
      case 'Fraud Detection':
        return <Warning />;
      case 'Manual Update':
        return <Edit />;
      case 'System':
        return <Settings />;
      default:
        return <History />;
    }
  };

  const getCategoryColor = (category: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
    switch (category) {
      case 'Status Change':
        return 'success';
      case 'Payment':
        return 'info';
      case 'Approval':
        return 'info';
      case 'Fraud Detection':
        return 'warning';
      case 'Manual Update':
        return 'default';
      case 'System':
        return 'default';
      default:
        return 'default';
    }
  };

  // Filter audit entries
  const filteredEntries = auditEntries.filter((entry) => {
    const matchesCategory = categoryFilter === 'all' || entry.action_category === categoryFilter;
    const matchesSearch = 
      entry.action_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.performed_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.member_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Paginate entries
  const paginatedEntries = filteredEntries.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Audit Trail
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete history of all renewal activities
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={viewMode === 'table' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('table')}
            size="small"
          >
            Table View
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('timeline')}
            size="small"
          >
            Timeline View
          </Button>
          <Button
            startIcon={<Refresh />}
            onClick={fetchAuditTrail}
            variant="outlined"
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search by description, member, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Category"
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="Status Change">Status Change</MenuItem>
                <MenuItem value="Payment">Payment</MenuItem>
                <MenuItem value="Approval">Approval</MenuItem>
                <MenuItem value="Fraud Detection">Fraud Detection</MenuItem>
                <MenuItem value="Manual Update">Manual Update</MenuItem>
                <MenuItem value="Bulk Operation">Bulk Operation</MenuItem>
                <MenuItem value="System">System</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table View */}
      {viewMode === 'table' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Member</TableCell>
                <TableCell>Performed By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      {loading ? 'Loading...' : 'No audit entries found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEntries.map((entry) => (
                  <TableRow key={entry.audit_id} hover>
                    <TableCell>
                      {new Date(entry.performed_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getCategoryIcon(entry.action_category)}
                        label={entry.action_category}
                        color={getCategoryColor(entry.action_category)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{entry.action_type}</TableCell>
                    <TableCell>{entry.action_description}</TableCell>
                    <TableCell>
                      {entry.member_name || 'N/A'}
                      {entry.member_id_number && (
                        <>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {entry.member_id_number}
                          </Typography>
                        </>
                      )}
                    </TableCell>
                    <TableCell>{entry.performed_by_name || 'System'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredEntries.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <Paper sx={{ p: 3 }}>
          {paginatedEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              {loading ? 'Loading...' : 'No audit entries found'}
            </Typography>
          ) : (
            <Box sx={{ position: 'relative' }}>
              {/* Timeline Line */}
              <Box
                sx={{
                  position: 'absolute',
                  left: '20px',
                  top: '20px',
                  bottom: '20px',
                  width: '2px',
                  bgcolor: 'divider',
                }}
              />

              {/* Timeline Items */}
              {paginatedEntries.map((entry, _index) => (
                <Box
                  key={entry.audit_id}
                  sx={{
                    position: 'relative',
                    pl: 6,
                    pb: 3,
                    '&:last-child': { pb: 0 },
                  }}
                >
                  {/* Timeline Dot */}
                  <Avatar
                    sx={{
                      position: 'absolute',
                      left: '8px',
                      top: '8px',
                      width: 28,
                      height: 28,
                      bgcolor: `${getCategoryColor(entry.action_category)}.main`,
                    }}
                  >
                    {getCategoryIcon(entry.action_category)}
                  </Avatar>

                  {/* Timeline Content */}
                  <Card elevation={2}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="div">
                          {entry.action_type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(entry.performed_at).toLocaleString()}
                        </Typography>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {entry.action_description}
                      </Typography>

                      <Divider sx={{ my: 1 }} />

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        <Chip
                          icon={getCategoryIcon(entry.action_category)}
                          label={entry.action_category}
                          size="small"
                          color={getCategoryColor(entry.action_category)}
                        />
                        {entry.member_name && (
                          <Chip
                            label={`Member: ${entry.member_name}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={`By: ${entry.performed_by_name || 'System'}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredEntries.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default AuditTrailTab;

