/**
 * Fraud Cases Tab Component
 * Displays all detected fraud cases with filtering and details
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Warning,
  Refresh,
  Search,
  Visibility,
} from '@mui/icons-material';
import { getAllFraudCases } from '../../services/renewalBulkUploadService';
import type { FraudCase } from '../../types/renewalBulkUpload';

const FraudCasesTab: React.FC = () => {
  const [fraudCases, setFraudCases] = useState<FraudCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<FraudCase | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchFraudCases();
  }, []);

  const fetchFraudCases = async () => {
    setLoading(true);
    try {
      const response = await getAllFraudCases();
      if (response.success) {
        setFraudCases(response.data.fraud_cases || []);
      }
    } catch (error) {
      console.error('Failed to fetch fraud cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (fraudCase: FraudCase) => {
    setSelectedCase(fraudCase);
    setShowDetailsDialog(true);
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (severity) {
      case 'Critical':
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: string): 'error' | 'warning' | 'info' => {
    switch (type) {
      case 'Ward Mismatch':
        return 'error';
      case 'Duplicate Renewal':
        return 'warning';
      default:
        return 'info';
    }
  };

  // Filter fraud cases
  const filteredCases = fraudCases.filter((fraudCase) => {
    const matchesType = typeFilter === 'all' || fraudCase.fraud_type === typeFilter;
    const matchesSeverity = severityFilter === 'all' || fraudCase.fraud_severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || fraudCase.case_status === statusFilter;
    const matchesSearch = 
      fraudCase.member_id_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fraudCase.member_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSeverity && matchesStatus && matchesSearch;
  });

  // Paginate cases
  const paginatedCases = filteredCases.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Fraud Cases
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and manage detected fraud cases
          </Typography>
        </Box>
        <Button
          startIcon={<Refresh />}
          onClick={fetchFraudCases}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Alert */}
      {fraudCases.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<Warning />}>
          <Typography variant="body2">
            <strong>{fraudCases.length} fraud case(s)</strong> detected. Please review and take appropriate action.
          </Typography>
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search by member ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Fraud Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Fraud Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Ward Mismatch">Ward Mismatch</MenuItem>
                <MenuItem value="Duplicate Renewal">Duplicate Renewal</MenuItem>
                <MenuItem value="Invalid Payment">Invalid Payment</MenuItem>
                <MenuItem value="Suspicious Activity">Suspicious Activity</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                label="Severity"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="Detected">Detected</MenuItem>
                <MenuItem value="Under Review">Under Review</MenuItem>
                <MenuItem value="Confirmed">Confirmed</MenuItem>
                <MenuItem value="Dismissed">Dismissed</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member ID</TableCell>
              <TableCell>Member Name</TableCell>
              <TableCell>Fraud Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Current Ward</TableCell>
              <TableCell>Attempted Ward</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Detected At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {loading ? 'Loading...' : 'No fraud cases found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCases.map((fraudCase) => (
                <TableRow key={fraudCase.fraud_case_id} hover>
                  <TableCell>{fraudCase.member_id_number}</TableCell>
                  <TableCell>{fraudCase.member_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={fraudCase.fraud_type}
                      color={getTypeColor(fraudCase.fraud_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={fraudCase.fraud_severity}
                      color={getSeverityColor(fraudCase.fraud_severity)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {fraudCase.current_ward_code}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {fraudCase.current_ward_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {fraudCase.attempted_ward_code}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {fraudCase.attempted_ward_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={fraudCase.case_status} size="small" />
                  </TableCell>
                  <TableCell>
                    {new Date(fraudCase.detected_at).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewDetails(fraudCase)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredCases.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            Fraud Case Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCase && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Member ID
                  </Typography>
                  <Typography variant="body1">{selectedCase.member_id_number}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Member Name
                  </Typography>
                  <Typography variant="body1">{selectedCase.member_name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Fraud Type
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedCase.fraud_type}
                      color={getTypeColor(selectedCase.fraud_type)}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Severity
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedCase.fraud_severity}
                      color={getSeverityColor(selectedCase.fraud_severity)}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">{selectedCase.fraud_description}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Current Ward
                  </Typography>
                  <Typography variant="body1">
                    {selectedCase.current_ward_code} - {selectedCase.current_ward_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Attempted Ward
                  </Typography>
                  <Typography variant="body1">
                    {selectedCase.attempted_ward_code} - {selectedCase.attempted_ward_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedCase.case_status} size="small" />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Detected At
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedCase.detected_at).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FraudCasesTab;

