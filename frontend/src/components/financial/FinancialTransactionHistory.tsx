import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  FilterList,
  Download,
  Refresh,
  Visibility,
  AttachMoney,
  Receipt,
  TrendingUp,
  AccountBalance,
  CreditCard,
  MoneyOff,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery } from '@tanstack/react-query';
import { financialTransactionApi } from '../../services/api';
import { format, parseISO } from 'date-fns';

interface FinancialTransactionHistoryProps {
  memberId?: string;
  showFilters?: boolean;
  showExport?: boolean;
  maxHeight?: number;
  onTransactionSelect?: (transaction: any) => void;
  title?: string;
  subtitle?: string;
}

interface TransactionFilters {
  dateFrom: Date | null;
  dateTo: Date | null;
  transactionType: string;
  status: string;
  amountMin: string;
  amountMax: string;
  searchTerm: string;
  paymentMethod: string;
}

const defaultFilters: TransactionFilters = {
  dateFrom: null,
  dateTo: null,
  transactionType: '',
  status: '',
  amountMin: '',
  amountMax: '',
  searchTerm: '',
  paymentMethod: '',
};

const FinancialTransactionHistory: React.FC<FinancialTransactionHistoryProps> = ({
  memberId,
  showFilters = true,
  showExport = true,
  maxHeight = 600,
  onTransactionSelect,
  title = 'Financial Transaction History',
  subtitle = 'Comprehensive view of all financial transactions',
}) => {
  const theme = useTheme();
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderBy, setOrderBy] = useState('transaction_date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Build query parameters (matching backend validation schema)
  const queryParams = useMemo(() => {
    const params: any = {
      offset: page * rowsPerPage,  // Convert page to offset
      limit: rowsPerPage,
      sort_by: orderBy === 'transaction_date' ? 'created_at' : orderBy,  // Map frontend field names to backend
      sort_order: order.toUpperCase(),  // Backend expects uppercase
    };

    // Member filters
    if (memberId) params.member_id = parseInt(memberId);
    if (filters.searchTerm) params.member_search = filters.searchTerm;

    // Date filters
    if (filters.dateFrom) params.date_from = format(filters.dateFrom, 'yyyy-MM-dd');
    if (filters.dateTo) params.date_to = format(filters.dateTo, 'yyyy-MM-dd');

    // Entity and status filters
    if (filters.transactionType) {
      // Map frontend transaction types to backend entity types
      if (filters.transactionType === 'application' || filters.transactionType === 'renewal') {
        params.entity_type = filters.transactionType;
      }
    }
    if (filters.status) {
      // Map status to appropriate backend field
      if (['Pending', 'Processing', 'Completed', 'Failed', 'Cancelled'].includes(filters.status)) {
        params.payment_status = filters.status;
      } else if (['Pending', 'Under Review', 'Approved', 'Rejected'].includes(filters.status)) {
        params.financial_status = filters.status;
      }
    }

    // Amount filters
    if (filters.amountMin) params.amount_min = parseFloat(filters.amountMin);
    if (filters.amountMax) params.amount_max = parseFloat(filters.amountMax);

    return params;
  }, [memberId, filters, page, rowsPerPage, orderBy, order]);

  // Fetch transactions
  const { data: transactionData, isLoading, error, refetch } = useQuery({
    queryKey: ['financial-transactions', queryParams, refreshKey],
    queryFn: () => financialTransactionApi.query(queryParams),
    select: (response) => response.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const transactions = transactionData?.transactions || [];
  const totalCount = transactionData?.total_count || 0;

  // Handle filter changes
  const handleFilterChange = useCallback((field: keyof TransactionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filters change
  }, []);

  // Clear all filters
  // Clear filters handler (currently unused but kept for future use)
  // const handleClearFilters = useCallback(() => {
  //   setFilters(defaultFilters);
  //   setPage(0);
  // }, []);

  // Handle sorting
  const handleSort = useCallback((property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  }, [orderBy, order]);

  // Handle pagination
  const handleChangePage = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Handle transaction detail view
  const handleViewTransaction = useCallback((transaction: any) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
    onTransactionSelect?.(transaction);
  }, [onTransactionSelect]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    refetch();
  }, [refetch]);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      const exportParams = {
        ...queryParams,
        format: 'csv',
        includeAll: true,
      };
      
      await financialTransactionApi.exportTransactions(exportParams);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [queryParams]);

  // Get transaction type icon
  const getTransactionTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'application': return <Receipt color="primary" />;
      case 'renewal': return <TrendingUp color="success" />;
      case 'refund': return <MoneyOff color="error" />;
      case 'adjustment': return <AccountBalance color="warning" />;
      default: return <AttachMoney color="action" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'failed': case 'rejected': return 'error';
      case 'processing': return 'info';
      default: return 'default';
    }
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'credit_card': case 'debit_card': return <CreditCard />;
      case 'bank_transfer': return <AccountBalance />;
      case 'cash': return <AttachMoney />;
      default: return <Receipt />;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh Data">
                <IconButton onClick={handleRefresh} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
              {showFilters && (
                <Tooltip title={filtersExpanded ? "Hide Filters" : "Show Filters"}>
                  <IconButton 
                    onClick={() => setFiltersExpanded(!filtersExpanded)} 
                    size="small"
                    color={filtersExpanded ? "primary" : "default"}
                  >
                    <FilterList />
                  </IconButton>
                </Tooltip>
              )}
              {showExport && (
                <Tooltip title="Export Transactions">
                  <IconButton onClick={handleExport} size="small">
                    <Download />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Filters */}
          {showFilters && (
            <Collapse in={filtersExpanded}>
              <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      label="Date From"
                      value={filters.dateFrom}
                      onChange={(date) => handleFilterChange('dateFrom', date)}
                      slotProps={{
                        textField: { size: 'small', fullWidth: true }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      label="Date To"
                      value={filters.dateTo}
                      onChange={(date) => handleFilterChange('dateTo', date)}
                      slotProps={{
                        textField: { size: 'small', fullWidth: true }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Transaction Type</InputLabel>
                      <Select
                        value={filters.transactionType}
                        onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                        label="Transaction Type"
                      >
                        <MenuItem value="">All Types</MenuItem>
                        <MenuItem value="application">Application</MenuItem>
                        <MenuItem value="renewal">Renewal</MenuItem>
                        <MenuItem value="refund">Refund</MenuItem>
                        <MenuItem value="adjustment">Adjustment</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        label="Status"
                      >
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="processing">Processing</MenuItem>
                        <MenuItem value="failed">Failed</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>
            </Collapse>
          )}

          {/* Error State */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load transaction history. Please try again.
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Transaction Table */}
          {!isLoading && !error && (
            <TableContainer sx={{ maxHeight: maxHeight }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'transaction_date'}
                        direction={orderBy === 'transaction_date' ? order : 'asc'}
                        onClick={() => handleSort('transaction_date')}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'amount'}
                        direction={orderBy === 'amount' ? order : 'asc'}
                        onClick={() => handleSort('amount')}
                      >
                        Amount
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction: any) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {transaction.created_at ? format(parseISO(transaction.created_at), 'MMM dd, yyyy') : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.created_at ? format(parseISO(transaction.created_at), 'HH:mm') : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getTransactionTypeIcon(transaction.transaction_type)}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {transaction.transaction_type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          R{typeof transaction.amount === 'number' ? transaction.amount.toFixed(2) : (parseFloat(transaction.amount) || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getPaymentMethodIcon(transaction.payment_method)}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {transaction.payment_method?.replace('_', ' ') || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.overall_status || transaction.financial_status || 'Unknown'}
                          color={getStatusColor(transaction.overall_status || transaction.financial_status) as any}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {transaction.reference_number || transaction.transaction_id || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewTransaction(transaction)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No transactions found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          {!isLoading && !error && totalCount > 0 && (
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Modal */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedTransaction && getTransactionTypeIcon(selectedTransaction.transaction_type)}
            Transaction Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Transaction ID:</Typography>
                      <Typography variant="body2">{selectedTransaction.id}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Type:</Typography>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {selectedTransaction.transaction_type}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Amount:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        R{typeof selectedTransaction.amount === 'number' ? selectedTransaction.amount.toFixed(2) : (parseFloat(selectedTransaction.amount) || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Status:</Typography>
                      <Chip
                        label={selectedTransaction.overall_status || selectedTransaction.financial_status || 'Unknown'}
                        color={getStatusColor(selectedTransaction.overall_status || selectedTransaction.financial_status) as any}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Date:</Typography>
                      <Typography variant="body2">
                        {selectedTransaction.created_at ? format(parseISO(selectedTransaction.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Payment Information */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Payment Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Method:</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getPaymentMethodIcon(selectedTransaction.payment_method)}
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {selectedTransaction.payment_method?.replace('_', ' ') || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Reference:</Typography>
                      <Typography variant="body2">
                        {selectedTransaction.reference_number || selectedTransaction.transaction_id || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Gateway:</Typography>
                      <Typography variant="body2">
                        {selectedTransaction.payment_gateway || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Gateway Ref:</Typography>
                      <Typography variant="body2">
                        {selectedTransaction.gateway_reference || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Member Information */}
              {selectedTransaction.member_info && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Member Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Name:</Typography>
                        <Typography variant="body2">
                          {selectedTransaction.member_info.first_name} {selectedTransaction.member_info.last_name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Member ID:</Typography>
                        <Typography variant="body2">
                          {selectedTransaction.member_info.member_id || selectedTransaction.member_id}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Email:</Typography>
                        <Typography variant="body2">
                          {selectedTransaction.member_info.email || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              )}

              {/* Additional Details */}
              {selectedTransaction.notes && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {selectedTransaction.notes}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default FinancialTransactionHistory;
